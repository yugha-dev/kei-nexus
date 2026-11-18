import { describe, it, expect } from 'vitest';
import { LivingArtifactBuilder, LivingArtifactData } from '../../src/artifacts/living-artifact-builder.js';

describe('LivingArtifactBuilder', () => {
  it('builds standalone responsive HTML artifact with embedded search, KPI cards, and flight logs', () => {
    const mockData: LivingArtifactData = {
      title: 'Test Audit Report',
      subtitle: 'Verification suite',
      generatedAt: '2026-11-18T12:00:00Z',
      runId: 'run-12345',
      model: 'glm-5.3-flash',
      stats: {
        turns: 3,
        totalTokens: 1500,
        promptTokens: 1000,
        completionTokens: 500,
        executionTimeSeconds: 5.2,
        securityScore: 100,
      },
      summary: 'Executive summary text here.',
      findings: [
        {
          id: 'F-01',
          category: 'Security',
          title: 'Path Traversal Guard Active',
          severity: 'INFO',
          description: 'No directory traversal vulnerabilities found.',
          recommendation: 'Maintain current path checks.',
        },
      ],
      flightRecorderLogs: [
        { turn: 1, type: 'prompt', timestamp: '2026-11-18T12:00:01Z', detail: 'User goal prompt' },
        { turn: 1, type: 'tool_call', timestamp: '2026-11-18T12:00:02Z', detail: 'fs_read scratchpad' },
      ],
    };

    const html = LivingArtifactBuilder.buildHtml(mockData);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test Audit Report');
    expect(html).toContain('run-12345');
    expect(html).toContain('glm-5.3-flash');
    expect(html).toContain('Path Traversal Guard Active');
    expect(html).toContain('Kei Flight Recorder');
    expect(html).toContain('filterFindings');
    expect(html).toContain('renderFlightLogs');
  });
});
