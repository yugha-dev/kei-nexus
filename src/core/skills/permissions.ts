export enum SkillPermission {
  READ_ONLY = 'READ_ONLY',
  WORKSPACE_WRITE = 'WORKSPACE_WRITE',
  EXECUTION = 'EXECUTION',
  NETWORK = 'NETWORK',
}

export interface SkillMetadata {
  name: string;
  description: string;
  permission: SkillPermission;
  category: 'filesystem' | 'execution' | 'network' | 'memory' | 'artifact' | 'custom';
}
