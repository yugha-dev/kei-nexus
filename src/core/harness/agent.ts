import { EventEmitter } from 'node:events';
import { KeiClient } from '../client/kei-client.js';
import { ChatMessage, ToolCall } from '../client/types.js';
import { SkillRegistry } from '../skills/registry.js';
import { WorkspaceManager } from '../workspace/workspace-manager.js';
import { AuditLogger } from '../workspace/audit-logger.js';
import { AgentState, AgentStepEvent } from './state.js';
import { LoopGuard } from './loop-guard.js';
import { TokenBudget } from './token-budget.js';
import { SecretRedactor } from '../security/secret-redactor.js';
import { SecurityPolicyManager } from '../security/policy.js';

export interface AgentConfig {
  client: KeiClient;
  skills: SkillRegistry;
  workspace: WorkspaceManager;
  model?: string;
  maxTurns?: number;
  systemPrompt?: string;
  securityPolicy?: SecurityPolicyManager;
}

export interface AgentRunResult {
  runId: string;
  goal: string;
  finalAnswer: string;
  turns: number;
  tokens: ReturnType<TokenBudget['getStats']>;
  auditLogFile: string;
}

/**
 * ReAct Agent Harness coordinating model interaction, tool execution,
 * workspace sandboxing, and audit recording.
 */
export class Agent extends EventEmitter {
  private readonly client: KeiClient;
  private readonly skills: SkillRegistry;
  private readonly workspace: WorkspaceManager;
  private readonly model: string;
  private readonly loopGuard: LoopGuard;
  private readonly tokenBudget: TokenBudget;
  private readonly systemPrompt: string;
  private readonly securityPolicy: SecurityPolicyManager;

  constructor(config: AgentConfig) {
    super();
    this.client = config.client;
    this.skills = config.skills;
    this.workspace = config.workspace;
    this.model = config.model || this.client.getDefaultModel();
    this.loopGuard = new LoopGuard(config.maxTurns || 15);
    this.tokenBudget = new TokenBudget();
    this.securityPolicy = config.securityPolicy || new SecurityPolicyManager();

    this.systemPrompt =
      config.systemPrompt ||
      `You are Kei-Nexus, an autonomous AI agent ecosystem built for Challenge Kei Inference.
You have access to a secure, standardized workspace with four chambers:
- scratchpad/: for your intermediate notes, draft analysis, and working code
- memory/: for persistent key-value facts across sessions
- artifacts/: for final deliverables (HTML dashboards, markdown reports, JSON data)
- audit/: for flight recorder execution logs

Work step-by-step:
1. Reason: analyze the task and form a concise plan in scratchpad/.
2. Act: use your tools to inspect, fetch, compute, or write.
3. Observe: analyze the tool outputs objectively.
4. Synthesize: when the goal is achieved, publish final deliverables in artifacts/ and explain the result clearly.`;
  }

  /**
   * Runs the agent against a goal prompt until completion or turn limit.
   */
  public async run(goal: string): Promise<AgentRunResult> {
    const auditLogger = new AuditLogger(this.workspace.getChambers().audit);
    const runId = auditLogger.getRunId();

    this.workspace.init();
    this.loopGuard.reset();

    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: goal },
    ];

    auditLogger.log('prompt', 0, { goal });
    this.emitEvent(AgentState.PLANNING, 0, 'Analyzing goal and initializing plan', { goal });

    let turn = 0;
    let finalAnswer = '';

    while (true) {
      turn++;
      this.loopGuard.checkTurnLimit(turn);

      this.emitEvent(AgentState.THINKING, turn, `Turn ${turn}: Querying Kei Inference model (${this.model})`);

      const toolDefs = this.skills.getToolDefinitions();

      // Call Kei API with streaming
      let accumulated;
      try {
        accumulated = await this.client.chat(messages, {
          model: this.model,
          tools: toolDefs,
          temperature: 0.2,
          onChunk: (chunk) => {
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              this.emit('token', delta.content);
            }
            if (delta?.reasoning_content) {
              this.emit('reasoning', delta.reasoning_content);
            }
          },
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.emitEvent(AgentState.FAILED, turn, `Model API call failed: ${errorMsg}`);
        auditLogger.log('error', turn, { error: errorMsg });
        throw err;
      }

      this.tokenBudget.recordUsage(accumulated.usage);
      if (accumulated.usage) {
        auditLogger.log('token_usage', turn, accumulated.usage);
      }

      if (accumulated.reasoning) {
        auditLogger.log('thought', turn, { reasoning: accumulated.reasoning });
      }

      // If the model did not make any tool calls, it has concluded its response
      if (!accumulated.toolCalls || accumulated.toolCalls.length === 0) {
        finalAnswer = accumulated.content || 'Goal executed successfully.';
        messages.push({ role: 'assistant', content: finalAnswer });
        this.emitEvent(AgentState.COMPLETED, turn, 'Agent has completed all steps', { finalAnswer });
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: accumulated.content || '',
        tool_calls: accumulated.toolCalls,
      });

      // Execute each tool call
      for (const toolCall of accumulated.toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          // Keep raw
        }

        this.loopGuard.recordToolCall(toolName, toolArgs);

        this.emitEvent(AgentState.CALLING_TOOL, turn, `Calling tool: ${toolName}`, {
          tool: toolName,
          args: toolArgs,
        });
        auditLogger.log('tool_call', turn, { tool: toolName, args: toolArgs });

        let toolResult: unknown;
        const skill = this.skills.get(toolName);
        const policyCheck = await this.securityPolicy.evaluate(toolName, toolArgs, skill?.metadata);

        auditLogger.log('security_policy', turn, {
          tool: toolName,
          tier: policyCheck.tier,
          allowed: policyCheck.allowed,
          reason: policyCheck.reason,
        });

        if (!policyCheck.allowed) {
          toolResult = {
            error: policyCheck.reason || `Tool execution blocked by security policy: ${toolName}`,
          };
        } else {
          try {
            toolResult = await this.skills.executeTool(toolName, toolCall.function.arguments, {
              workspaceRoot: this.workspace.getChambers().root,
              runId,
            });
          } catch (toolError: unknown) {
            toolResult = {
              error: toolError instanceof Error ? toolError.message : String(toolError),
            };
          }
        }

        const serializedResult = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
        const cleanResult = SecretRedactor.redact(serializedResult);

        auditLogger.log('tool_result', turn, { tool: toolName, result: cleanResult });

        // Push tool response message to history
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: cleanResult,
        });

        this.emitEvent(AgentState.EXECUTING_TOOL, turn, `Executed ${toolName}`, {
          tool: toolName,
          success: !(typeof toolResult === 'object' && toolResult !== null && 'error' in toolResult),
        });
      }

      this.emitEvent(AgentState.REFLECTING, turn, `Reflecting on observations from turn ${turn}`);
    }

    return {
      runId,
      goal,
      finalAnswer,
      turns: turn,
      tokens: this.tokenBudget.getStats(),
      auditLogFile: auditLogger.getLogFile(),
    };
  }

  private emitEvent(state: AgentState, turnIndex: number, message?: string, data?: unknown): void {
    const event: AgentStepEvent = { state, turnIndex, message, data };
    this.emit('step', event);
  }
}
