import { describe, it, expect } from 'vitest';
import { SlideDeckBuilder, SlideDeckData } from '../../src/artifacts/slide-deck-builder.js';

describe('SlideDeckBuilder', () => {
  it('generates valid standalone HTML with escaped characters and navigation', () => {
    const data: SlideDeckData = {
      presentationTitle: 'Kei <Nexus> Presentation & Demo',
      author: 'Tester & "Hacker"',
      theme: 'cyberpunk-dark',
      slides: [
        {
          title: 'Slide 1: Overview',
          subtitle: 'Introduction to Swarm',
          bullets: ['Feature A', 'Feature B <safe>'],
          callout: 'Safe callout text',
        },
        {
          title: 'Slide 2: Architecture',
          codeBlock: {
            language: 'typescript',
            code: 'console.log("hello world");',
          },
        },
      ],
    };

    const html = SlideDeckBuilder.buildHtml(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Kei &lt;Nexus&gt; Presentation &amp; Demo');
    expect(html).toContain('Tester &amp; &quot;Hacker&quot;');
    expect(html).toContain('Slide 1: Overview');
    expect(html).toContain('renderSlide');
    expect(html).toContain('ArrowRight');
    expect(html).toContain('escapeHtml');
  });

  it('escapes closing script tags in JSON payload to prevent XSS injection', () => {
    const maliciousData: SlideDeckData = {
      presentationTitle: 'XSS Test',
      author: 'Attacker',
      theme: 'dark',
      slides: [
        {
          title: '</script><script>alert(1)</script>',
          bullets: ['payload: </script>'],
        },
      ],
    };

    const html = SlideDeckBuilder.buildHtml(maliciousData);
    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('<\\/script>');
  });
});
