import crypto from 'node:crypto';

export class LoopGuard {
  private readonly maxTurns: number;
  private readonly historyHashes: string[] = [];

  constructor(maxTurns = 15) {
    this.maxTurns = maxTurns;
  }

  public getMaxTurns(): number {
    return this.maxTurns;
  }

  /**
   * Asserts that current turn has not exceeded the maximum turn threshold.
   */
  public checkTurnLimit(currentTurn: number): void {
    if (currentTurn >= this.maxTurns) {
      throw new Error(`Execution halted: maximum agent turns limit reached (${this.maxTurns})`);
    }
  }

  /**
   * Records a tool call signature and detects repetitive invocation loops.
   */
  public recordToolCall(toolName: string, args: unknown): void {
    const raw = `${toolName}:${JSON.stringify(args)}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
    this.historyHashes.push(hash);

    // Check if the last 3 calls were completely identical
    if (this.historyHashes.length >= 3) {
      const len = this.historyHashes.length;
      if (
        this.historyHashes[len - 1] === this.historyHashes[len - 2] &&
        this.historyHashes[len - 2] === this.historyHashes[len - 3]
      ) {
        throw new Error(
          `LoopGuard halted execution: identical tool call "${toolName}" repeated 3 consecutive times without state progress.`
        );
      }
    }
  }

  public reset(): void {
    this.historyHashes.length = 0;
  }
}
