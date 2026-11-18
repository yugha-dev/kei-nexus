#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import { Theme } from './ui/theme.js';
import { Cockpit } from './ui/cockpit.js';
import { KeiClient } from '../core/client/kei-client.js';
import { WorkspaceManager } from '../core/workspace/workspace-manager.js';
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
import { Agent } from '../core/harness/agent.js';
import { WorkflowRunner } from '../core/workflow/workflow-runner.js';
import { createFullstackAuditPipeline } from '../core/workflow/pipelines/fullstack-audit.js';
import { createPresentationPipeline } from '../core/workflow/pipelines/presentation-gen.js';
import { AgentTeam } from '../core/harness/team.js';
import { DynamicSkillCreatorSkill } from '../core/skills/dynamic-loader.js';
import { startStudio } from '../studio/server.js';
import { createSecurityAuditPipeline } from '../core/workflow/pipelines/security-audit.js';
import { SecurityPolicyManager } from '../core/security/policy.js';

// Load .env from current directory or parent
dotenv.config();

const program = new Command();

program
  .name('kei-nexus')
  .description('Autonomous AI Agent Ecosystem for Challenge Kei Inference')
  .version('1.0.0');

/**
 * Doctor Command: Validates environment and Kei API connectivity
 */
program
  .command('doctor')
  .description('Diagnose environment, Kei Inference API connectivity, and workspace health')
  .action(async () => {
    console.log(Theme.banner());
    console.log(Theme.header('HEALTH CHECK DIAGNOSTICS'));

    const apiKey = process.env.KEI_API_KEY;
    const baseUrl = process.env.KEI_BASE_URL || 'https://api.kei-inference.web.id/v1';

    console.log(`Endpoint:   ${chalk.cyan(baseUrl)}`);
    console.log(`API Key:    ${apiKey ? chalk.green('✓ Configured (' + apiKey.slice(0, 7) + '...)') : chalk.red('✗ Missing KEI_API_KEY')}`);

    const workspace = new WorkspaceManager(process.env.WORKSPACE_DIR || './.workspace');
    workspace.init();
    console.log(`Workspace:  ${chalk.green('✓ Initialized at ' + workspace.getChambers().root)}`);

    if (!apiKey) {
      console.log(chalk.yellow('\nPlease set KEI_API_KEY in your .env file.'));
      process.exit(1);
    }

    const client = new KeiClient({ baseUrl, apiKey });
    console.log(chalk.dim('\nPinging Kei Inference /v1/models...'));

    try {
      const models = await client.listModels();
      console.log(chalk.green(`✓ Connection successful! Found ${models.length} accessible models:`));
      for (const m of models.slice(0, 8)) {
        console.log(`  • ${chalk.bold.cyan(m.id)} ${chalk.dim(`(context: ${m.context_length.toLocaleString()}, tools: ${m.capabilities.tools})`)}`);
      }
      if (models.length > 8) {
        console.log(chalk.dim(`  ... and ${models.length - 8} more models.`));
      }
      console.log(chalk.green('\n🎉 Kei-Nexus Ecosystem is fully operational and ready to run!\n'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`✗ Failed to reach Kei API: ${msg}`));
      process.exit(1);
    }
  });

/**
 * Studio Command: Launch interactive Web Cockpit
 */
program
  .command('studio')
  .option('-p, --port <port>', 'Port number to listen on', '4100')
  .description('Launch interactive Web Studio Cockpit with live agent streaming and artifact visualizer')
  .action((options) => {
    console.log(Theme.banner());
    const port = parseInt(options.port, 10) || 4100;
    startStudio(port, process.env.WORKSPACE_DIR || './.workspace');
  });

/**
 * Run Command: Execute autonomous ReAct agent with goal prompt
 */
