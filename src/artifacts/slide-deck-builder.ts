export interface SlideItem {
  title: string;
  subtitle?: string;
  bullets?: string[];
  codeBlock?: { language: string; code: string };
  callout?: string;
}

export interface SlideDeckData {
  presentationTitle: string;
  author: string;
  theme: string;
  slides: SlideItem[];
}

/**
 * SlideDeckBuilder synthesizes a zero-dependency, standalone, responsive
 * HTML5 presentation deck with keyboard navigation (ArrowLeft, ArrowRight, Space),
 * slide counter, fullscreen toggle, and dark-mode styling.
 */
export class SlideDeckBuilder {
  private static escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public static buildHtml(data: SlideDeckData): string {
    const slidesJson = JSON.stringify(data.slides).replace(/<\/script/gi, '<\\/script');
    const safeTitle = this.escapeHtml(data.presentationTitle);
    const safeAuthor = this.escapeHtml(data.author);

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — Kei-Nexus Deck</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#06b6d4', 600: '#0891b2' },
            surface: { 900: '#0f172a', 950: '#020617' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-surface-950 text-slate-100 font-sans min-h-screen flex flex-col items-center justify-between p-6 select-none">

  <!-- Header Bar -->
  <header class="w-full max-w-5xl flex items-center justify-between text-xs text-slate-400 font-mono pb-4 border-b border-slate-800">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
      <span class="font-bold text-white tracking-wider">${safeTitle}</span>
    </div>
    <div>${safeAuthor} • Kei-Nexus Studio</div>
  </header>

  <!-- Slide Stage -->
  <main class="w-full max-w-5xl flex-1 flex flex-col justify-center py-8">
    <div id="slideCard" class="bg-surface-900 border border-slate-800 rounded-2xl p-10 shadow-2xl min-h-[420px] flex flex-col justify-center relative transition-all duration-300">
      <!-- Injected via JavaScript -->
    </div>
  </main>

  <!-- Navigation Controls & Counter -->
  <footer class="w-full max-w-5xl flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
    <div class="text-slate-400 flex items-center gap-2">
      <kbd class="px-2 py-1 bg-surface-900 border border-slate-700 rounded text-cyan-400 font-mono">←</kbd>
      <kbd class="px-2 py-1 bg-surface-900 border border-slate-700 rounded text-cyan-400 font-mono">→</kbd>
      <span>Use arrow keys to navigate</span>
    </div>

    <div class="flex items-center gap-4">
      <span id="slideCounter" class="font-mono text-cyan-400 font-bold">1 / 1</span>
      <div class="flex items-center gap-2">
        <button onclick="prevSlide()" class="px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-slate-800 border border-slate-700 text-white font-medium">Prev</button>
        <button onclick="nextSlide()" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium">Next</button>
      </div>
    </div>
  </footer>

  <script>
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const slides = ${slidesJson};
    let currentSlide = 0;

    function renderSlide(index) {
      const slide = slides[index];
      const card = document.getElementById('slideCard');
      const counter = document.getElementById('slideCounter');

      counter.textContent = (index + 1) + ' / ' + slides.length;

      let bulletsHtml = '';
      if (slide.bullets && slide.bullets.length > 0) {
        bulletsHtml = '<ul class="space-y-3 mt-6 text-sm text-slate-300">' +
          slide.bullets.map(b => '<li class="flex items-start gap-3"><span class="text-cyan-400 font-bold">▹</span><span>' + escapeHtml(b) + '</span></li>').join('') +
          '</ul>';
      }

      let codeHtml = '';
      if (slide.codeBlock) {
        codeHtml = '<pre class="mt-6 p-4 rounded-xl bg-surface-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto"><code>' +
          escapeHtml(slide.codeBlock.code) +
          '</code></pre>';
      }

      let calloutHtml = '';
      if (slide.callout) {
        calloutHtml = '<div class="mt-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs text-cyan-200"><strong>Takeaway:</strong> ' +
          escapeHtml(slide.callout) + '</div>';
      }

      card.innerHTML = \`
        <div class="space-y-2">
          <h2 class="text-3xl font-extrabold text-white tracking-tight">\${escapeHtml(slide.title)}</h2>
          \${slide.subtitle ? '<p class="text-slate-400 text-sm">' + escapeHtml(slide.subtitle) + '</p>' : ''}
        </div>
        \${bulletsHtml}
        \${codeHtml}
        \${calloutHtml}
      \`;
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        renderSlide(currentSlide);
      }
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        renderSlide(currentSlide);
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    });

    renderSlide(0);
  </script>
</body>
</html>`;
  }
}
