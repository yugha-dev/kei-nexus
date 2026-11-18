import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SkillRegistry,
  FsReadSkill,
  FsWriteSkill,
  FsListSkill,
  MemoryKvSkill,
  ArtifactPublishSkill,
  SkillPermission,
} from '../../src/core/skills/index.js';
import { WorkspaceManager } from '../../src/core/workspace/workspace-manager.js';

describe('Modular Skills Engine', () => {
  const testRoot = path.resolve('./.test-skills-workspace');

  beforeEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('registers skills and exports valid tool definitions', () => {
    const registry = new SkillRegistry();
    const readSkill = new FsReadSkill();
    registry.register(readSkill);

    expect(registry.has('fs_read')).toBe(true);
    expect(() => registry.register(readSkill)).toThrow();

    const toolDefs = registry.getToolDefinitions();
    expect(toolDefs.length).toBe(1);
    expect(toolDefs[0].function.name).toBe('fs_read');
    expect(toolDefs[0].function.parameters.type).toBe('object');
  });

  it('filters tool definitions by permission', () => {
    const registry = new SkillRegistry();
    registry.register(new FsReadSkill());
    registry.register(new FsWriteSkill());

    const readOnly = registry.getToolDefinitions([SkillPermission.READ_ONLY]);
    expect(readOnly.length).toBe(1);
    expect(readOnly[0].function.name).toBe('fs_read');
  });

  it('executes fs_write and fs_read skills safely', async () => {
    const manager = new WorkspaceManager(testRoot);
    manager.init();

    const registry = new SkillRegistry();
    registry.register(new FsWriteSkill());
    registry.register(new FsReadSkill());

    const context = {
      workspaceRoot: testRoot,
      runId: 'test-run-1',
    };

    // Execute fs_write
    await registry.executeTool(
      'fs_write',
      JSON.stringify({ path: 'scratchpad/output.txt', content: 'Hello Skill Engine' }),
      context
    );

    expect(manager.exists('scratchpad/output.txt')).toBe(true);

    // Execute fs_read
    const readResult = (await registry.executeTool(
      'fs_read',
      JSON.stringify({ path: 'scratchpad/output.txt' }),
      context
    )) as { content: string };

    expect(readResult.content).toContain('Hello Skill Engine');
    expect(readResult.content).toContain('<untrusted_content');
  });

  it('executes memory_kv skill', async () => {
    const manager = new WorkspaceManager(testRoot);
    manager.init();

    const registry = new SkillRegistry();
    registry.register(new MemoryKvSkill());

    const context = { workspaceRoot: testRoot, runId: 'test-run-2' };

    await registry.executeTool(
      'memory_kv',
      { action: 'set', key: 'agent_role', value: 'Auditor', tags: ['role'] },
      context
    );

    const getResult = (await registry.executeTool(
      'memory_kv',
      { action: 'get', key: 'agent_role' },
      context
    )) as { value: string; found: boolean };

    expect(getResult.found).toBe(true);
    expect(getResult.value).toBe('Auditor');
  });

  it('publishes deliverables and updates manifest via artifact_publish', async () => {
    const manager = new WorkspaceManager(testRoot);
    manager.init();

    const registry = new SkillRegistry();
    registry.register(new ArtifactPublishSkill());

    const context = { workspaceRoot: testRoot, runId: 'test-run-3' };

    await registry.executeTool(
      'artifact_publish',
      {
        filename: 'report.html',
        title: 'Security Report',
        type: 'html',
        content: '<h1>Report</h1>',
      },
      context
    );

    const artifactFile = path.join(testRoot, 'artifacts', 'report.html');
    const manifestFile = path.join(testRoot, 'artifacts', 'manifest.json');

    expect(fs.existsSync(artifactFile)).toBe(true);
    expect(fs.existsSync(manifestFile)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    expect(manifest[0].filename).toBe('report.html');
    expect(manifest[0].title).toBe('Security Report');
  });
});