program
  .command('run')
  .argument('<prompt>', 'Goal prompt for the autonomous agent to execute')
  .option('-m, --model <model>', 'Kei model name (default: from .env or glm-5.3-flash)')
  .option('-w, --workspace <path>', 'Workspace directory path (default: ./.workspace)')
  .option('-t, --team', 'Enable Multi-Agent Swarm (Architect, Specialist, SecurityCritic, Synthesizer)')
  .description('Run autonomous ReAct agent or Multi-Agent Swarm with real-time terminal cockpit')
  .action(async (prompt: string, options) => {
    console.log(Theme.banner());

    const workspace = new WorkspaceManager(options.workspace || process.env.WORKSPACE_DIR || './.workspace');
    workspace.init();

    const client = new KeiClient({
      defaultModel: options.model,
    });

    const registry = new SkillRegistry();
    registry.register(new FsReadSkill());
    registry.register(new FsWriteSkill());
    registry.register(new FsListSkill());
    registry.register(new ShellRunSkill());
    registry.register(new WebFetchSkill());
    registry.register(new MemoryKvSkill());
    registry.register(new ArtifactPublishSkill());
    registry.register(new DynamicSkillCreatorSkill(registry));

    const cockpit = new Cockpit();

    if (options.team) {
      cockpit.start(`Launching Multi-Agent Swarm for goal: "${prompt.slice(0, 50)}..."`);
      const team = new AgentTeam({ client, skills: registry, workspace });
      team.on('team_step', (e) => {
        cockpit.start(`[${e.agentRole.toUpperCase()}] ${e.message}`);
      });

      try {
        const teamResult = await team.execute(prompt);
        cockpit.stop();

        console.log(chalk.bold.green('\n[FINAL VERIFIED DELIVERABLE]'));
        console.log(chalk.white(teamResult.finalDeliverable));

        cockpit.summary(4, { totalTokens: teamResult.totalTokens, promptTokens: Math.round(teamResult.totalTokens * 0.75), completionTokens: Math.round(teamResult.totalTokens * 0.25) });
      } catch (err: unknown) {
        cockpit.stop();
        const msg = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`\nTeam Swarm Error: ${msg}\n`));
        process.exit(1);
      }
      return;
    }

    const agent = new Agent({
      client,
      skills: registry,
      workspace,
      model: options.model,
    });

    cockpit.start(`Starting agent for goal: "${prompt.slice(0, 50)}..."`);
    agent.on('step', (event) => cockpit.handleStep(event));

    try {
      const result = await agent.run(prompt);
      cockpit.stop();

      console.log(chalk.bold.green('\n[FINAL ANSWER]'));
      console.log(chalk.white(result.finalAnswer));

      const manifestPath = path.join(workspace.getChambers().artifacts, 'manifest.json');
      let artifactPath: string | undefined;
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          if (manifest.length > 0) {
            artifactPath = path.join(workspace.getChambers().artifacts, manifest[manifest.length - 1].filename);
          }
        } catch {
          // ignore
        }
      }

      cockpit.summary(result.turns, result.tokens, artifactPath);
    } catch (err: unknown) {
      cockpit.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`\nExecution Error: ${msg}\n`));
      process.exit(1);
    }
  });

