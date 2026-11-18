import { describe, it, expect } from 'vitest';
import { LoopGuard } from '../../src/core/harness/loop-guard.js';
import { TokenBudget } from '../../src/core/harness/token-budget.js';

describe('Harness State & Safeguards', () => {
  describe('LoopGuard', () => {
    it('halts execution when turn limit is exceeded', () => {
      const guard = new LoopGuard(5);
      expect(() => guard.checkTurnLimit(4)).not.toThrow();
      expect(() => guard.checkTurnLimit(5)).toThrow('maximum agent turns limit reached');
    });

    it('detects 3 identical consecutive tool calls and halts', () => {
      const guard = new LoopGuard(10);
      guard.recordToolCall('fs_read', { path: 'file.txt' });
      guard.recordToolCall('fs_read', { path: 'file.txt' });
      expect(() => guard.recordToolCall('fs_read', { path: 'file.txt' })).toThrow('identical tool call');
    });

    it('does not trigger on alternating tool calls', () => {
      const guard = new LoopGuard(10);
      guard.recordToolCall('fs_read', { path: 'file.txt' });
      guard.recordToolCall('fs_write', { path: 'file.txt' });
      guard.recordToolCall('fs_read', { path: 'file.txt' });
      expect(() => guard.recordToolCall('fs_write', { path: 'file.txt' })).not.toThrow();
    });
  });

  describe('TokenBudget', () => {
    it('accurately accumulates tokens and calculates stats', () => {
      const budget = new TokenBudget(100000);
      budget.recordUsage({
        prompt_tokens: 1500,
        completion_tokens: 500,
        reasoning_tokens: 200,
      });

      const stats = budget.getStats();
      expect(stats.promptTokens).toBe(1500);
      expect(stats.completionTokens).toBe(500);
      expect(stats.reasoningTokens).toBe(200);
      expect(stats.totalTokens).toBe(2000);
      expect(stats.estimatedCostUsd).toBeGreaterThan(0);
      expect(budget.isNearBudget()).toBe(false);
    });
  });
});
