import path from 'node:path';
import fs from 'node:fs';

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(`[SECURITY VIOLATION] ${message}`);
    this.name = 'SecurityViolationError';
  }
}

/**
 * PathGuard ensures all file and directory accesses are strictly jailed
 * within the designated workspace boundary. Prevents directory traversal,
 * null byte injection, and symlink escape attacks.
 */
export class PathGuard {
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  /**
   * Validates and resolves a relative or absolute path against the workspace root.
   * Throws SecurityViolationError if the path escapes the jail.
   */
  public resolveSafePath(targetPath: string): string {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new SecurityViolationError('Path must be a non-empty string');
    }

    // Reject null byte injection
    if (targetPath.includes('\0')) {
      throw new SecurityViolationError('Null byte detected in path');
    }

    // Normalize and resolve path
    const resolvedPath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.workspaceRoot, targetPath);

    // Enforce workspace jail containment
    const relative = path.relative(this.workspaceRoot, resolvedPath);
    const isEscaping = relative.startsWith('..') || path.isAbsolute(relative);

    if (isEscaping) {
      throw new SecurityViolationError(
        `Path traversal attempt detected: "${targetPath}" escapes workspace root "${this.workspaceRoot}"`
      );
    }

    // Symlink escape check: verify realpath of path or its nearest existing ancestor
    let checkTarget = resolvedPath;
    while (!fs.existsSync(checkTarget) && checkTarget !== this.workspaceRoot && checkTarget !== path.dirname(checkTarget)) {
      checkTarget = path.dirname(checkTarget);
    }

    if (fs.existsSync(checkTarget)) {
      try {
        const real = fs.realpathSync(checkTarget);
        const realRelative = path.relative(this.workspaceRoot, real);
        if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
          throw new SecurityViolationError(
            `Symlink escape detected: realpath "${real}" escapes workspace root "${this.workspaceRoot}"`
          );
        }
      } catch (err: unknown) {
        if (err instanceof SecurityViolationError) throw err;
      }
    }

    return resolvedPath;
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