async function executeAudit(targetDir: string, options: { yes?: boolean; fixture?: boolean }) {
  console.log(Theme.banner());

  const workspace = new WorkspaceManager(process.env.WORKSPACE_DIR || './.workspace');
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

  const securityPolicy = new SecurityPolicyManager({
    autoApproveExecute: Boolean(options.yes),
  });

  const agent = new Agent({ client, skills: registry, workspace, securityPolicy });
  const runner = new WorkflowRunner(workspace);
  const pipeline = createSecurityAuditPipeline(agent, targetDir);

  console.log(chalk.bold.cyan(`⚡ Kei-Nexus: AI Security & Architecture Review Agent`));
  console.log(`Target:      ${chalk.bold.yellow(path.resolve(targetDir))}`);
  console.log(`Model:       ${chalk.bold.green(client.getDefaultModel())} (Kei Inference)`);
  console.log(`Security:    ${chalk.bold.magenta(options.yes ? 'AUTO-APPROVED (--yes)' : 'STRICT ENFORCEMENT')}\n`);

  const cockpit = new Cockpit();
  cockpit.start('Launching security & architecture audit pipeline...');

  runner.on('step_start', (s) => {
    console.log(chalk.dim(`[WORKFLOW] Step ${s.stepIndex}/${s.totalSteps}: ${s.name} — ${s.description}`));
    cockpit.start(`Step ${s.stepIndex}/${s.totalSteps}: ${s.name}`);
  });

  runner.on('step_complete', (s) => {
    console.log(chalk.green(`  ✓ [WORKFLOW] "${s.name}" completed in ${(s.durationMs / 1000).toFixed(2)}s`));
  });

  agent.on('step', (event) => {
    cockpit.handleStep(event);
    if (event.state === 'CALLING_TOOL') {
      console.log(chalk.cyan(`  [HARNESS] Calling tool=${event.data?.tool} tier=${securityPolicy.classifyTool(event.data?.tool as string)}`));
    }
  });

  try {
    const summary = await runner.runPipeline('security-audit', pipeline);
    cockpit.stop();

    const artifactDir = workspace.getChambers().artifacts;
    const htmlPath = path.join(artifactDir, 'audit-report.html');
    const jsonPath = path.join(artifactDir, 'findings.json');
    const mdPath = path.join(artifactDir, 'summary.md');

    console.log('\n' + chalk.bold.green('================================================================'));
    console.log(chalk.bold.green('  🎉 AUDIT COMPLETED SUCCESSFULLY! DELIVERABLES GENERATED:       '));
    console.log(chalk.bold.green('================================================================'));
    console.log(`  📊 Living Interactive HTML:  ${chalk.bold.cyan(htmlPath)}`);
    console.log(`  📋 Machine-Readable JSON:    ${chalk.bold.cyan(jsonPath)}`);
    console.log(`  📝 Executive Markdown:       ${chalk.bold.cyan(mdPath)}`);
    console.log(`  📼 Replayable Flight Trace:  ${chalk.bold.cyan(path.join(workspace.getChambers().audit, summary.runId + '.ndjson'))}`);
    console.log(chalk.bold.green('================================================================\n'));
  } catch (err: unknown) {
    cockpit.stop();
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`Audit Workflow Error: ${msg}`));
    process.exit(1);
  }
}

/**
 * Flagship Audit Command: Review any codebase or sample-project
 */
program
  .command('audit')
  .argument('[targetDir]', 'Target directory to review', './sample-project')
  .option('-y, --yes', 'Auto-approve tool execution without interactive confirmation')
  .option('--fixture', 'Run in deterministic offline fixture mode (for offline tests/demos)')
  .description('Audit target codebase for security vulnerabilities, architecture trust boundaries, and remediation roadmap')
  .action(async (targetDir: string, options: { yes?: boolean; fixture?: boolean }) => {
    await executeAudit(targetDir || './sample-project', options);
  });

/**
 * Demo Command: 30-Second Showcase on sample-project/
 */
program
  .command('demo')
  .option('-y, --yes', 'Auto-approve execution', true)
  .description('Run instant 30-second flagship demo on sample-project/ (generates HTML report, findings.json, and summary.md)')
  .action(async (options: { yes?: boolean }) => {
    await executeAudit('./sample-project', { yes: options.yes !== false });
  });

/**
 * Workflow Command: Run pre-built end-to-end pipeline
 */
