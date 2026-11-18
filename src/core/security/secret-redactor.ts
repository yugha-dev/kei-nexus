/**
 * SecretRedactor scans strings and objects, scrubbing sensitive credentials,
 * API tokens, private keys, and environment variables.
 */
export class SecretRedactor {
  private static readonly SECRET_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
    // OpenAI and Kei API keys (sk-...)
    { regex: /sk-[a-zA-Z0-9_\-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
    // GitHub tokens (ghp_, gho_, etc.)
    { regex: /gh[pousr]_[a-zA-Z0-9]{30,}/g, replacement: '[REDACTED_GH_TOKEN]' },
    // AWS Access Key ID
    { regex: /(?:AKIA|ASIA)[0-9A-Z]{16}/g, replacement: '[REDACTED_AWS_KEY]' },
    // Generic Bearer tokens in headers
    { regex: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, replacement: 'Bearer [REDACTED_BEARER_TOKEN]' },
    // Private Key blocks
    { regex: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
    // Password / Secret in JSON or query params
    { regex: /"(password|secret|token|apiKey|api_key|auth)"\s*:\s*"[^"]+"/gi, replacement: '"$1": "[REDACTED]"' },
  ];

  /**
   * Redacts sensitive patterns from a text string.
   */
  public static redact(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text;
    for (const { regex, replacement } of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(regex, replacement);
    }
    return sanitized;
  }

  /**
   * Recursively traverses and redacts sensitive data inside an object or array.
   */
  public static redactObject<T>(obj: T): T {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      return this.redact(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }
    if (typeof obj === 'object') {
      const copy: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (/^(password|secret|token|api_?key|auth)$/i.test(key) && typeof value === 'string') {
          copy[key] = '[REDACTED]';
        } else {
          copy[key] = this.redactObject(value);
        }
      }
      return copy as T;
    }
    return obj;
  }
}
