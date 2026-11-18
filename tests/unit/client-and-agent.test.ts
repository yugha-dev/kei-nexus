import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { StreamAdapter, KeiClient } from '../../src/core/client/index.js';
import { Agent } from '../../src/core/harness/agent.js';
import { SkillRegistry } from '../../src/core/skills/registry.js';
import { FsWriteSkill, FsReadSkill, FsListSkill, ShellRunSkill, WebFetchSkill } from '../../src/core/skills/builtins/index.js';
import { WorkspaceManager } from '../../src/core/workspace/workspace-manager.js';
import { WorkflowRunner } from '../../src/core/workflow/workflow-runner.js';
import { createFullstackAuditPipeline } from '../../src/core/workflow/pipelines/fullstack-audit.js';

describe('Client, Agent Harness & Workflow Pipeline', () => {
  const testRoot = path.resolve('./.test-agent-workspace');

  beforeEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('StreamAdapter', () => {
    it('parses SSE data stream and accumulates content and tool calls', async () => {
      const sseText = [
        'data: {"id":"1","model":"glm-5.3-flash","choices":[{"index":0,"delta":{"content":"Hello ","reasoning_content":"thinking..."},"finish_reason":null}]}',
        '',
        'data: {"id":"1","model":"glm-5.3-flash","choices":[{"index":0,"delta":{"content":"world!"},"finish_reason":null}]}',
        '',
        'data: {"id":"1","model":"glm-5.3-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"fs_read","arguments":"{\\"path\\": \\"file.txt\\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');

      const stream = Readable.from([sseText]);
      const generator = StreamAdapter.parseSSE(stream);

      let chunkCount = 0;
      let next = await generator.next();
      while (!next.done) {
        chunkCount++;
        next = await generator.next();
      }

      const accumulated = next.value;
      expect(chunkCount).toBe(3);
      expect(accumulated.content).toBe('Hello world!');
      expect(accumulated.reasoning).toBe('thinking...');
      expect(accumulated.toolCalls.length).toBe(1);
      expect(accumulated.toolCalls[0].function.name).toBe('fs_read');
      expect(accumulated.usage?.total_tokens).toBe(30);
    });
  });

  describe('FsList and ShellRun Skills', () => {
    it('lists directory contents with FsListSkill', async () => {
      const manager = new WorkspaceManager(testRoot);
      manager.init();
      manager.writeFile('scratchpad/item.txt', 'test');

      const skill = new FsListSkill();
      const res = await skill.run({ path: 'scratchpad' }, { workspaceRoot: testRoot, runId: 'r1' });
      expect(res.entries.some((e) => e.name === 'item.txt')).toBe(true);
    });

    it('executes safe commands with ShellRunSkill', async () => {
      const manager = new WorkspaceManager(testRoot);
      manager.init();

      const skill = new ShellRunSkill();
      const res = await skill.run({ command: 'echo "safety verified"' }, { workspaceRoot: testRoot, runId: 'r2' });
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('safety verified');
    });

    it('fetches sanitized web content with WebFetchSkill', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '<html><body><h1>Documentation</h1><script>evil()</script><p>Clean content</p></body></html>',
      });
      vi.stubGlobal('fetch', mockFetch);

      const skill = new WebFetchSkill();
      const res = await skill.run({ url: 'https://api.github.com/docs' }, { workspaceRoot: testRoot, runId: 'r3' });
      expect(res.status).toBe(200);
      expect(res.content).toContain('Clean content');
      expect(res.content).not.toContain('evil()');
    });
  });

  describe('KeiClient Methods', () => {
    it('lists models and manages base configuration', async () => {
      const client = new KeiClient({
        baseUrl: 'https://api.kei-inference.web.id/v1',
        apiKey: 'sk-test-key',
        defaultModel: 'glm-5.3-flash',
      });

      expect(client.getBaseUrl()).toBe('https://api.kei-inference.web.id/v1');
      expect(client.getDefaultModel()).toBe('glm-5.3-flash');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: [
            {
              id: 'glm-5.3-flash',
              object: 'model',
              owned_by: 'combo',
              capabilities: { tools: true },
              context_length: 1000000,
            },
          ],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const models = await client.listModels();
      expect(models.length).toBe(1);
      expect(models[0].id).toBe('glm-5.3-flash');
    });
  });

  describe('Agent Harness ReAct Cycle', () => {
    it('executes ReAct loop with tool call and reaches completion', async () => {
      const workspace = new WorkspaceManager(testRoot);
      workspace.init();

      const registry = new SkillRegistry();
      registry.register(new FsWriteSkill());
      registry.register(new FsReadSkill());

      const mockClient = new KeiClient({ apiKey: 'sk-mock-key' });

      // Mock chat to return tool call on turn 1, then finish on turn 2
      let callCount = 0;
      vi.spyOn(mockClient, 'chat').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'I need to write a file first.',
            reasoning: 'Planning file write',
            toolCalls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'fs_write',
                  arguments: JSON.stringify({ path: 'scratchpad/plan.txt', content: 'Step 1 complete' }),
                },
              },
            ],
            finishReason: 'tool_calls',
            usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
          };
        } else {
          return {
            content: 'I have written the plan. Task complete!',
            reasoning: 'Verification done',
            toolCalls: [],
            finishReason: 'stop',
            usage: { prompt_tokens: 150, completion_tokens: 20, total_tokens: 170 },
          };
        }
      });

      const agent = new Agent({
        client: mockClient,
        skills: registry,
        workspace,
        model: 'glm-5.3-flash',
      });

      const events: string[] = [];
      agent.on('step', (e) => events.push(e.state));

      const result = await agent.run('Write a plan into scratchpad');

      expect(callCount).toBe(2);
      expect(result.turns).toBe(2);
      expect(result.finalAnswer).toContain('Task complete!');
      expect(workspace.exists('scratchpad/plan.txt')).toBe(true);
      expect(events).toContain('THINKING');
      expect(events).toContain('CALLING_TOOL');
      expect(events).toContain('EXECUTING_TOOL');
      expect(events).toContain('COMPLETED');
    });
  });

  describe('WorkflowRunner & Fullstack Audit Pipeline', () => {
    it('runs workflow pipeline steps and aggregates results', async () => {
      const workspace = new WorkspaceManager(testRoot);
      workspace.init();

      const mockClient = new KeiClient({ apiKey: 'sk-mock-key' });
      vi.spyOn(mockClient, 'chat').mockResolvedValue({
        content: 'Verification successful.',
        reasoning: 'Audit reasoning',
        toolCalls: [],
        finishReason: 'stop',
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      });

      const registry = new SkillRegistry();
      registry.register(new FsWriteSkill());
      registry.register(new FsReadSkill());

      const agent = new Agent({ client: mockClient, skills: registry, workspace });
      const runner = new WorkflowRunner(workspace);
      const pipeline = createFullstackAuditPipeline(agent);

      const summary = await runner.runPipeline('test-audit', pipeline);

      expect(summary.success).toBe(true);
      expect(summary.stepResults.length).toBe(4);
      expect(workspace.exists('artifacts/audit-report.html')).toBe(true);
      expect(workspace.exists('artifacts/summary.md')).toBe(true);
    });
  });
});