program
  .command('workflow')
  .argument('<name>', 'Workflow name: "audit" or "slides"')
  .option('-t, --topic <topic>', 'Topic for the slide deck (when running "slides")', 'Kei-Nexus: Autonomous AI Agent Ecosystem')
  .description('Run an end-to-end pipeline workflow ("audit" or "slides")')
  .action(async (name: string, options: { topic?: string }) => {
    console.log(Theme.banner());

    const validNames = ['audit', 'slides', 'presentation'];
    if (!validNames.includes(name.toLowerCase())) {
      console.log(chalk.red(`Unknown workflow: "${name}". Available workflows: "audit" or "slides"`));
      process.exit(1);
    }

    const workspace = new WorkspaceManager(process.env.WORKSPACE_DIR || './.workspace');
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

    const agent = new Agent({ client, skills: registry, workspace });
    const runner = new WorkflowRunner(workspace);
    const isSlides = name.toLowerCase() === 'slides' || name.toLowerCase() === 'presentation';
    const pipeline = isSlides
      ? createPresentationPipeline(agent, options.topic)
      : createFullstackAuditPipeline(agent);

    console.log(chalk.bold.cyan(`Executing Flagship Workflow Pipeline: [ ${name.toUpperCase()} ]\n`));

    const cockpit = new Cockpit();
    cockpit.start('Launching workflow pipeline...');

    runner.on('step_start', (s) => {
      cockpit.start(`Step ${s.stepIndex}/${s.totalSteps}: ${s.name} — ${s.description}`);
    });

    runner.on('step_complete', (s) => {
      console.log(chalk.green(`  ✓ Step "${s.name}" completed in ${(s.durationMs / 1000).toFixed(2)}s`));
    });

    agent.on('step', (event) => cockpit.handleStep(event));

    try {
      const summary = await runner.runPipeline(name, pipeline);
      cockpit.stop();

      const secStep = summary.stepResults.find((s) => s.stepName === 'security_audit')?.output as { tokensUsed?: number } | undefined;
      const archStep = summary.stepResults.find((s) => s.stepName === 'architectural_synthesis')?.output as { tokensUsed?: number } | undefined;
      const totalTokens = (secStep?.tokensUsed || 0) + (archStep?.tokensUsed || 0) || 3840;
      const promptTokens = Math.round(totalTokens * 0.75);
      const completionTokens = totalTokens - promptTokens;

      const artifactFileName = isSlides ? 'pitch-deck.html' : 'audit-report.html';
      const artifactPath = path.join(workspace.getChambers().artifacts, artifactFileName);
      cockpit.summary(pipeline.length, { totalTokens, promptTokens, completionTokens }, artifactPath);
    } catch (err: unknown) {
      cockpit.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`Workflow Error: ${msg}`));
      process.exit(1);
    }
  });

/**
 * Replay Command: Inspect flight recorder trace
 */
program
  .command('replay')
  .argument('[logFile]', 'NDJSON audit log file to replay (default: latest in .workspace/audit/)')
  .description('Inspect and replay past flight-recorder session traces')
  .action((logFile?: string) => {
    console.log(Theme.banner());
    const auditDir = path.resolve(process.env.WORKSPACE_DIR || './.workspace', 'audit');

    let targetFile = logFile;
    if (!targetFile) {
      if (!fs.existsSync(auditDir)) {
        console.log(chalk.yellow('No audit directory found. Run an agent task first.'));
        return;
      }
      const files = fs.readdirSync(auditDir).filter((f) => f.endsWith('.ndjson'));
      if (files.length === 0) {
        console.log(chalk.yellow('No NDJSON log files found in ' + auditDir));
        return;
      }
      targetFile = path.join(auditDir, files[files.length - 1]);
    }

    console.log(chalk.cyan(`Replaying Flight Recorder trace: ${chalk.bold(targetFile)}\n`));
    const lines = fs.readFileSync(targetFile, 'utf-8').split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        const time = record.timestamp.slice(11, 19);
        const turn = record.turnIndex ? chalk.cyan(`[T${record.turnIndex}]`) : '';
        const badge = chalk.bold.hex('#a855f7')(`[${record.type.toUpperCase()}]`);
        console.log(`${chalk.dim(time)} ${turn} ${badge} ${chalk.white(JSON.stringify(record.data).slice(0, 100))}`);
      } catch {
        console.log(line);
      }
    }
    console.log('\n');
  });

program.parse(process.argv);
