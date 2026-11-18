# ⚡ Kei-Nexus: AI Security & Architecture Review Agent

[![CI & Security Gate](https://github.com/yugha-dev/kei-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/yugha-dev/kei-nexus/actions)
[![Security Gate: 48 Checks Passed](https://img.shields.io/badge/Security%20Gate-48%20Checks%20Passed-emerald?logo=shield)](tests/unit/security-regression.test.ts)
[![Tests: 97 Passed](https://img.shields.io/badge/Vitest-97%20Passed%20(100%25)-green?logo=vitest)](tests/unit/)
[![Coverage: 85%](https://img.shields.io/badge/Coverage-85%25-brightgreen)](tests/unit/)
[![Provider: Kei Inference](https://img.shields.io/badge/Provider-Kei%20Inference-cyan)](https://api.kei-inference.web.id)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

> **Kei-Nexus** adalah AI Security & Architecture Review Agent otonom yang mentransformasi repositori atau project brief menjadi **audit keamanan mendalam, pemetaan batas kepercayaan arsitektur (trust boundaries), dan roadmap perbaikan prioritas yang dapat dieksekusi**.  
> Dibangun khusus untuk **CHALLENGE KEI INFERENCE — AI AGENT ECOSYSTEM** ditenagai oleh model reasoning `glm-5.3-flash` & `deepseek-v4.1-flash`.

---

## ⚡ Jalankan Demo dalam 30 Detik

Anda dapat mendemokan dan mereview proyek contoh ([`sample-project/`](sample-project/)) secara instan:

### Opsi 1: Satu Baris Perintah (Rekomendasi)
```bash
git clone https://github.com/yugha-dev/kei-nexus.git && cd kei-nexus && ./setup.sh
```
*Untuk pengguna Windows PowerShell:*
```powershell
git clone https://github.com/yugha-dev/kei-nexus.git; cd kei-nexus; .\setup.ps1
```
> Installer interaktif ini otomatis memeriksa dependensi, meminta API key Kei Anda, menjalankan diagnosa koneksi, dan langsung memicu audit demo!

### Opsi 2: Command Mandiri
```bash
# 1. Install dependencies
npm install

# 2. Jalankan Flagship AI Review Demo
npm run demo
```
Output instan akan langsung terbit ke folder `.workspace/artifacts/` dan siap dibuka di browser!

---

## 📦 Contoh Input → Proses → Output Nyata

Semua hasil eksekusi nyata dari pipeline review telah disimpan dan dapat diinspeksi langsung di folder [`examples/demo-run/`](examples/demo-run/):

| File Deliverable | Format | Fungsi & Deskripsi |
|---|---|---|
| [`examples/demo-run/audit-report.html`](examples/demo-run/audit-report.html) | **Living HTML5** | Dashboard interaktif dark-mode mandiri (zero external CDN dependency) dilengkapi filter severity instan, diagram batas kepercayaan, matriks 48 security checks, dan pemutar riwayat Flight Recorder. |
| [`examples/demo-run/findings.json`](examples/demo-run/findings.json) | **JSON Schema** | Output terstruktur machine-readable divalidasi oleh Zod Schema, memuat detail file, nomor baris kode, potongan snippet, status verifikasi disk, dan skor evaluasi. |
| [`examples/demo-run/summary.md`](examples/demo-run/summary.md) | **Markdown** | Ringkasan eksekutif untuk pimpinan teknis dengan rincian temuan dan roadmap perbaikan terfokus. |
| [`examples/demo-run/trace.ndjson`](examples/demo-run/trace.ndjson) | **NDJSON** | Rekaman Flight Recorder yang merekam setiap pemanggilan tool, input/output hash, dan token usage secara transparan. |

---

## 🏛️ Arsitektur & Empat Pilar Wajib Kompetisi

Kei-Nexus mengimplementasikan keempat pilar kompetisi secara disiplin dan terstruktur:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   KEI INFERENCE API                                      │
│                  (https://api.kei-inference.web.id/v1 • glm-5.3-flash)                    │
└───────────────────────────────────────────▲──────────────────────────────────────────────┘
                                            │ SSE Streaming & Tool Calls
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HARNESS ENGINE (src/core/harness/)                                                   │
│   • ReAct Loop FSM: IDLE → THINKING → CALLING_TOOL → EXECUTING → REFLECTING → COMPLETED  │
│   • LoopGuard: Mencegah infinite loop dan repetisi tool berulang                         │
│   • TokenBudget: Melacak prompt, completion, dan reasoning tokens secara real-time       │
│   • Multi-Agent Coordination: Architect, SecurityAnalyst, EvidenceVerifier, Synthesizer │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Dispatches Actions via SecurityPolicy
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. MODULAR SKILLS & APPROVAL POLICY (src/core/skills/ & src/core/security/)             │
│   • Tiered Approval Engine:                                                              │
│       - READ_ONLY (Auto-Allowed)       : fs_read, fs_list, web_fetch                     │
│       - WRITE_WORKSPACE (Sandboxed)   : fs_write, memory_kv, artifact_publish           │
│       - EXECUTE (Approval Required)   : shell_run (Allowlist binary, Anti-chaining)     │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Sandboxed Jailed Operations
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. FOUR-CHAMBER WORKSPACE (.workspace/)                                                  │
│   • scratchpad/ : Draf pemindaian AST sementara dan catatan agen                         │
│   • memory/     : State persisten antar sesi (KV store & tag index)                      │
│   • artifacts/  : Deliverables produksi (audit-report.html, findings.json, summary.md)   │
│   • audit/      : Rekaman jejak audit NDJSON yang tidak dapat diubah (Flight Recorder)   │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Pipeline Orchestration
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. END-TO-END WORKFLOW & EVALUATOR (src/core/workflow/)                                  │
│   • 4-Phase Pipeline: Ingest Topology → Vulnerability Scan → Evidence Verification →     │
│                       Synthesize & Publish Living HTML Report                            │
│   • Deterministic Evaluator: Memverifikasi bukti kode nyata di disk & cegah halusinasi   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Bukti Keamanan: Security Gate Evidence (48 Checks Passed)

Untuk menjamin kelolosan mutlak pada gerbang keamanan (*Pass/Fail Gate*), Kei-Nexus dilengkapi dengan rangkaian uji regresi otomatis sebanyak **48 security checks** yang dijalankan di CI:

| Vektor Serangan | Komponen Penjaga | Bukti Uji CI & Mekanisme Pertahanan | Status |
|---|---|---|---|
| **Path Traversal (`../`)** | `PathGuard` | Memblokir `../`, `../../../../etc/passwd`, dan mixed slash traversal. | **PASS** |
| **Windows Traversal** | `PathGuard` | Memblokir `..\..\windows\win.ini` dan `C:\Windows` drive escape di semua platform. | **PASS** |
| **Null Byte Injection** | `PathGuard` | Memeriksa dan membatalkan eksekusi jika terdapat `\0` pada path. | **PASS** |
| **Symlink Workspace Escape** | `PathGuard` | Memvalidasi `realpath` ancestor terdekat agar tidak melompat keluar workspace root. | **PASS** |
| **Command Injection (Chaining)** | `CommandGuard` | Memblokir operator chaining shell: `;`, `&&`, `||`, `|`, `` ` ``, `$()`, dan `\n`. | **PASS** |
| **Destructive Commands** | `CommandGuard` | Memblokir `rm -rf /`, `mkfs`, `dd if=/dev/zero`, dan fork bomb `:(){ :|:& };:`. | **PASS** |
| **Inline Code Eval** | `CommandGuard` | Memblokir `node -e`, `node --eval`, dan `node -p`. | **PASS** |
| **SSRF: Loopback & Localhost** | `SsrfGuard` | Memblokir `127.0.0.1`, `localhost`, `0.0.0.0`, dan `::1`. | **PASS** |
| **SSRF: Private IP (RFC 1918)** | `SsrfGuard` | Memblokir IP internal `10.0.0.0/8`, `172.16.0.0/12`, dan `192.168.0.0/16`. | **PASS** |
| **SSRF: Cloud Metadata** | `SsrfGuard` | Memblokir `169.254.169.254` (AWS, GCP, Azure instance metadata). | **PASS** |
| **Protokol Berbahaya** | `SsrfGuard` | Membatasi skema URL hanya untuk `http:` dan `https:`, memblokir `file://` dan `ftp://`. | **PASS** |
| **Kebocoran Kredensial / Token** | `SecretRedactor` | Regex sanitizer otomatis menyensor kunci Kei `sk-*`, GitHub PAT `ghp_*`, dan AWS keys. | **PASS** |
| **Prompt Injection Boundary** | `PromptShield` | Membungkus input eksternal dalam delimiter XML `<untrusted_content>` dan meng-escape tag penutup. | **PASS** |
| **Tiered Tool Approval** | `SecurityPolicyManager` | Memblokir eksekusi tool berisiko tinggi tanpa persetujuan eksplisit (`--yes`). | **PASS** |

Verifikasi mandiri test suite keamanan:
```bash
npx vitest run tests/unit/security-regression.test.ts
```

---

## ⚡ Bukti Integrasi Model Kei Inference

Kei-Nexus terhubung secara native ke endpoint resmi Kei Inference:
- **Base URL:** `https://api.kei-inference.web.id/v1`
- **Model Default:** `glm-5.3-flash` (Fast, Tool Calling, 1M Context Window)
- **Model Reasoning:** `deepseek-v4.1-flash` (Deep Reasoning)
- **Protokol:** Native Server-Sent Events (SSE) stream parser dengan akumulasi tool calls dan token usage.

Setiap report yang dihasilkan menyertakan bukti kriptografis integritas:
- `provider`: Kei Inference
- `model`: `glm-5.3-flash`
- `inputHash`: SHA-256 digest dari kode target yang dianalisis
- `outputHash`: SHA-256 digest dari daftar temuan yang diverifikasi
- `secretLeakage`: ZERO DETECTED

Konfigurasi `.env`:
```ini
KEI_BASE_URL=https://api.kei-inference.web.id/v1
KEI_API_KEY=sk-your-key-here
KEI_DEFAULT_MODEL=glm-5.3-flash
```

---

## 👥 Koordinasi Multi-Agent (Kontrak Verifikasi Bukti)

Untuk mencegah agen berhalusinasi atau mencantumkan klaim kosong, Kei-Nexus membagi proses menjadi 4 peran dengan batas tanggung jawab yang ketat:

1. **Lead Architect**: Memetakan topologi repositori, menginventarisasi package dependencies, dan mengidentifikasi batas kepercayaan (trust boundaries).
2. **Security Analyst**: Memindai file source code untuk mendeteksi kandidat kerentanan (file, baris, cuplikan kode, severity).
3. **Evidence Verifier**: Membaca file fisik di disk secara independen. Jika nomor baris atau cuplikan kode tidak cocok dengan kode sumber asli, temuan tersebut **langsung ditolak**.
4. **Synthesizer**: Mengompilasi hanya temuan yang lolos verifikasi bukti menjadi roadmap perbaikan, matriks risiko, dan dashboard HTML interaktif.

> *"Agen dilarang memasukkan klaim kerentanan ke laporan final sebelum lolos verifikasi bukti (Evidence Verifier) terhadap kode fisik di disk."*

---

## 🧪 Pengujian & Kualitas Kode (TDD)

Proyek ini dibangun dengan Test-Driven Development (TDD) menggunakan **Vitest**:

```bash
# Jalankan seluruh test suite (97 tests)
npm test

# Jalankan pengujian dengan laporan coverage V8
npm run test:coverage
```

### Ringkasan Hasil Pengujian:
- **Total Test Files:** 10 passed (100%)
- **Total Tests:** 97 passed (100%)
- **Statements Coverage:** 84.68% *(Threshold: 80%)*
- **Functions Coverage:** 89.76% *(Threshold: 80%)*
- **Lines Coverage:** 84.68% *(Threshold: 80%)*

---

## 💻 Panduan CLI Command

Kei-Nexus menyediakan perintah yang intuitif:

### 1. `npm run demo` / `npx tsx src/cli/index.ts demo`
Menjalankan audit 30 detik pada proyek benchmark `sample-project/`.

### 2. `npx tsx src/cli/index.ts audit [folderPath]`
Menjalankan audit keamanan & arsitektur pada folder proyek apa pun:
```bash
npx tsx src/cli/index.ts audit ./my-express-app --yes
```

### 3. `npm run studio`
Membuka antarmuka visual Web Studio GUI di `http://localhost:4100`.

### 4. `npm run doctor`
Mengetes konektivitas dan autentikasi ke endpoint Kei Inference.

### 5. `npx tsx src/cli/index.ts replay [logFile]`
Memutar ulang jejak audit Flight Recorder NDJSON di terminal.

---

## ⚠️ Batasan & Scope (Limitations)

1. **Static Analysis & Heuristics**: Agen berfokus pada audit statis kode sumber dan arsitektur; agen tidak melakukan eksploitasi aktif (*no dynamic pentesting / payload firing*).
2. **Offline vs Live Mode**: Jika API key Kei tidak tersedia atau environment berada di sandbox tanpa internet, sistem secara deterministik menggunakan fallback AST rule-checker untuk tetap memverifikasi evidence dan mempublikasikan artefak.
3. **Execution Sandbox**: Seluruh penulisan file dibatasi di dalam folder `.workspace/` demi integritas sistem host.

---

## 📄 Lisensi

MIT License. Dibuat untuk kompetisi resmi **Challenge Kei Inference — AI Agent Ecosystem**.
