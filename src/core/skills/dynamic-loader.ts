import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from './base-skill.js';
import { SkillPermission, SkillMetadata } from './permissions.js';
import { SkillRegistry } from './registry.js';

export const DynamicSkillSchema = z.object({
  name: z.string().describe('Unique identifier for the dynamic skill (lowercase letters, underscores)'),
  description: z.string().describe('Description explaining to the LLM what the dynamic skill does'),
  category: z.enum(['custom', 'filesystem', 'execution', 'network', 'memory', 'artifact']).describe('Category'),
  parameters: z.record(z.string()).describe('Parameter names and their descriptions'),
  handlerSnippet: z.string().describe('Execution action summary or return template'),
});

/**
 * DynamicSkillCreator allows the agent or user to define, register,
 * and hot-reload new skills into the running ecosystem dynamically.
 */
export class DynamicSkillCreatorSkill extends BaseSkill<
  typeof DynamicSkillSchema,
  { name: string; status: string; totalSkills: number }
> {
  private readonly registry: SkillRegistry;

  public readonly metadata: SkillMetadata = {
    name: 'skill_creator',
    description: 'Dynamically creates and registers a new modular skill into the agent registry on the fly without restarting.',
    permission: SkillPermission.WORKSPACE_WRITE,
    category: 'custom',
  };

  public readonly schema = DynamicSkillSchema;

  constructor(registry: SkillRegistry) {
    super();
    this.registry = registry;
  }

  public async run(args: z.infer<typeof DynamicSkillSchema>, _context: SkillExecutionContext) {
    // Construct dynamic Zod object from parameters
    const shape: Record<string, z.ZodString> = {};
    for (const [key, desc] of Object.entries(args.parameters)) {
      shape[key] = z.string().describe(desc);
    }
    const dynamicSchema = z.object(shape);

    class HotLoadedSkill extends BaseSkill<typeof dynamicSchema, unknown> {
      public readonly metadata: SkillMetadata = {
        name: args.name,
        description: args.description,
        permission: SkillPermission.WORKSPACE_WRITE,
        category: args.category,
      };
      public readonly schema = dynamicSchema;

      public async run(runArgs: unknown) {
        return {
          skill: args.name,
          result: `Executed dynamic skill "${args.name}"`,
          template: args.handlerSnippet,
          input: runArgs,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const dynamicSkillInstance = new HotLoadedSkill();
    this.registry.register(dynamicSkillInstance);

    return {
      name: args.name,
      status: 'Skill hot-loaded and registered successfully',
      totalSkills: this.registry.list().length,
    };
  }
}
