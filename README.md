# ⚡ Kei-Nexus: Autonomous AI Agent Ecosystem

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-green?logo=vitest)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-86%25-brightgreen)](https://github.com/yugha-dev/kei-nexus)
[![Security Gate](https://img.shields.io/badge/Security%20Gate-100%25%20Passed-emerald)](https://github.com/yugha-dev/kei-nexus)
[![Inference](https://img.shields.io/badge/Provider-Kei%20Inference-cyan)](https://api.kei-inference.web.id)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

> Built for **CHALLENGE KEI INFERENCE — AI AGENT ECOSYSTEM**  
> An autonomous, secure, and production-grade AI agent ecosystem featuring an event-driven **Harness**, **Multi-Agent Swarm**, schema-first **Skills**, a sandboxed four-chamber **Workspace**, an embedded **Web Studio GUI**, and end-to-end **Workflows** synthesizing standalone interactive living artifacts.

---

## 🌟 The Four Core Pillars

Kei-Nexus implements the four required competition pillars with zero compromise:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 KEI INFERENCE API                      │
                  │   (/v1/chat/completions • glm-5.3-flash • deepseek)    │
                  └───────────────────────────▲────────────────────────────┘
                                              │  SSE Stream & Tool Calls
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HARNESS ENGINE (src/core/harness/)                                                   │
│   • ReAct Loop FSM (IDLE → THINKING → CALLING_TOOL → EXECUTING → REFLECTING → COMPLETED)│
│   • LoopGuard: Repetition & turn explosion detector                                      │
│   • TokenBudget: Accumulated usage tracker & context compaction monitor                  │
│   • Event Streamer: Powers live CLI Cockpit and Flight Recorder                          │
└─────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ Dispatches Actions
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. MODULAR SKILLS (src/core/skills/)                                                     │
│   • Schema-First: Every skill is strictly typed via Zod & exported as OpenAI Tool Schema │
│   • Safe Built-ins:                                                                      │
│       - fs_read / fs_write / fs_list (Workspace I/O)                                     │
│       - shell_run (Command AST Whitelist, 30s timeout, env sanitized)                    │
│       - web_fetch (SSRF-protected public URL scraper)                                    │
│       - memory_kv (Episodic & tag-based persistent memory)                               │
│       - artifact_publish (Bundles deliverables into manifest)                            │
└─────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ Sandboxed Operations
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. FOUR-CHAMBER WORKSPACE (.workspace/)                                                  │
│   • scratchpad/ : Ephemeral agent thoughts, draft scripts & data                         │
│   • memory/     : Persistent KV store across sessions (store.json)                       │
│   • artifacts/  : Production deliverables (HTML dashboards, markdown summaries)          │
│   • audit/      : Replayable NDJSON Flight Recorder execution logs                       │
└─────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │ Coordinated Pipeline
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. END-TO-END WORKFLOW (src/core/workflow/)                                              │
│   • Multi-Phase Pipeline: Ingest Topology → Security Audit → Architecture Synthesis →   │
│   • Living Artifact Builder: Synthesizes a standalone, zero-dependency, dark-mode        │
│     Interactive HTML5 Dashboard with search, filters & embedded Flight Recorder Replayer │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Zero-Tolerance Security Gate Compliance

To strictly fulfill the competition's mandatory security gate (*Pass/Fail*), Kei-Nexus implements five unbreakable containment walls:

| Defense Vector | Guard Engine | Enforcement Mechanism |
|---|---|---|
| **Path Traversal / Escape** | `PathGuard` | Normalizes paths and validates realpath. Hard-blocks `../`, null bytes (`\0`), and absolute path escapes (`/etc/`, `C:\`). All file I/O is jailed inside `.workspace/`. |
| **Dangerous Commands / Shell Exploit** | `CommandGuard` | Strict binary whitelist (`git`, `node`, `npm`, `ls`, `grep`, etc.). Blocks fork bombs, root deletion (`rm -rf /`), piping into interpreters (`curl \| sh`), and raw disk I/O. |
| **Credential Leakage** | `SecretRedactor` | Deep regex scrubbing against all agent logs, tool arguments, stdout/stderr, and artifacts. Strips OpenAI/Kei keys (`sk-...`), Bearer tokens, GitHub tokens, and AWS keys. |
| **SSRF (Internal Network Abuse)** | `SsrfGuard` | Validates URLs before fetching. Hard-blocks private RFC 1918 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), localhost (`127.0.0.1`), and cloud metadata (`169.254.169.254`). |
| **Prompt Injection** | `PromptShield` | Wraps all untrusted external content (file reads, web scraping) in explicit XML isolation boundaries (`<untrusted_content>`) to prevent system prompt override. |

---

## ⚡ Quickstart (Under 60 Seconds)

### 1. Prerequisites
- Node.js 20+ (ESM support)
- Active API Key from `@KeiInferenceBot`

### 2. Clone & Install
```bash
git clone https://github.com/yugha-dev/kei-nexus.git
cd kei-nexus
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and add your Kei API credentials:
```ini
KEI_BASE_URL=https://api.kei-inference.web.id/v1
KEI_API_KEY=sk-your-key-here
KEI_DEFAULT_MODEL=glm-5.3-flash
```

### 4. Run Diagnostics (Doctor)
Verify connection to Kei Inference and available models:
```bash
npm run doctor
```

### 5. Launch Interactive Web Studio Cockpit (GUI)
Start the built-in Web Studio server and interact visually via your browser:
```bash
npm run studio
```
Then open **`http://localhost:4100`** — featuring live SSE token streaming, prompt suggestions, and real-time artifact previews!

### 6. Launch Autonomous Showcase Workflows
Execute the end-to-end fullstack verification pipeline:
```bash
npm run workflow:audit
# Generates .workspace/artifacts/audit-report.html
```
Or synthesize an interactive presentation slide deck:
```bash
npm run workflow:slides
# Generates .workspace/artifacts/pitch-deck.html
```

---

## 💻 CLI Commands & Usage

Kei-Nexus includes an interactive Terminal Cockpit with real-time spinners, thought streams, tool execution badges, and token gauges.

### `run <prompt>`
Executes an autonomous ReAct agent loop for any user goal:
```bash
npx tsx src/cli/index.ts run "Research and summarize the architectural advantages of DeepSeek v4.1"
```

### `workflow audit` & `workflow slides`
Runs pre-built flagship pipelines:
```bash
# Security & architecture audit pipeline
npx tsx src/cli/index.ts workflow audit

# Interactive HTML5 presentation generator
npx tsx src/cli/index.ts workflow slides --topic "Kei-Nexus: Autonomous AI Agent Ecosystem"
```

### `studio`
Launches the embedded Web Studio web app on port 4100:
```bash
npx tsx src/cli/index.ts studio
```

### `replay [logFile]`
Inspects and replays past Flight Recorder NDJSON traces:
```bash
npx tsx src/cli/index.ts replay
```

### `doctor`
Performs live healthcheck against Kei Inference API:
```bash
npx tsx src/cli/index.ts doctor
```

---

## 👥 Multi-Agent Swarm (`AgentTeam`)

Kei-Nexus provides an adversarial multi-agent swarm in `src/core/harness/team.ts`:
1. **Architect**: Breaks down complex goals into a 3-stage tactical plan.
2. **Specialist**: Executes actions using the schema-first tool registry inside the sandboxed workspace.
3. **SecurityCritic**: Adversarially reviews the output for vulnerabilities, hallucinations, and logic flaws.
4. **Synthesizer**: Consolidates critique and execution into a final verified deliverable.

```typescript
import { AgentTeam } from './src/core/harness/team.js';

const team = new AgentTeam({ client, skills, workspace });
const result = await team.execute('Build and audit an autonomous pipeline');
```

---

## 🧪 Testing & Code Quality

Kei-Nexus enforces strict test-driven development (TDD) using **Vitest**:

```bash
# Run all unit and integration tests
npm test

# Run tests with V8 coverage report
npm run test:coverage
```

### Test Coverage Summary:
- **Test Suites:** 8 passed (100%)
- **Tests:** 47 passed (100%)
- **Statements:** 86.02%
- **Functions:** 87.17%
- **Lines:** 86.02%
- **Branches:** 70.31%

---

## 🎨 Interactive Living Artifacts (WOW Factor for Voters & Jury)

When workflows run, Kei-Nexus synthesizes self-contained, responsive, zero-dependency HTML5 applications directly into `.workspace/artifacts/`:

1. **`audit-report.html` (Living Dashboard)**:
   - Modern Tailwind CSS dark-mode cyberpunk theme.
   - Client-side real-time search & severity filter (`CRITICAL`, `HIGH`, `MEDIUM`, `INFO`).
   - Interactive KPI counters (ReAct turns, tokens, latency, security score).
   - Embedded interactive NDJSON Flight Recorder replayer with step slider.

2. **`pitch-deck.html` (Interactive Slide Deck)**:
   - Standalone HTML5 presentation deck with keyboard controls (`←` / `→` / `Space`).
   - Animated slide transitions, syntax-highlighted code blocks, and takeaway callouts.
   - Zero external build dependencies — double click to present anywhere.

---

## 📄 License

MIT License. Built for the Kei Inference AI Agent Ecosystem Challenge.
