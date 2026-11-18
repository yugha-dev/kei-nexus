# Sample Microservice

This is a demo microservice containing intentional, simulated vulnerability patterns designed to benchmark the Kei-Nexus AI Security & Architecture Review Agent:

1. **Hardcoded Secret**: `INTERNAL_API_TOKEN` in `server.js` (Line 10)
2. **Path Traversal**: Arbitrary file read in `/download` endpoint (Line 14)
3. **SSRF**: Unrestricted outbound HTTP POST in `/webhook` endpoint (Line 22)
4. **Command Injection**: Unsanitized shell execution in `/diagnostics/ping` (Line 35)

Run the review agent to automatically detect, verify with file evidence, and synthesize an actionable remediation roadmap:
```bash
npm run demo
```
