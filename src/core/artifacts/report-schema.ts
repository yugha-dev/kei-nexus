import { z } from 'zod';

export const FindingSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingSchema = z.object({
  id: z.string().describe('Unique identifier, e.g. SEC-001'),
  title: z.string().describe('Brief description of the vulnerability or risk'),
  severity: FindingSeveritySchema,
  category: z.string().describe('Vulnerability category (e.g. Hardcoded Secret, SSRF, Injection)'),
  file: z.string().describe('Relative path to the affected source file'),
  line: z.number().nullable().optional().describe('Approximate line number where the issue resides'),
  snippet: z.string().nullable().optional().describe('Code snippet demonstrating the flaw'),
  description: z.string().describe('Technical explanation of the vulnerability and impact'),
  remediation: z.string().describe('Concrete actionable code fix or architecture change'),
  verified: z.boolean().default(true).describe('True if verified by EvidenceVerifier against disk'),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ArchitectureComponentSchema = z.object({
  name: z.string(),
  role: z.string(),
  trustBoundary: z.string(),
  technologies: z.array(z.string()).default([]),
});

export const ArchitectureDataFlowSchema = z.object({
  from: z.string(),
  to: z.string(),
  protocol: z.string(),
  sensitiveData: z.boolean().default(false),
});

export const ArchitectureAnalysisSchema = z.object({
  systemOverview: z.string(),
  components: z.array(ArchitectureComponentSchema).default([]),
  dataFlows: z.array(ArchitectureDataFlowSchema).default([]),
  keyRisks: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
});
export type ArchitectureAnalysis = z.infer<typeof ArchitectureAnalysisSchema>;

export const SecurityGateCheckSchema = z.object({
  name: z.string(),
  category: z.string(),
  passed: z.boolean(),
  description: z.string(),
});

export const SecurityGateResultSchema = z.object({
  passed: z.boolean(),
  totalChecks: z.number(),
  passedChecks: z.number(),
  failedChecks: z.number(),
  checks: z.array(SecurityGateCheckSchema),
  timestamp: z.string(),
});
export type SecurityGateResult = z.infer<typeof SecurityGateResultSchema>;

export const EvaluationScoreSchema = z.object({
  completenessScore: z.number().min(0).max(100),
  evidenceQualityScore: z.number().min(0).max(100),
  securityPolicyStatus: z.enum(['PASS', 'FAIL']),
  artifactValidityStatus: z.enum(['PASS', 'FAIL']),
  secretLeakageStatus: z.enum(['PASS', 'FAIL']),
  overallGrade: z.enum(['A', 'B', 'C', 'FAIL']),
  evaluatorNotes: z.string(),
});
export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;

export const KeiInferenceProofSchema = z.object({
  provider: z.literal('Kei Inference'),
  baseUrl: z.string(),
  model: z.string(),
  totalTokens: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  reasoningTokens: z.number().optional().default(0),
  estimatedCostUsd: z.number(),
  requestsCount: z.number(),
  timestamp: z.string(),
  inputHash: z.string(),
  outputHash: z.string(),
});
export type KeiInferenceProof = z.infer<typeof KeiInferenceProofSchema>;

export const AuditReportSchema = z.object({
  reportTitle: z.string(),
  targetProject: z.string(),
  targetPath: z.string(),
  reviewedAt: z.string(),
  executiveSummary: z.string(),
  overallSecurityScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  architecture: ArchitectureAnalysisSchema,
  remediationRoadmap: z.array(
    z.object({
      phase: z.string(),
      timeline: z.string(),
      tasks: z.array(z.string()),
    })
  ),
  securityGate: SecurityGateResultSchema,
  evaluation: EvaluationScoreSchema,
  keiProof: KeiInferenceProofSchema,
});
export type AuditReport = z.infer<typeof AuditReportSchema>;
