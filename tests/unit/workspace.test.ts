import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { WorkspaceManager, MemoryStore, AuditLogger } from '../../src/core/workspace/index.js';

describe('Workspace Architecture & Chambers', () => {
  const testRoot = path.resolve('./.test-workspace');

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

  describe('WorkspaceManager', () => {
    it('initializes all four chambers with .gitkeep', () => {
      const manager = new WorkspaceManager(testRoot);
      manager.init();

      const chambers = manager.getChambers();
      expect(fs.existsSync(chambers.scratchpad)).toBe(true);
      expect(fs.existsSync(chambers.memory)).toBe(true);
      expect(fs.existsSync(chambers.artifacts)).toBe(true);
      expect(fs.existsSync(chambers.audit)).toBe(true);
      expect(fs.existsSync(path.join(chambers.scratchpad, '.gitkeep'))).toBe(true);
    });

    it('safely writes, checks existence, reads, and lists files', () => {
      const manager = new WorkspaceManager(testRoot);
      manager.init();

      manager.writeFile('scratchpad/note.md', '# Note content');
      expect(manager.exists('scratchpad/note.md')).toBe(true);
      expect(manager.readFile('scratchpad/note.md')).toBe('# Note content');

      const files = manager.listFiles('scratchpad');
      expect(files).toContain('note.md');
      expect(files).toContain('.gitkeep');
    });

    it('cleans scratchpad while preserving .gitkeep', () => {
      const manager = new WorkspaceManager(testRoot);
      manager.init();

      manager.writeFile('scratchpad/temp.txt', 'temporary data');
      manager.cleanScratchpad();

      expect(manager.exists('scratchpad/temp.txt')).toBe(false);
      expect(manager.exists('scratchpad/.gitkeep')).toBe(true);
    });
  });

  describe('MemoryStore', () => {
    it('persists key-value data with tags and retrieves accurately', () => {
      const memoryDir = path.join(testRoot, 'memory');
      const store = new MemoryStore(memoryDir);

      store.set('project_goal', { target: 'Build Agent Ecosystem' }, ['architecture', 'goal']);
      expect(store.has('project_goal')).toBe(true);

      const val = store.get<{ target: string }>('project_goal');
      expect(val?.target).toBe('Build Agent Ecosystem');

      const matches = store.searchByTag('architecture');
      expect(matches.length).toBe(1);
      expect(matches[0].key).toBe('project_goal');
    });

    it('re-loads existing store from disk', () => {
      const memoryDir = path.join(testRoot, 'memory');
      const store1 = new MemoryStore(memoryDir);
      store1.set('persisted_key', 'persisted_value');

      const store2 = new MemoryStore(memoryDir);
      expect(store2.get('persisted_key')).toBe('persisted_value');
    });
  });

  describe('AuditLogger', () => {
    it('records and redacts NDJSON flight-recorder events', () => {
      const auditDir = path.join(testRoot, 'audit');
      const logger = new AuditLogger(auditDir, 'run-test-123');

      logger.log('prompt', 0, { text: 'my api key is sk-1234567890abcdef1234567890' });
      logger.log('thought', 1, { reasoning: 'analyzing problem' });

      const records = logger.getRecords();
      expect(records.length).toBe(2);
      expect(records[0].type).toBe('prompt');
      expect(JSON.stringify(records[0].data)).toContain('[REDACTED_API_KEY]');
      expect(records[1].type).toBe('thought');
    });
  });
});
