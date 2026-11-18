import { SecurityViolationError } from './path-guard.js';

/**
 * CommandGuard validates shell execution commands against an allowlist and
 * blocks hazardous shell constructs, piping into interpreters, fork bombs,
 * destructive deletion, and credential harvesting tools.
 */
export class CommandGuard {
  // Allowed executable binaries/commands
  private static readonly ALLOWED_COMMANDS = new Set([
    'node',
    'npm',
    'pnpm',
    'git',
    'ls',
    'pwd',
    'echo',
    'cat',
    'grep',
    'find',
    'head',
    'tail',
    'wc',
    'mkdir',
    'cp',
    'mv',
    'vitest',
    'tsc',
    'prettier',
    'eslint',
  ]);

  // Forbidden patterns that cause instant rejection
  private static readonly DANGEROUS_PATTERNS = [
    /curl\s+.*\|\s*(sh|bash|zsh|python|perl)/i,     // pipe to shell
    /wget\s+.*\|\s*(sh|bash|zsh|python|perl)/i,
    /\b(rm\s+-rf\s+(\/|~|\$HOME|\.\.))/i,           // root or home wiping
    /\b(mkfs|dd\s+if=|fdisk|format)\b/i,            // disk destruction
    /\b(sudo|su|chmod\s+777|chown)\b/i,             // privilege escalation
    /:(){ :\|:& };:/,                               // fork bomb
    /\b(nc|netcat|ncat|socat)\s+-e\b/i,             // reverse shell
    /\b(nmap|masscan|hydra|sqlmap)\b/i,             // scanning/cracking tools
    />\s*\/dev\/(sda|hda|nvme|null)/i,              // raw disk overwriting
    /\b(\/etc\/shadow|\/etc\/passwd|\.ssh\/id_)/i,  // credential access
  ];

  /**
   * Validates a command line string. Throws SecurityViolationError if unsafe.
   */
  public static validate(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new SecurityViolationError('Command must be a non-empty string');
    }

    const trimmed = command.trim();

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new SecurityViolationError(`Forbidden dangerous command pattern detected: ${pattern}`);
      }
    }

    // Disallow shell chaining operators, subshells, and I/O redirection
    if (/[;&|`$><\n\r]/.test(trimmed)) {
      throw new SecurityViolationError(
        'Shell chaining, backgrounding, subshells, and redirection operators are strictly disallowed'
      );
    }

    // Extract the primary binary name
    // e.g. "git status" -> "git", "npm test" -> "npm"
    const firstWord = trimmed.split(/\s+/)[0]?.replace(/^["']|["']$/g, '');
    if (!firstWord) {
      throw new SecurityViolationError('Could not determine primary command');
    }

    // Check if the command starts with an allowed binary
    const baseCommand = firstWord.split('/').pop() || '';
    if (!this.ALLOWED_COMMANDS.has(baseCommand)) {
      throw new SecurityViolationError(
        `Command "${baseCommand}" is not in the execution allowlist. Allowed: ${Array.from(this.ALLOWED_COMMANDS).join(', ')}`
      );
    }

    // Prevent node inline script evaluation
    if (baseCommand === 'node' && /(?:^|\s)(?:-e|--eval|-p|--print)(?:\s|=|$)/.test(trimmed)) {
      throw new SecurityViolationError('Inline code evaluation via node -e/--eval is strictly disallowed');
    }
  }

  /**
   * Sanitizes child process environment variables, stripping credentials.
   */
  public static sanitizeEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const cleanEnv: NodeJS.ProcessEnv = { ...env };
    const sensitiveKeys = [
      'KEI_API_KEY',
      'OPENAI_API_KEY',
      'GITHUB_TOKEN',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_ACCESS_KEY_ID',
      'SSH_AUTH_SOCK',
      'PRIVATE_KEY',
      'PASSWORD',
      'SECRET',
    ];

    for (const key of Object.keys(cleanEnv)) {
      if (sensitiveKeys.some((s) => key.toUpperCase().includes(s))) {
        delete cleanEnv[key];
      }
    }

    return cleanEnv;
  }
}
