import { z } from 'zod';
import { BaseSkill, SkillExecutionContext } from '../base-skill.js';
import { SkillPermission } from '../permissions.js';
import { SsrfGuard } from '../../security/ssrf-guard.js';
import { PromptShield } from '../../security/prompt-shield.js';

export const WebFetchSchema = z.object({
  url: z.string().describe('Public web URL to fetch data from (HTTP or HTTPS only)'),
  maxChars: z.number().optional().describe('Maximum characters of text content to return (default: 5000)'),
});

export class WebFetchSkill extends BaseSkill<typeof WebFetchSchema, { url: string; status: number; content: string }> {
  public readonly metadata = {
    name: 'web_fetch',
    description: 'Retrieves content from a public web URL with strict SSRF protection against internal networks.',
    permission: SkillPermission.NETWORK,
    category: 'network' as const,
  };

  public readonly schema = WebFetchSchema;

  public async run(args: z.infer<typeof WebFetchSchema>, _context: SkillExecutionContext) {
    let currentUrl = SsrfGuard.validateUrl(args.url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const maxHops = 3;
    let hops = 0;

    try {
      let response: Response;

      while (true) {
        response = await fetch(currentUrl.toString(), {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': 'Kei-Nexus-Agent/1.0 (+https://github.com/kei-nexus)',
            Accept: 'text/html,application/json,text/plain;q=0.9',
          },
        });

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          hops++;
          if (hops > maxHops) {
            throw new Error(`Maximum redirect limit of ${maxHops} hops exceeded`);
          }

          const location = response.headers.get('location');
          if (!location) {
            throw new Error('Redirect response missing Location header');
          }

          const resolved = new URL(location, currentUrl);
          currentUrl = SsrfGuard.validateUrl(resolved.toString());
          continue;
        }

        break;
      }

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP fetch failed with status ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const limit = args.maxChars || 5000;
      const stripped = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .slice(0, limit);

      const isolated = PromptShield.isolate(stripped, args.url);

      return {
        url: args.url,
        status: response.status,
        content: isolated,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`web_fetch error for ${args.url}: ${msg}`);
    }
  }
}
