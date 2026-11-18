import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { PathGuard } from '../../security/path-guard.js';

export const FsListSchema = z.object({
  path: z.string().optional().describe('Relative directory path inside workspace (default: workspace root)'),
});

export class FsListSkill extends BaseSkill<typeof FsListSchema, { path: string; entries: Array<{ name: string; isDirectory: boolean; size: number }> }> {
  public readonly metadata = {
    name: 'fs_list',
    description: 'Lists files and folders inside a workspace directory.',
    permission: SkillPermission.READ_ONLY,
    category: 'filesystem' as const,
  };

  public readonly schema = FsListSchema;

  public async run(args: z.infer<typeof FsListSchema>, context: SkillExecutionContext) {
    const pathGuard = new PathGuard(context.workspaceRoot);
    const safePath = pathGuard.resolveSafePath(args.path || '.');

    if (!fs.existsSync(safePath)) {
      throw new Error(`Directory not found: ${args.path || '.'}`);
    }

    const rawEntries = fs.readdirSync(safePath);
    const entries = rawEntries.map((name) => {
      const full = path.join(safePath, name);
      try {
        const stat = fs.statSync(full);
        return {
          name,
          isDirectory: stat.isDirectory(),
          size: stat.size,
        };
      } catch {
        return { name, isDirectory: false, size: 0 };
      }
    });

    return {
      path: args.path || '.',
      entries,
    };
  }
}
