import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { PathGuard } from '../../security/path-guard.js';

export const ArtifactPublishSchema = z.object({
  filename: z.string().describe('Target artifact filename (e.g. audit-report.html, architecture.md, summary.json)'),
  title: z.string().describe('Human-readable artifact title'),
  type: z.enum(['html', 'markdown', 'json', 'text', 'svg']).describe('Artifact format type'),
  content: z.string().describe('Full artifact content'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata tags or metrics'),
});

export class ArtifactPublishSkill extends BaseSkill<
  typeof ArtifactPublishSchema,
  { filename: string; relativePath: string; absolutePath: string; size: number }
> {
  public readonly metadata = {
    name: 'artifact_publish',
    description: 'Publishes a verified deliverable artifact (HTML dashboard, Markdown report, JSON dataset) into the workspace artifacts chamber.',
    permission: SkillPermission.WORKSPACE_WRITE,
    category: 'artifact' as const,
  };

  public readonly schema = ArtifactPublishSchema;

  public async run(args: z.infer<typeof ArtifactPublishSchema>, context: SkillExecutionContext) {
    const pathGuard = new PathGuard(context.workspaceRoot);
    const sanitizedFilename = path.basename(args.filename);
    const relativeArtifactPath = path.join('artifacts', sanitizedFilename);
    const safePath = pathGuard.resolveSafePath(relativeArtifactPath);

    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safePath, args.content, 'utf-8');

    // Register in artifacts manifest
    const manifestPath = path.join(context.workspaceRoot, 'artifacts', 'manifest.json');
    let manifest: Array<Record<string, unknown>> = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        manifest = [];
      }
    }

    manifest = manifest.filter((item) => item.filename !== sanitizedFilename);
    manifest.push({
      filename: sanitizedFilename,
      title: args.title,
      type: args.type,
      publishedAt: new Date().toISOString(),
      runId: context.runId,
      size: Buffer.byteLength(args.content, 'utf-8'),
      metadata: args.metadata || {},
    });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return {
      filename: sanitizedFilename,
      relativePath: relativeArtifactPath,
      absolutePath: safePath,
      size: Buffer.byteLength(args.content, 'utf-8'),
    };
  }
}
