import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { createSecurityAuditPipeline } from '../../src/core/workflow/pipelines/security-audit.js';
import { AuditEvaluator } from '../../src/core/workflow/evaluator.js';
import { AuditReport } from '../../src/core/artifacts/report-schema.js';
import { WorkflowRunner } from '../../src/core/workflow/workflow-runner.js';
import { Agent } from '../../src/core/harness/agent.js';
import { KeiClient } from '../../src/core/client/kei-client.js';
import { SkillRegistry } from '../../src/core/skills/registry.js';
import { WorkspaceManager } from '../../src/core/workspace/workspace-manager.js';

describe('Security Audit Pipeline & Evaluator', () => {
  const testWorkspaceDir = path.resolve('.workspace-test-sec-pipeline');
  let workspace: WorkspaceManager;
  let skills: SkillRegistry;

  beforeEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    workspace = new WorkspaceManager(testWorkspaceDir);
    workspace.init();
    skills = new SkillRegistry();
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  it('runs complete 4-step security audit pipeline on sample-project', async () => {
    const mockClient = {
      getDefaultModel: () => 'glm-5.3-flash',
      chat: vi.fn().mockImplementation(async () => {
        return {
          content: 'Mocked security scan findings summary.',
          toolCalls: [],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
      }),
    } as unknown as KeiClient;

    const agent = new Agent({ client: mockClient, skills, workspace });
    const runner = new WorkflowRunner(workspace);
    const pipeline = createSecurityAuditPipeline(agent, './sample-project');

    const summary = await runner.runPipeline('security-audit', pipeline);

    expect(summary.success).toBe(true);
    expect(summary.stepResults.length).toBe(4);

    // Verify generated artifacts
    const artifactDir = path.join(testWorkspaceDir, 'artifacts');
    expect(fs.existsSync(path.join(artifactDir, 'findings.json'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'summary.md'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'audit-report.html'))).toBe(true);

    const findingsJson = JSON.parse(fs.readFileSync(path.join(artifactDir, 'findings.json'), 'utf-8'));
    expect(findingsJson.findings.length).toBeGreaterThanOrEqual(4);
    expect(findingsJson.findings.some((f: { id: string }) => f.id === 'SEC-001')).toBe(true);
    expect(findingsJson.securityGate.passed).toBe(true);
  });

  it('evaluates report evidence and calculates deterministic score', () => {
    const mockReport: AuditReport = {
      reportTitle: 'Test Report',
      targetProject: 'sample-project',
      targetPath: path.resolve('./sample-project'),
      reviewedAt: new Date().toISOString(),
      executiveSummary: 'This is a comprehensive executive summary evaluating the security posture of the sample project.',
      overallSecurityScore: 55,
      findings: [
        {
          id: 'SEC-001',
          title: 'Hardcoded Secret',
          category: 'Hardcoded Secret',
          severity: 'CRITICAL',
          file: 'server.js',
          line: 10,
          snippet: 'const INTERNAL_API_TOKEN',
          description: 'Secret token found in source code.',
          remediation: 'Move secret to environment variables.',
          verified: true,
        },
      ],
      architecture: {
        systemOverview: 'Single tier server',
        components: [{ name: 'server', role: 'API', trustBoundary: 'Public', technologies: [] }],
        dataFlows: [],
        keyRisks: ['Risk A'],
        strengths: ['Strength A'],
      },
      remediationRoadmap: [
        {
          phase: 'Phase 1',
          timeline: 'Immediate',
          tasks: ['Fix secret'],
        },
      ],
      securityGate: {
        passed: true,
        totalChecks: 47,
        passedChecks: 47,
        failedChecks: 0,
        checks: [],
        timestamp: new Date().toISOString(),
      },
      evaluation: {
        completenessScore: 100,
        evidenceQualityScore: 100,
        securityPolicyStatus: 'PASS',
        artifactValidityStatus: 'PASS',
        secretLeakageStatus: 'PASS',
        overallGrade: 'A',
        evaluatorNotes: '',
      },
      keiProof: {
        provider: 'Kei Inference',
        baseUrl: 'https://api.kei-inference.web.id/v1',
        model: 'glm-5.3-flash',
        totalTokens: 1000,
        promptTokens: 800,
        completionTokens: 200,
        reasoningTokens: 0,
        estimatedCostUsd: 0.0001,
        requestsCount: 2,
        timestamp: new Date().toISOString(),
        inputHash: 'hash1',
        outputHash: 'hash2',
      },
    };

    const evaluation = AuditEvaluator.evaluate(mockReport, path.resolve('./sample-project'));

    expect(evaluation.completenessScore).toBe(100);
    expect(evaluation.evidenceQualityScore).toBe(100);
    expect(evaluation.securityPolicyStatus).toBe('PASS');
    expect(evaluation.secretLeakageStatus).toBe('PASS');
    expect(evaluation.overallGrade).toBe('A');
  });
});
