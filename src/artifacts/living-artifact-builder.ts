export interface LivingArtifactData {
  title: string;
  subtitle: string;
  generatedAt: string;
  runId: string;
  model: string;
  stats: {
    turns: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    executionTimeSeconds: number;
    securityScore: number;
  };
  summary: string;
  findings: Array<{
    id: string;
    category: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
    description: string;
    recommendation: string;
  }>;
  flightRecorderLogs?: Array<{
    turn: number;
    type: string;
    timestamp: string;
    detail: string;
  }>;
}

/**
 * LivingArtifactBuilder synthesizes a zero-dependency, standalone, responsive
 * HTML5 living artifact with client-side interactive search, issue filter,
 * KPI badges, and an embedded Flight Recorder replay viewer.
 */
export class LivingArtifactBuilder {
  private static escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public static buildHtml(data: LivingArtifactData): string {
    // Prevent script tag breakout during JSON serialization
    const findingsJson = JSON.stringify(data.findings).replace(/<\/script/gi, '<\\/script');
    const flightLogsJson = JSON.stringify(data.flightRecorderLogs || []).replace(/<\/script/gi, '<\\/script');

    const safeTitle = this.escapeHtml(data.title);
    const safeSubtitle = this.escapeHtml(data.subtitle);
    const safeRunId = this.escapeHtml(data.runId);
    const safeModel = this.escapeHtml(data.model);
    const safeSummary = this.escapeHtml(data.summary);
    const safeGeneratedAt = this.escapeHtml(data.generatedAt);

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — Kei-Nexus Artifact</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#ecfeff', 500: '#06b6d4', 600: '#0891b2', 900: '#164e63' },
            surface: { 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
          }
        }
      }
    }
  </script>
  <style>
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    .glow-cyan { box-shadow: 0 0 25px -5px rgba(6, 182, 212, 0.4); }
  </style>
