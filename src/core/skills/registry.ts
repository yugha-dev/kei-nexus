import { ToolDefinition } from '../client/types.js';
import { BaseSkill, SkillExecutionContext } from './base-skill.js';
import { SkillPermission } from './permissions.js';

export class SkillRegistry {
  private skills: Map<string, BaseSkill> = new Map();

  public register(skill: BaseSkill): void {
    const name = skill.metadata.name;
    if (this.skills.has(name)) {
      throw new Error(`Skill with name "${name}" is already registered`);
    }
    this.skills.set(name, skill);
  }

  public get(name: string): BaseSkill | undefined {
    return this.skills.get(name);
  }

  public has(name: string): boolean {
    return this.skills.has(name);
  }

  public list(): BaseSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Generates ToolDefinition array for all registered skills.
   */
  public getToolDefinitions(allowedPermissions?: SkillPermission[]): ToolDefinition[] {
    return this.list()
      .filter((skill) => {
        if (!allowedPermissions) return true;
        return allowedPermissions.includes(skill.metadata.permission);
      })
      .map((skill) => skill.toToolDefinition());
  }

  /**
   * Dispatches a tool call by name, parsing arguments and returning the result.
   */
  public async executeTool(
    name: string,
    rawArgs: string | Record<string, unknown>,
    context: SkillExecutionContext
  ): Promise<unknown> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`Tool "${name}" is not registered in the skill registry`);
    }

    let parsedArgs: unknown = rawArgs;
    if (typeof rawArgs === 'string') {
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {
        throw new Error(`Tool "${name}" arguments must be valid JSON: "${rawArgs}"`);
      }
    }

    return await skill.execute(parsedArgs, context);
  }
}
