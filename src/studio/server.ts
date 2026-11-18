import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { WorkspaceManager } from '../core/workspace/workspace-manager.js';
import { KeiClient } from '../core/client/kei-client.js';
import { SkillRegistry } from '../core/skills/registry.js';
import {
  FsReadSkill,
  FsWriteSkill,
  FsListSkill,
  ShellRunSkill,
  WebFetchSkill,
  MemoryKvSkill,
  ArtifactPublishSkill,
} from '../core/skills/builtins/index.js';
import { DynamicSkillCreatorSkill } from '../core/skills/dynamic-loader.js';
import { Agent } from '../core/harness/agent.js';
import { AgentTeam } from '../core/harness/team.js';

export function startStudio(port = 4100, workspaceDir = './.workspace'): http.Server {
  const workspace = new WorkspaceManager(workspaceDir);
  workspace.init();

  const client = new KeiClient();
  const registry = new SkillRegistry();
  registry.register(new FsReadSkill());
  registry.register(new FsWriteSkill());
  registry.register(new FsListSkill());
  registry.register(new ShellRunSkill());
  registry.register(new WebFetchSkill());
  registry.register(new MemoryKvSkill());
  registry.register(new ArtifactPublishSkill());
  registry.register(new DynamicSkillCreatorSkill(registry));

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // GET /api/health
    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      return;
    }

    // GET /api/artifacts
    if (url.pathname === '/api/artifacts') {
      const artDir = workspace.getChambers().artifacts;
      const files = fs.existsSync(artDir) ? fs.readdirSync(artDir).filter((f) => !f.startsWith('.')) : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ artifacts: files }));
      return;
    }

    // GET /artifact/:name - serve artifact file
    if (url.pathname.startsWith('/artifact/')) {
      const filename = path.basename(url.pathname.replace('/artifact/', ''));
      const safePath = workspace.getPathGuard().resolveSafePath(path.join('artifacts', filename));
      if (fs.existsSync(safePath)) {
        const isHtml = filename.endsWith('.html');
        res.writeHead(200, { 'Content-Type': isHtml ? 'text/html; charset=utf-8' : 'text/plain' });
        res.end(fs.readFileSync(safePath));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Artifact Not Found');
      return;
    }

    // POST /api/chat - SSE stream of agent execution
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      let parsed: { prompt: string; mode?: 'single' | 'team'; model?: string };
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }

      // Setup SSE response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        if (parsed.mode === 'team') {
          const team = new AgentTeam({ client, skills: registry, workspace });
          team.on('team_step', (s) => sendEvent('team_step', s));
          const result = await team.execute(parsed.prompt);
          sendEvent('done', result);
        } else {
          const agent = new Agent({ client, skills: registry, workspace, model: parsed.model });
          agent.on('step', (s) => sendEvent('step', s));
          agent.on('token', (t) => sendEvent('token', t));
          const result = await agent.run(parsed.prompt);
          sendEvent('done', result);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        sendEvent('error', { message: msg });
      } finally {
        res.end();
      }
      return;
    }

    // Default: Serve Embedded Single-Page Studio Application
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getStudioHtml());
  });

  server.listen(port, () => {
    console.log(chalk.bold.cyan(`\n⚡ Kei-Nexus Web Studio live at: ${chalk.underline(`http://localhost:${port}`)}\n`));
  });

  return server;
}

function getStudioHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kei-Nexus // Autonomous AI Agent Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#06b6d4', 600: '#0891b2' },
            surface: { 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-surface-950 text-slate-100 font-sans min-h-screen flex flex-col antialiased">
  <!-- Top Navigation -->
  <header class="border-b border-slate-800 bg-surface-900/80 backdrop-blur px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center font-bold text-black text-sm">KN</div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-white flex items-center gap-2">
          Kei-Nexus Agent Studio
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">v1.2</span>
        </h1>
        <p class="text-[11px] text-slate-400">Challenge Kei Inference • Autonomous Ecosystem</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <select id="modeSelect" class="bg-surface-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white">
        <option value="single">Single ReAct Agent</option>
        <option value="team">Multi-Agent Swarm (4 Agents)</option>
      </select>
      <select id="modelSelect" class="bg-surface-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-cyan-400 font-mono">
        <option value="glm-5.3-flash">glm-5.3-flash</option>
        <option value="deepseek-v4.1-flash">deepseek-v4.1-flash</option>
        <option value="kimi-k3">kimi-k3</option>
      </select>
    </div>
  </header>

  <!-- Main Grid Workspace -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">

    <!-- Left: Interactive Chat & Live Telemetry -->
    <div class="lg:col-span-7 flex flex-col border-r border-slate-800 h-[calc(100vh-60px)]">
      <!-- Chat message stream -->
      <div id="chatFeed" class="flex-1 p-6 overflow-y-auto space-y-4">
        <div class="p-4 rounded-xl bg-surface-900 border border-slate-800 text-xs leading-relaxed text-slate-300">
          👋 Welcome to <strong>Kei-Nexus Autonomous Studio</strong>! Enter a goal below. The agent will autonomously reason, invoke tools (filesystem, shell, web, memory), and generate interactive artifacts.
        </div>
      </div>

      <!-- Input Bar -->
      <div class="p-4 border-t border-slate-800 bg-surface-900/50">
        <form onsubmit="sendGoal(event)" class="flex gap-2">
          <input
            id="goalInput"
            type="text"
            placeholder="Enter autonomous goal (e.g. Audit workspace security or research LLM benchmarks)..."
            class="flex-1 bg-surface-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            required
          />
          <button
            id="sendBtn"
            type="submit"
            class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition flex items-center gap-1.5"
          >
            <span>Execute</span>
            <span>⚡</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Right: Artifacts & Telemetry Panel -->
    <div class="lg:col-span-5 flex flex-col h-[calc(100vh-60px)] bg-surface-900/20">
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Deliverable & Artifact Viewer</h2>
        <button onclick="refreshArtifacts()" class="text-xs text-cyan-400 hover:underline">Refresh</button>
      </div>
      <div class="p-4 border-b border-slate-800">
        <select id="artifactSelect" onchange="previewArtifact()" class="w-full bg-surface-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white">
          <option value="">Select generated artifact to preview...</option>
        </select>
      </div>
      <div class="flex-1 p-4 overflow-hidden flex flex-col">
        <iframe id="artifactFrame" class="w-full h-full rounded-xl border border-slate-800 bg-surface-950" src="about:blank"></iframe>
      </div>
    </div>

  </div>

  <script>
    async function refreshArtifacts() {
      try {
        const res = await fetch('/api/artifacts');
        const data = await res.json();
        const sel = document.getElementById('artifactSelect');
        sel.innerHTML = '<option value="">Select generated artifact to preview...</option>';
        for (const file of data.artifacts) {
          const opt = document.createElement('option');
          opt.value = file;
          opt.textContent = file;
          sel.appendChild(opt);
        }
      } catch (err) {
        console.error(err);
      }
    }

    function previewArtifact() {
      const sel = document.getElementById('artifactSelect');
      const frame = document.getElementById('artifactFrame');
      if (sel.value) {
        frame.src = '/artifact/' + sel.value;
      }
    }

    async function sendGoal(e) {
      e.preventDefault();
      const input = document.getElementById('goalInput');
      const prompt = input.value.trim();
      if (!prompt) return;

      const feed = document.getElementById('chatFeed');
      const mode = document.getElementById('modeSelect').value;
      const model = document.getElementById('modelSelect').value;
      const btn = document.getElementById('sendBtn');

      // Append user prompt card
      feed.innerHTML += \`
        <div class="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/60 text-xs text-cyan-200">
          <strong>Goal:</strong> \${prompt}
        </div>
      \`;
      input.value = '';
      btn.disabled = true;
      btn.textContent = 'Running...';

      const liveCardId = 'live-' + Date.now();
      feed.innerHTML += \`
        <div id="\${liveCardId}" class="p-4 rounded-xl bg-surface-900 border border-slate-800 text-xs space-y-2">
          <div class="flex items-center gap-2 text-cyan-400 font-bold">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Agent Active (\${mode.toUpperCase()})</span>
          </div>
          <div class="log-content space-y-1 text-slate-300 font-mono text-[11px]"></div>
        </div>
      \`;
      feed.scrollTop = feed.scrollHeight;

      const liveCard = document.getElementById(liveCardId);
      const logContent = liveCard.querySelector('.log-content');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, mode, model }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.state) {
                  logContent.innerHTML += \`<div class="text-cyan-400">[\${data.state}] \${data.message || ''}</div>\`;
                } else if (data.agentRole) {
                  logContent.innerHTML += \`<div class="text-purple-400"><strong>\${data.agentRole}:</strong> \${data.message}</div>\`;
                } else if (data.finalAnswer) {
                  logContent.innerHTML += \`<div class="text-emerald-400 font-bold mt-2">✓ \${data.finalAnswer.slice(0, 150)}...</div>\`;
                }
                feed.scrollTop = feed.scrollHeight;
              } catch {}
            }
          }
        }
      } catch (err) {
        logContent.innerHTML += \`<div class="text-red-400">Error: \${err.message}</div>\`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Execute</span><span>⚡</span>';
        refreshArtifacts();
      }
    }

    refreshArtifacts();
  </script>
</body>
</html>`;
}
