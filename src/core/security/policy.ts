import { SkillPermission, SkillMetadata } from '../skills/permissions.js';

export enum ToolActionTier {
  READ_ONLY = 'READ_ONLY',
  WRITE_WORKSPACE = 'WRITE_WORKSPACE',
  EXECUTE = 'EXECUTE',
}

export interface SecurityPolicyConfig {
  autoApproveReadOnly?: boolean;
  autoApproveWorkspaceWrite?: boolean;
  autoApproveExecute?: boolean; // Default false (requires explicit consent or --yes)
  approvalCallback?: (toolName: string, tier: ToolActionTier, args: Record<string, unknown>) => Promise<boolean>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  tier: ToolActionTier;
  reason?: string;
  auditBadge: string;
}

/**
 * SecurityPolicyManager enforces a tiered approval policy over all tool calls:
 * - READ_ONLY: Auto-allowed (fs_read, fs_list, web_fetch)
 * - WRITE_WORKSPACE: Sandboxed inside .workspace/ (fs_write, memory_kv, artifact_publish)
 * - EXECUTE: High-risk actions (shell_run, dynamic skill creation) requiring explicit approval
 */
export class SecurityPolicyManager {
  private readonly config: Required<SecurityPolicyConfig>;

  constructor(config: SecurityPolicyConfig = {}) {
    this.config = {
      autoApproveReadOnly: config.autoApproveReadOnly ?? true,
      autoApproveWorkspaceWrite: config.autoApproveWorkspaceWrite ?? true,
      autoApproveExecute: config.autoApproveExecute ?? false,
      approvalCallback: config.approvalCallback ?? (async () => false),
    };
  }

  public classifyTool(toolName: string, metadata?: SkillMetadata): ToolActionTier {
    if (metadata) {
      if (metadata.permission === SkillPermission.READ_ONLY) return ToolActionTier.READ_ONLY;
      if (metadata.permission === SkillPermission.WORKSPACE_WRITE) return ToolActionTier.WRITE_WORKSPACE;
      if (metadata.permission === SkillPermission.EXECUTION) return ToolActionTier.EXECUTE;
    }

    // Default classification by tool name
    switch (toolName) {
      case 'fs_read':
      case 'fs_list':
      case 'web_fetch':
        return ToolActionTier.READ_ONLY;

      case 'fs_write':
      case 'memory_kv':
      case 'artifact_publish':
        return ToolActionTier.WRITE_WORKSPACE;

      case 'shell_run':
      case 'dynamic_skill_creator':
        return ToolActionTier.EXECUTE;

      default:
        return ToolActionTier.EXECUTE;
    }
  }

  public async evaluate(
    toolName: string,
    args: Record<string, unknown>,
    metadata?: SkillMetadata
  ): Promise<PolicyEvaluationResult> {
    const tier = this.classifyTool(toolName, metadata);

    switch (tier) {
      case ToolActionTier.READ_ONLY:
        return {
          allowed: this.config.autoApproveReadOnly,
          tier,
          auditBadge: '[SECURITY:READ_ONLY]',
        };

      case ToolActionTier.WRITE_WORKSPACE:
        return {
          allowed: this.config.autoApproveWorkspaceWrite,
          tier,
          auditBadge: '[SECURITY:WORKSPACE_WRITE]',
        };

      case ToolActionTier.EXECUTE: {
        if (this.config.autoApproveExecute) {
          return {
            allowed: true,
            tier,
            auditBadge: '[SECURITY:EXECUTE_APPROVED]',
          };
        }

        const approved = await this.config.approvalCallback(toolName, tier, args);
        if (approved) {
          return {
            allowed: true,
            tier,
            auditBadge: '[SECURITY:EXECUTE_USER_APPROVED]',
          };
        }

        return {
          allowed: false,
          tier,
          reason: `Execution of high-risk tool "${toolName}" requires explicit approval. Use --yes or approval prompt.`,
          auditBadge: '[SECURITY:EXECUTE_REJECTED]',
        };
      }
    }
  }
}
