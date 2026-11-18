import { EventEmitter } from 'node:events';
import { WorkflowStep, WorkflowStepContext, WorkflowStepResult } from './pipeline-step.js';
import { WorkspaceManager } from '../workspace/workspace-manager.js';
import { AuditLogger } from '../workspace/audit-logger.js';

export interface WorkflowRunSummary {
  workflowName: string;
  runId: string;
  totalDurationMs: number;
  success: boolean;
  stepResults: WorkflowStepResult[];
  artifactPath?: string;
}

/**
 * WorkflowRunner coordinates the execution of multi-step pipeline workflows,
 * managing inter-step state, audit logging, and progress events.
 */
export class WorkflowRunner extends EventEmitter {
  private readonly workspace: WorkspaceManager;

  constructor(workspace: WorkspaceManager) {
    super();
    this.workspace = workspace;
  }

  public async runPipeline(
    workflowName: string,
    steps: WorkflowStep[],
    initialData: Record<string, unknown> = {}
  ): Promise<WorkflowRunSummary> {
    const auditLogger = new AuditLogger(this.workspace.getChambers().audit);
    const runId = auditLogger.getRunId();
    this.workspace.init();

    const startTime = Date.now();
    const context: WorkflowStepContext = {
      workspaceRoot: this.workspace.getChambers().root,
      runId,
      stepData: { ...initialData },
    };

    const stepResults: WorkflowStepResult[] = [];
    let overallSuccess = true;

    this.emit('start', { workflowName, runId, totalSteps: steps.length });
    auditLogger.log('prompt', 0, { workflowName, steps: steps.map((s) => s.name) });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();

      this.emit('step_start', { stepIndex: i + 1, totalSteps: steps.length, name: step.name, description: step.description });

      try {
        const output = await step.execute(context);
        const durationMs = Date.now() - stepStart;

        // Store step output into shared context
        context.stepData[step.name] = output;

        const result: WorkflowStepResult = {
          stepName: step.name,
          durationMs,
          output,
          success: true,
        };
        stepResults.push(result);

        auditLogger.log('tool_result', i + 1, { step: step.name, durationMs, output });
        this.emit('step_complete', { stepIndex: i + 1, name: step.name, durationMs, output });
      } catch (err: unknown) {
        const durationMs = Date.now() - stepStart;
        const errorMsg = err instanceof Error ? err.message : String(err);

        const result: WorkflowStepResult = {
          stepName: step.name,
          durationMs,
          output: { error: errorMsg },
          success: false,
        };
        stepResults.push(result);
        overallSuccess = false;

        auditLogger.log('error', i + 1, { step: step.name, error: errorMsg });
        this.emit('step_error', { stepIndex: i + 1, name: step.name, error: errorMsg });
        break;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const artifactPath = context.stepData.artifactPath as string | undefined;

    const summary: WorkflowRunSummary = {
      workflowName,
      runId,
      totalDurationMs,
      success: overallSuccess,
      stepResults,
      artifactPath,
    };

    this.emit('finish', summary);
    return summary;
  }
}
