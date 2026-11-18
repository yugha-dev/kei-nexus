export interface TokenUsageStats {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export class TokenBudget {
  private promptTokens = 0;
  private completionTokens = 0;
  private reasoningTokens = 0;
  private readonly maxBudget: number;

  constructor(maxBudget = 500000) {
    this.maxBudget = maxBudget;
  }

  public recordUsage(usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    reasoning_tokens?: number;
    total_tokens?: number;
  }): void {
    if (!usage) return;
    if (usage.prompt_tokens) this.promptTokens += usage.prompt_tokens;
    if (usage.completion_tokens) this.completionTokens += usage.completion_tokens;
    if (usage.reasoning_tokens) this.reasoningTokens += usage.reasoning_tokens;
  }

  public getStats(): TokenUsageStats {
    const total = this.promptTokens + this.completionTokens;
    // Approximated Kei rate (blended ~$0.15 per 1M tokens)
    const estimatedCostUsd = (total / 1_000_000) * 0.15;

    return {
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      reasoningTokens: this.reasoningTokens,
      totalTokens: total,
      estimatedCostUsd,
    };
  }

  public isNearBudget(thresholdRatio = 0.85): boolean {
    return this.promptTokens + this.completionTokens >= this.maxBudget * thresholdRatio;
  }
}
