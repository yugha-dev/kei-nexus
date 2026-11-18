import { EventEmitter } from 'node:events';
import { Agent } from './agent.js';
import { KeiClient } from '../client/kei-client.js';
import { SkillRegistry } from '../skills/registry.js';
import { WorkspaceManager } from '../workspace/workspace-manager.js';
import { AuditLogger } from '../workspace/audit-logger.js';
import { TokenBudget } from './token-budget.js';

export interface AgentTeamConfig {
  client: KeiClient;
  skills: SkillRegistry;
  workspace: WorkspaceManager;
}

export interface TeamStepEvent {
  agentRole: 'Architect' | 'Specialist' | 'SecurityCritic' | 'Synthesizer';
  phase: string;
  message: string;
  data?: unknown;
}

export interface TeamRunResult {
  runId: string;
  goal: string;
  plan: string;
  executionOutput: string;
  critique: string;
  finalDeliverable: string;
  totalTokens: number;
}

/**
 * AgentTeam coordinates a multi-agent swarm:
 * 1. Architect: Drafts step-by-step strategy
 * 2. Specialist: Executes skills and solves the task
 * 3. SecurityCritic: Adversarially critiques output for safety, completeness, and edge cases
 * 4. Synthesizer: Finalizes the verified artifact
 */
export class AgentTeam extends EventEmitter {
  private readonly client: KeiClient;
  private readonly skills: SkillRegistry;
  private readonly workspace: WorkspaceManager;
  private readonly tokenBudget: TokenBudget;

  constructor(config: AgentTeamConfig) {
    super();
    this.client = config.client;
    this.skills = config.skills;
    this.workspace = config.workspace;
    this.tokenBudget = new TokenBudget();
  }

  public async execute(goal: string): Promise<TeamRunResult> {
    const auditLogger = new AuditLogger(this.workspace.getChambers().audit);
    const runId = auditLogger.getRunId();
    this.workspace.init();

    // 1. ARCHITECT AGENT
    this.emitEvent('Architect', 'Planning', `Architect analyzing goal: "${goal.slice(0, 50)}..."`);
    const architect = new Agent({
      client: this.client,
      skills: this.skills,
      workspace: this.workspace,
      systemPrompt: `You are the Lead Architect Agent in the Kei-Nexus Swarm.
Your role: Given a high-level goal, break it down into an optimal 3-stage tactical execution plan.
Save your tactical plan into scratchpad/architect_plan.md using fs_write and summarize it concisely.`,
    });

    const architectResult = await architect.run(`Goal: ${goal}`);
    this.tokenBudget.recordUsage(architectResult.tokens);
    auditLogger.log('thought', 1, { agent: 'Architect', plan: architectResult.finalAnswer });

    // 2. SPECIALIST AGENT
    this.emitEvent('Specialist', 'Execution', 'Specialist executing tactical plan with tools');
    const specialist = new Agent({
      client: this.client,
      skills: this.skills,
      workspace: this.workspace,
      systemPrompt: `You are the Specialist Agent in the Kei-Nexus Swarm.
Your role: Implement and execute the Architect's plan rigorously using your tools (fs_read, fs_write, memory_kv, web_fetch, artifact_publish).
Produce detailed intermediate outputs and record facts in memory.`,
    });

    const specialistResult = await specialist.run(
      `Implement this tactical plan for goal "${goal}":\n${architectResult.finalAnswer}`
    );
    this.tokenBudget.recordUsage(specialistResult.tokens);
    auditLogger.log('thought', 2, { agent: 'Specialist', output: specialistResult.finalAnswer });

    // 3. SECURITY CRITIC AGENT (Adversarial Verification)
    this.emitEvent('SecurityCritic', 'Verification', 'SecurityCritic reviewing output adversarially');
    const critic = new Agent({
      client: this.client,
      skills: this.skills,
      workspace: this.workspace,
      systemPrompt: `You are the Adversarial Security & Quality Critic in the Kei-Nexus Swarm.
Your role: Scrutinize the Specialist's output. Identify any missing edge cases, security hazards, unverified claims, or inaccuracies.
Provide a sharp, constructive 3-point critique.`,
    });

    const criticResult = await critic.run(
      `Review this work for goal "${goal}":\n${specialistResult.finalAnswer}\nIdentify any flaws or improvements.`
    );
    this.tokenBudget.recordUsage(criticResult.tokens);
    auditLogger.log('thought', 3, { agent: 'SecurityCritic', critique: criticResult.finalAnswer });

    // 4. SYNTHESIZER AGENT
    this.emitEvent('Synthesizer', 'Synthesis', 'Synthesizer assembling final verified deliverable');
    const synthesizer = new Agent({
      client: this.client,
      skills: this.skills,
      workspace: this.workspace,
      systemPrompt: `You are the Lead Synthesizer Agent in the Kei-Nexus Swarm.
Your role: Incorporate the Critic's improvements into the Specialist's work and publish the final verified deliverable using artifact_publish or explain the comprehensive final solution.`,
    });

    const synthResult = await synthesizer.run(
      `Goal: ${goal}\nWork: ${specialistResult.finalAnswer}\nCritic Feedback: ${criticResult.finalAnswer}\nProduce the finalized, bulletproof deliverable.`
    );
    this.tokenBudget.recordUsage(synthResult.tokens);
    auditLogger.log('artifact', 4, { agent: 'Synthesizer', deliverable: synthResult.finalAnswer });

    const totalTokens = this.tokenBudget.getStats().totalTokens;

    return {
      runId,
      goal,
      plan: architectResult.finalAnswer,
      executionOutput: specialistResult.finalAnswer,
      critique: criticResult.finalAnswer,
      finalDeliverable: synthResult.finalAnswer,
      totalTokens,
    };
  }

  private emitEvent(
    agentRole: TeamStepEvent['agentRole'],
    phase: string,
    message: string,
    data?: unknown
  ): void {
    const event: TeamStepEvent = { agentRole, phase, message, data };
    this.emit('team_step', event);
  }
}
