import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { PathGuard } from '../../security/path-guard.js';

export const FsWriteSchema = z.object({
  path: z.string().describe('Relative path inside workspace (e.g. scratchpad/plan.md or artifacts/summary.json)'),
  content: z.string().describe('Text or data content to write into the file'),
  append: z.boolean().optional().describe('Whether to append to the file instead of overwriting'),
});

export class FsWriteSkill extends BaseSkill<typeof FsWriteSchema, { path: string; bytesWritten: number }> {
  public readonly metadata = {
    name: 'fs_write',
    description: 'Safely creates or updates a file inside the agent workspace chamber.',
    permission: SkillPermission.WORKSPACE_WRITE,
    category: 'filesystem' as const,
  };

  public readonly schema = FsWriteSchema;

  public async run(args: z.infer<typeof FsWriteSchema>, context: SkillExecutionContext) {
    const pathGuard = new PathGuard(context.workspaceRoot);
    const safePath = pathGuard.resolveSafePath(args.path);

    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (args.append && fs.existsSync(safePath)) {
      fs.appendFileSync(safePath, args.content, 'utf-8');
    } else {
      fs.writeFileSync(safePath, args.content, 'utf-8');
    }

    const writtenBytes = Buffer.byteLength(args.content, 'utf-8');
    return {
      path: args.path,
      bytesWritten: writtenBytes,
    };
  }
}
