import { exec } from 'node:child_process';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { CommandGuard } from '../../security/command-guard.js';
import { SecretRedactor } from '../../security/secret-redactor.js';

export const ShellRunSchema = z.object({
  command: z.string().describe('The safe shell command to run (e.g. "ls -la", "git status", "npm test")'),
  timeoutMs: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 60000)'),
});

export class ShellRunSkill extends BaseSkill<
  typeof ShellRunSchema,
  { command: string; exitCode: number; stdout: string; stderr: string; executionTimeMs: number }
> {
  public readonly metadata = {
    name: 'shell_run',
    description: 'Executes an allowed shell command inside the workspace with strict safety containment and secret redaction.',
    permission: SkillPermission.EXECUTION,
    category: 'execution' as const,
  };

  public readonly schema = ShellRunSchema;

  public async run(args: z.infer<typeof ShellRunSchema>, context: SkillExecutionContext) {
    // 1. Validate command against AST/allowlist and dangerous patterns
    CommandGuard.validate(args.command);

    const timeout = Math.min(args.timeoutMs || 30000, 60000);
    const sanitizedEnv = CommandGuard.sanitizeEnvironment(process.env);

    const startTime = Date.now();

    return new Promise<{ command: string; exitCode: number; stdout: string; stderr: string; executionTimeMs: number }>((resolve, reject) => {
      exec(
        args.command,
        {
          cwd: context.workspaceRoot,
          env: sanitizedEnv,
          timeout,
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer cap
        },
        (error, stdout, stderr) => {
          const executionTimeMs = Date.now() - startTime;
          const exitCode = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;

          // Limit output length to prevent context explosion (max 10,000 characters)
          const trimmedStdout = stdout.length > 10000 ? stdout.slice(0, 10000) + '\n... [TRUNCATED]' : stdout;
          const trimmedStderr = stderr.length > 5000 ? stderr.slice(0, 5000) + '\n... [TRUNCATED]' : stderr;

          // Redact any leaked tokens from output
          const cleanStdout = SecretRedactor.redact(trimmedStdout);
          const cleanStderr = SecretRedactor.redact(trimmedStderr);

          resolve({
            command: args.command,
            exitCode,
            stdout: cleanStdout,
            stderr: cleanStderr,
            executionTimeMs,
          });
        }
      );
    });
  }
}
