import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { AgentTeam } from '../../src/core/harness/team.js';
import { createPresentationPipeline } from '../../src/core/workflow/pipelines/presentation-gen.js';
import { SkillRegistry } from '../../src/core/skills/registry.js';
import { WorkspaceManager } from '../../src/core/workspace/workspace-manager.js';
import { KeiClient } from '../../src/core/client/kei-client.js';
import { Agent } from '../../src/core/harness/agent.js';
import { WorkflowRunner } from '../../src/core/workflow/workflow-runner.js';

describe('AgentTeam & PresentationPipeline', () => {
  const testWorkspaceDir = path.resolve('.workspace-test-team');
  let workspace: WorkspaceManager;
  let skills: SkillRegistry;

  beforeEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    workspace = new WorkspaceManager(testWorkspaceDir);
    workspace.init();
    skills = new SkillRegistry();
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  it('initializes AgentTeam and executes multi-agent choreography', async () => {
    const mockClient = {
      getDefaultModel: () => 'glm-5.3-flash',
      chat: vi.fn().mockImplementation(async () => {
        return {
          content: 'Mocked thought and result.',
          toolCalls: [],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
        };
      }),
    } as unknown as KeiClient;

    const team = new AgentTeam({
      client: mockClient,
      skills,
      workspace,
      model: 'glm-5.3-flash',
    });

    const events: Array<{ agentRole: string; phase: string }> = [];
    team.on('team_step', (e) => events.push({ agentRole: e.agentRole, phase: e.phase }));

    const result = await team.execute('Analyze system security');

    expect(result.plan).toBeDefined();
    expect(result.executionOutput).toBeDefined();
    expect(result.critique).toBeDefined();
    expect(result.finalDeliverable).toBeDefined();
    expect(result.totalTokens).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeGreaterThanOrEqual(4);
  });

  it('runs presentation pipeline end-to-end and outputs pitch-deck.html', async () => {
    const mockClient = {
      getDefaultModel: () => 'glm-5.3-flash',
      chat: vi.fn().mockImplementation(async () => {
        return {
          content: 'Synthesized outline and key points.',
          toolCalls: [],
          usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
        };
      }),
    } as unknown as KeiClient;

    const agent = new Agent({ client: mockClient, skills, workspace });
    const runner = new WorkflowRunner(workspace);
    const pipeline = createPresentationPipeline(agent, 'Kei-Nexus Pitch');

    const summary = await runner.runPipeline('slides', pipeline);

    expect(summary.success).toBe(true);
    expect(summary.stepResults.length).toBe(2);

    const deckPath = path.join(testWorkspaceDir, 'artifacts', 'pitch-deck.html');
    expect(fs.existsSync(deckPath)).toBe(true);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    expect(deckContent).toContain('Kei-Nexus Pitch');
    expect(deckContent).toContain('<!DOCTYPE html>');
  });
});
