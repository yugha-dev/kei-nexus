import { ChatCompletionChunk, ToolCall } from './types.js';

export interface AccumulatedResponse {
  content: string;
  reasoning: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
  };
}

/**
 * StreamAdapter parses incoming chunks from Kei Inference SSE stream,
 * yielding individual chunk deltas and accumulating the full assistant message.
 */
export class StreamAdapter {
  /**
   * Parses an SSE stream text buffer and yields JSON chunks.
   */
  public static async *parseSSE(
    stream: NodeJS.ReadableStream | ReadableStream<Uint8Array>
  ): AsyncGenerator<ChatCompletionChunk, AccumulatedResponse, unknown> {
    const accumulator: AccumulatedResponse = {
      content: '',
      reasoning: '',
      toolCalls: [],
      finishReason: null,
    };

    const toolCallBuilders: Map<number, { id: string; name: string; args: string }> = new Map();

    let buffer = '';
    const decoder = new TextDecoder('utf-8');

    for await (const chunk of stream as AsyncIterable<Uint8Array | string>) {
      const chunkText = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      buffer += chunkText;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          accumulator.finishReason = accumulator.finishReason || 'stop';
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsedChunk = JSON.parse(jsonStr) as ChatCompletionChunk;
            const choice = parsedChunk.choices?.[0];

            if (choice) {
              if (choice.delta?.content) {
                accumulator.content += choice.delta.content;
              }
              if (choice.delta?.reasoning_content) {
                accumulator.reasoning += choice.delta.reasoning_content;
              }
              if (choice.finish_reason) {
                accumulator.finishReason = choice.finish_reason;
              }

              // Handle tool call fragments
              if (choice.delta?.tool_calls) {
                for (const tc of choice.delta.tool_calls) {
                  const idx = tc.index;
                  let builder = toolCallBuilders.get(idx);
                  if (!builder) {
                    builder = {
                      id: tc.id || `call_${idx}_${Date.now()}`,
                      name: '',
                      args: '',
                    };
                    toolCallBuilders.set(idx, builder);
                  }
                  if (tc.id) builder.id = tc.id;
                  if (tc.function?.name) builder.name += tc.function.name;
                  if (tc.function?.arguments) builder.args += tc.function.arguments;
                }
              }
            }

            if (parsedChunk.usage) {
              accumulator.usage = parsedChunk.usage;
            }

            yield parsedChunk;
          } catch {
            // Ignore invalid JSON chunk lines
          }
        }
      }
    }

    // Assemble completed tool calls
    accumulator.toolCalls = Array.from(toolCallBuilders.values()).map((b) => ({
      id: b.id,
      type: 'function' as const,
      function: {
        name: b.name,
        arguments: b.args,
      },
    }));

    return accumulator;
  }
}
