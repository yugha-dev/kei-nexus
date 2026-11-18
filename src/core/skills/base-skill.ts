import { z } from 'zod';
import { ToolDefinition } from '../client/types.js';
import { SkillMetadata, SkillPermission } from './permissions.js';

export interface SkillExecutionContext {
  workspaceRoot: string;
  runId: string;
}

/**
 * BaseSkill defines the contract for all modular agent skills.
 * Provides parameter validation through Zod and automated ToolDefinition generation.
 */
export abstract class BaseSkill<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TResult = unknown> {
  public abstract readonly metadata: SkillMetadata;
  public abstract readonly schema: TSchema;

  /**
   * Executes the skill logic with validated arguments and runtime context.
   */
  public abstract run(args: z.infer<TSchema>, context: SkillExecutionContext): Promise<TResult>;

  /**
   * Converts the Zod schema into an OpenAI-compatible ToolDefinition JSON schema.
   */
  public toToolDefinition(): ToolDefinition {
    const jsonSchema = this.zodToJsonSchema(this.schema);
    return {
      type: 'function',
      function: {
        name: this.metadata.name,
        description: this.metadata.description,
        parameters: jsonSchema,
      },
    };
  }

  /**
   * Safe execution wrapper that validates arguments before running.
   */
  public async execute(rawArgs: unknown, context: SkillExecutionContext): Promise<TResult> {
    const parseResult = this.schema.safeParse(rawArgs);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid arguments for skill "${this.metadata.name}": ${errorMsg}`);
    }
    return this.run(parseResult.data, context);
  }

  /**
   * Simple Zod to JSON Schema converter for standard types.
   */
  private zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, propSchema] of Object.entries(shape)) {
        properties[key] = this.zodPropertyToJson(propSchema);
        if (!propSchema.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    return { type: 'object', properties: {} };
  }

  private zodPropertyToJson(propSchema: z.ZodTypeAny): Record<string, unknown> {
    if (propSchema instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: propSchema.options,
        description: propSchema.description,
      };
    }
    if (propSchema instanceof z.ZodString) {
      return { type: 'string', description: propSchema.description };
    }
    if (propSchema instanceof z.ZodNumber) {
      return { type: 'number', description: propSchema.description };
    }
    if (propSchema instanceof z.ZodBoolean) {
      return { type: 'boolean', description: propSchema.description };
    }
    if (propSchema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodPropertyToJson(propSchema.element),
        description: propSchema.description,
      };
    }
    if (propSchema instanceof z.ZodOptional) {
      return this.zodPropertyToJson(propSchema.unwrap());
    }
    return { type: 'string' };
  }
}
