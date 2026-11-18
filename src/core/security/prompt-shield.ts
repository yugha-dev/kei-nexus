/**
 * PromptShield handles boundary isolation and detects adversarial injection
 * attempts in untrusted content (e.g. file contents or scraped web text).
 */
export class PromptShield {
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(the\s+)?system\s+prompt/i,
    /you\s+are\s+now\s+(in\s+developer\s+mode|unfiltered)/i,
    /jailbreak/i,
    /system\s*:\s*override/i,
    /BEGIN_UNRESTRICTED_ACCESS/i,
  ];

  /**
   * Wraps untrusted text with XML-style isolation delimiters so the LLM
   * treats it strictly as passive data and not system instructions.
   */
  public static isolate(content: string, sourceName: string): string {
    const sanitizedSource = sourceName.replace(/["<>]/g, '');
    const sanitizedContent = content.replaceAll('</untrusted_content>', '<\\/untrusted_content>');
    return `<untrusted_content source="${sanitizedSource}">\n${sanitizedContent}\n</untrusted_content>`;
  }

  /**
   * Inspects text for obvious prompt injection indicators.
   * Returns true if suspicious patterns are identified.
   */
  public static containsInjectionSignatures(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    return this.INJECTION_PATTERNS.some((pattern) => pattern.test(text));
  }
}
