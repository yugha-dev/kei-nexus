export enum AgentState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  THINKING = 'THINKING',
  CALLING_TOOL = 'CALLING_TOOL',
  EXECUTING_TOOL = 'EXECUTING_TOOL',
  REFLECTING = 'REFLECTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AgentStepEvent {
  state: AgentState;
  turnIndex: number;
  message?: string;
  data?: unknown;
}