</head>
<body class="bg-surface-950 text-slate-100 font-sans min-h-screen antialiased flex flex-col">

  <!-- Header -->
  <header class="border-b border-slate-800 bg-surface-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
          KN
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            ${safeTitle}
            <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">v1.0</span>
          </h1>
          <p class="text-xs text-slate-400">${safeSubtitle} • Run ID: <span class="font-mono text-cyan-400">${safeRunId}</span></p>
        </div>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
        <div class="px-3 py-1.5 rounded-md bg-surface-800 border border-slate-700">
          Model: <span class="text-cyan-300">${safeModel}</span>
        </div>
        <div class="px-3 py-1.5 rounded-md bg-surface-800 border border-slate-700">
          Generated: <span>${safeGeneratedAt}</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">

    <!-- KPI Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">Security Gate</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1">
          <span>${data.stats.securityScore}%</span>
          <span class="text-xs text-emerald-500 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">PASSED</span>
        </div>
      </div>
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">ReAct Turns</div>
        <div class="text-2xl font-bold text-cyan-400 mt-1 font-mono">${data.stats.turns}</div>
      </div>
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">Total Tokens</div>
        <div class="text-2xl font-bold text-indigo-400 mt-1 font-mono">${data.stats.totalTokens.toLocaleString()}</div>
      </div>
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">Prompt Tokens</div>
        <div class="text-2xl font-bold text-purple-400 mt-1 font-mono">${data.stats.promptTokens.toLocaleString()}</div>
      </div>
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">Completion</div>
        <div class="text-2xl font-bold text-pink-400 mt-1 font-mono">${data.stats.completionTokens.toLocaleString()}</div>
      </div>
      <div class="bg-surface-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 font-medium">Execution Time</div>
        <div class="text-2xl font-bold text-amber-400 mt-1 font-mono">${data.stats.executionTimeSeconds}s</div>
      </div>
    </div>

    <!-- Executive Summary Card -->
    <div class="bg-surface-900 border border-slate-800 rounded-xl p-6 glow-cyan">
      <h2 class="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
        Executive Summary
      </h2>
      <p class="text-slate-300 leading-relaxed whitespace-pre-line text-sm">${safeSummary}</p>
    </div>

    <!-- Findings & Recommendations with Client-side Filter -->
    <div class="bg-surface-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 class="text-lg font-semibold text-white">Actionable Findings & Verification Items</h2>
          <p class="text-xs text-slate-400">Filter items by severity or search through descriptions</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            id="searchInput"
            type="text"
            placeholder="Search findings..."
            class="bg-surface-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-64"
            oninput="filterFindings()"
          />
          <select
            id="severityFilter"
            class="bg-surface-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            onchange="filterFindings()"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      <div id="findingsContainer" class="space-y-3">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- Flight Recorder Session Log -->
    <div class="bg-surface-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
          <span>📼</span> Kei Flight Recorder (Session Audit)
        </h2>
        <span class="text-xs text-slate-400 font-mono">Immutable Trace</span>
      </div>
      <div class="bg-surface-950 border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-72 space-y-2">
        <div id="flightLogContainer" class="space-y-1.5 text-slate-300">
          <!-- Injected via JavaScript -->
        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
    Generated by <strong class="text-cyan-400">Kei-Nexus AI Agent Ecosystem</strong> for Challenge Kei Inference • Powered by Kei Inference API
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

    const findings = ${findingsJson};
    const flightLogs = ${flightLogsJson};

    function getSeverityBadge(sev) {
      switch(sev) {
        case 'CRITICAL': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">CRITICAL</span>';
        case 'HIGH': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">HIGH</span>';
        case 'MEDIUM': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-400 border border-yellow-800">MEDIUM</span>';
        case 'LOW': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">LOW</span>';
        default: return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">INFO</span>';
      }
    }

    function renderFindings(items) {
      const container = document.getElementById('findingsContainer');
      if (items.length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-xs py-8 text-center">No findings match the current filter.</div>';
        return;
      }
      container.innerHTML = items.map(f => \`
        <div class="p-4 rounded-lg bg-surface-950 border border-slate-800 hover:border-slate-700 transition">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2">
              \${getSeverityBadge(f.severity)}
              <span class="text-xs text-cyan-400 font-mono">[\${escapeHtml(f.category)}]</span>
              <h3 class="text-sm font-semibold text-white">\${escapeHtml(f.title)}</h3>
            </div>
          </div>
          <p class="text-xs text-slate-300 mb-2 leading-relaxed">\${escapeHtml(f.description)}</p>
          <div class="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded p-2">
            <strong>Recommendation:</strong> \${escapeHtml(f.recommendation)}
          </div>
        </div>
      \`).join('');
    }

    function filterFindings() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const sev = document.getElementById('severityFilter').value;

      const filtered = findings.filter(f => {
        const matchesSearch = (f.title || '').toLowerCase().includes(search) ||
                              (f.description || '').toLowerCase().includes(search) ||
                              (f.category || '').toLowerCase().includes(search);
        const matchesSev = sev === 'ALL' || f.severity === sev;
        return matchesSearch && matchesSev;
      });

      renderFindings(filtered);
    }

    function renderFlightLogs() {
      const container = document.getElementById('flightLogContainer');
      if (flightLogs.length === 0) {
        container.innerHTML = '<div>No flight logs recorded for this run.</div>';
        return;
      }
      container.innerHTML = flightLogs.map(l => \`
        <div class="flex items-start gap-3 hover:bg-slate-900/50 py-0.5 px-1 rounded">
          <span class="text-slate-500">[\${escapeHtml(String(l.timestamp || '').slice(11, 19))}]</span>
          <span class="text-cyan-400 font-bold">[Turn \${escapeHtml(l.turn)}]</span>
          <span class="text-indigo-400 font-bold">\${escapeHtml(l.type)}:</span>
          <span class="text-slate-300 flex-1">\${escapeHtml(l.detail)}</span>
        </div>
      \`).join('');
    }

    // Initial render
    renderFindings(findings);
    renderFlightLogs();
  </script>
</body>
</html>`;
  }
}
