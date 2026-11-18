import { SecurityViolationError } from './path-guard.js';

/**
 * SsrfGuard prevents Server-Side Request Forgery by disallowing connections
 * to private IP ranges, loopback interfaces (localhost, 127.0.0.1, ::1),
 * cloud metadata endpoints (169.254.169.254), and non-HTTP protocols.
 */
export class SsrfGuard {
  private static readonly BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                // 127.0.0.0/8
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                 // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/,                    // 192.168.0.0/16
    /^169\.254\.\d{1,3}\.\d{1,3}$/,                    // 169.254.0.0/16 (Link Local & AWS/GCP Metadata)
    /^0\.0\.0\.0$/,
    /^\[?::1\]?$/,                                      // IPv6 loopback
    /^\[?fe80:/i,                                       // IPv6 link local
    /^\[?fc00:/i,                                       // IPv6 private
  ];

  /**
   * Validates target URL against SSRF attack vectors.
   */
  public static validateUrl(inputUrl: string): URL {
    if (!inputUrl || typeof inputUrl !== 'string') {
      throw new SecurityViolationError('URL must be a non-empty string');
    }

    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      throw new SecurityViolationError(`Malformed URL: "${inputUrl}"`);
    }

    // Only allow HTTP and HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new SecurityViolationError(
        `Disallowed protocol "${parsed.protocol}". Only "http:" and "https:" are permitted.`
      );
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check against forbidden host patterns
    for (const pattern of this.BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new SecurityViolationError(
          `SSRF attempt blocked: target hostname "${hostname}" is in a forbidden private or local address range`
        );
      }
    }

    return parsed;
  }
}
