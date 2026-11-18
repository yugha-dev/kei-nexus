import fs from 'node:fs';
import path from 'node:path';
import { SecretRedactor } from '../security/secret-redactor.js';

export interface AuditRecord {
  timestamp: string;
  runId: string;
  type: 'prompt' | 'thought' | 'tool_call' | 'tool_result' | 'token_usage' | 'artifact' | 'error' | 'security_policy';
  turnIndex: number;
  data: unknown;
}

/**
 * AuditLogger records an immutable, replayable flight-recorder trace
 * in NDJSON (Newline Delimited JSON) format for each agent run.
 */
export class AuditLogger {
  private readonly logFile: string;
  private readonly runId: string;

  constructor(auditDir: string, runId?: string) {
    this.runId = runId || `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.logFile = path.join(auditDir, `${this.runId}.ndjson`);

    const parentDir = path.dirname(this.logFile);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  public getRunId(): string {
    return this.runId;
  }

  public getLogFile(): string {
    return this.logFile;
  }

  public log(type: AuditRecord['type'], turnIndex: number, data: unknown): void {
    const record: AuditRecord = {
      timestamp: new Date().toISOString(),
      runId: this.runId,
      type,
      turnIndex,
      data: SecretRedactor.redactObject(data),
    };

    const line = JSON.stringify(record) + '\n';
    fs.appendFileSync(this.logFile, line, 'utf-8');
  }

  public getRecords(): AuditRecord[] {
    if (!fs.existsSync(this.logFile)) return [];
    const content = fs.readFileSync(this.logFile, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as AuditRecord);
  }
}
