export interface WorkflowStepContext {
  workspaceRoot: string;
  runId: string;
  stepData: Record<string, unknown>;
}

export interface WorkflowStepResult {
  stepName: string;
  durationMs: number;
  output: unknown;
  success: boolean;
}

export interface WorkflowStep {
  name: string;
  description: string;
  execute: (context: WorkflowStepContext) => Promise<unknown>;
}
