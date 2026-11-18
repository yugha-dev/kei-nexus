import path from 'node:path';
import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { MemoryStore } from '../../workspace/memory-store.js';

export const MemoryKvSchema = z.object({
  action: z.enum(['get', 'set', 'delete', 'search', 'list']).describe('Memory operation to perform'),
  key: z.string().optional().describe('Key to query, set, or delete'),
  value: z.any().optional().describe('Value to store when action is set'),
  tags: z.array(z.string()).optional().describe('Tags to associate with stored key, or tag to search'),
});

export class MemoryKvSkill extends BaseSkill<typeof MemoryKvSchema, unknown> {
  public readonly metadata = {
    name: 'memory_kv',
    description: 'Persistent memory store across turns and sessions. Allows agent to recall past facts, configurations, and decisions.',
    permission: SkillPermission.WORKSPACE_WRITE,
    category: 'memory' as const,
  };

  public readonly schema = MemoryKvSchema;

  public async run(args: z.infer<typeof MemoryKvSchema>, context: SkillExecutionContext) {
    const memoryDir = path.join(context.workspaceRoot, 'memory');
    const store = new MemoryStore(memoryDir);

    switch (args.action) {
      case 'get': {
        if (!args.key) throw new Error('Key is required for memory get action');
        const val = store.get(args.key);
        return { key: args.key, value: val ?? null, found: val !== undefined };
      }
      case 'set': {
        if (!args.key) throw new Error('Key is required for memory set action');
        store.set(args.key, args.value, args.tags || []);
        return { key: args.key, status: 'saved' };
      }
      case 'delete': {
        if (!args.key) throw new Error('Key is required for memory delete action');
        const deleted = store.delete(args.key);
        return { key: args.key, deleted };
      }
      case 'search': {
        const tag = args.tags?.[0] || args.key || '';
        const results = store.searchByTag(tag);
        return { tag, count: results.length, matches: results };
      }
      case 'list': {
        const all = store.listAll();
        return { count: all.length, entries: all };
      }
      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  }
}
