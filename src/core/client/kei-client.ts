import {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatMessage,
  KeiModelInfo,
  ToolDefinition,
} from './types.js';
import { AccumulatedResponse, StreamAdapter } from './stream-adapter.js';

export interface KeiClientConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * KeiClient provides an OpenAI-compatible interface tailored for Kei Inference API.
 */
export class KeiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: KeiClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.KEI_BASE_URL || 'https://api.kei-inference.web.id/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.KEI_API_KEY || '';
    this.defaultModel = config.defaultModel || process.env.KEI_DEFAULT_MODEL || 'glm-5.3-flash';
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 60000;

    if (!this.apiKey) {
      // Allow creation without key for offline testing/mocking, but warn
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Fetches available models from /v1/models
   */
  public async listModels(): Promise<KeiModelInfo[]> {
    const url = `${this.baseUrl}/models`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models from Kei API: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { data: KeiModelInfo[] };
    return data.data || [];
  }

  /**
   * Sends a chat completion request with streaming support and yields chunks
   */
  public async *streamChat(
    messages: ChatMessage[],
    options: {
      model?: string;
      tools?: ToolDefinition[];
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<ChatCompletionChunk, AccumulatedResponse, unknown> {
    const model = options.model || this.defaultModel;
    const body: ChatCompletionRequest = {
      model,
      messages,
      tools: options.tools && options.tools.length > 0 ? options.tools : undefined,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    };

    const url = `${this.baseUrl}/chat/completions`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kei API Error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('Kei API response body is empty');
    }

    // Stream chunks through the StreamAdapter
    return yield* StreamAdapter.parseSSE(response.body);
  }

  /**
   * Helper that executes a streaming chat completion and returns the final accumulated response.
   */
  public async chat(
    messages: ChatMessage[],
    options: {
      model?: string;
      tools?: ToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      onChunk?: (chunk: ChatCompletionChunk) => void;
    } = {}
  ): Promise<AccumulatedResponse> {
    const generator = this.streamChat(messages, options);
    let result = await generator.next();

    while (!result.done) {
      if (options.onChunk && result.value) {
        options.onChunk(result.value);
      }
      result = await generator.next();
    }

    return result.value;
  }

  /**
   * Internal fetch wrapper with exponential backoff on HTTP 429 and network glitches.
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.status === 429 && attempt <= this.maxRetries) {
          // Rate limited, sleep and retry
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        return response;
      } catch (err: unknown) {
        clearTimeout(timer);
        if (attempt > this.maxRetries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }

    throw new Error(`Failed to complete request to ${url} after ${this.maxRetries} attempts`);
  }
}
