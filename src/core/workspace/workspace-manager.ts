import fs from 'node:fs';
import path from 'node:path';
import { PathGuard } from '../security/path-guard.js';

export interface WorkspaceChambers {
  root: string;
  scratchpad: string;
  memory: string;
  artifacts: string;
  audit: string;
}

/**
 * WorkspaceManager controls the lifecycle, initialization, and safe access
 * to the standardized four-chamber workspace directory.
 */
export class WorkspaceManager {
  private readonly rootDir: string;
  private readonly pathGuard: PathGuard;
  private readonly chambers: WorkspaceChambers;

  constructor(workspaceRoot = './.workspace') {
    this.rootDir = path.resolve(workspaceRoot);
    this.pathGuard = new PathGuard(this.rootDir);

    this.chambers = {
      root: this.rootDir,
      scratchpad: path.join(this.rootDir, 'scratchpad'),
      memory: path.join(this.rootDir, 'memory'),
      artifacts: path.join(this.rootDir, 'artifacts'),
      audit: path.join(this.rootDir, 'audit'),
    };
  }

  /**
   * Initializes all four chambers, ensuring directories exist with .gitkeep
   */
  public init(): void {
    for (const [chamberName, dirPath] of Object.entries(this.chambers)) {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      if (chamberName !== 'root') {
        const gitkeep = path.join(dirPath, '.gitkeep');
        if (!fs.existsSync(gitkeep)) {
          fs.writeFileSync(gitkeep, '', 'utf-8');
        }
      }
    }
  }

  public getChambers(): WorkspaceChambers {
    return { ...this.chambers };
  }

  public getPathGuard(): PathGuard {
    return this.pathGuard;
  }

  /**
   * Safely writes a file within the workspace.
   */
  public writeFile(relativeOrAbsolutePath: string, content: string): string {
    const safePath = this.pathGuard.resolveSafePath(relativeOrAbsolutePath);
    const parentDir = path.dirname(safePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(safePath, content, 'utf-8');
    return safePath;
  }

  /**
   * Safely reads a file within the workspace.
   */
  public readFile(relativeOrAbsolutePath: string): string {
    const safePath = this.pathGuard.resolveSafePath(relativeOrAbsolutePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${relativeOrAbsolutePath}`);
    }
    return fs.readFileSync(safePath, 'utf-8');
  }

  /**
   * Safely checks if a file or directory exists.
   */
  public exists(relativeOrAbsolutePath: string): boolean {
    try {
      const safePath = this.pathGuard.resolveSafePath(relativeOrAbsolutePath);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }

  /**
   * Safely lists files in a directory within the workspace.
   */
  public listFiles(subDir = ''): string[] {
    const targetDir = subDir ? this.pathGuard.resolveSafePath(subDir) : this.rootDir;
    if (!fs.existsSync(targetDir)) return [];
    return fs.readdirSync(targetDir);
  }

  /**
   * Clean ephemeral files in scratchpad.
   */
  public cleanScratchpad(): void {
    const scratch = this.chambers.scratchpad;
    if (fs.existsSync(scratch)) {
      const entries = fs.readdirSync(scratch);
      for (const entry of entries) {
        if (entry === '.gitkeep') continue;
        const entryPath = path.join(scratch, entry);
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  }
}
