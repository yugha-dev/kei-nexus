import fs from 'node:fs';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { PathGuard } from '../../security/path-guard.js';
import { PromptShield } from '../../security/prompt-shield.js';

export const FsReadSchema = z.object({
  path: z.string().describe('Relative path to the file inside workspace to read'),
  maxLines: z.number().optional().describe('Maximum lines to read from the top (default: 200)'),
});

export class FsReadSkill extends BaseSkill<typeof FsReadSchema, { path: string; content: string; lines: number }> {
  public readonly metadata = {
    name: 'fs_read',
    description: 'Safely reads file contents from within the workspace. Input is sandboxed and boundary-isolated.',
    permission: SkillPermission.READ_ONLY,
    category: 'filesystem' as const,
  };

  public readonly schema = FsReadSchema;

  public async run(args: z.infer<typeof FsReadSchema>, context: SkillExecutionContext) {
    const pathGuard = new PathGuard(context.workspaceRoot);
    const safePath = pathGuard.resolveSafePath(args.path);

    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${args.path}. Use fs_list instead.`);
    }

    const raw = fs.readFileSync(safePath, 'utf-8');
    const allLines = raw.split('\n');
    const limit = args.maxLines || 200;
    const truncated = allLines.slice(0, limit).join('\n');
    const isolated = PromptShield.isolate(truncated, args.path);

    return {
      path: args.path,
      content: isolated,
      lines: Math.min(allLines.length, limit),
    };
  }
}
