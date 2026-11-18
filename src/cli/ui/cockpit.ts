import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { AgentStepEvent } from '../../core/harness/state.js';
import { Theme } from './theme.js';

/**
 * Cockpit provides an interactive terminal dashboard rendering agent thoughts,
 * tool calls, token usage gauges, and visual progress.
 */
export class Cockpit {
  private spinner: Ora;
  private currentTurn = 0;

  constructor() {
    this.spinner = ora({
      text: 'Initializing Kei-Nexus Cockpit...',
      color: 'cyan',
    });
  }

  public start(message = 'Agent initialized'): void {
    this.spinner.start(chalk.cyan(message));
  }

  public handleStep(event: AgentStepEvent): void {
    this.currentTurn = event.turnIndex;
    const badge = Theme.stateBadge(event.state);
    const msg = event.message || '';

    this.spinner.text = `${badge} ${chalk.dim(`(Turn ${event.turnIndex})`)} ${msg}`;

    if (event.state === 'CALLING_TOOL' && event.data) {
      const data = event.data as { tool: string; args: unknown };
      this.spinner.stopAndPersist({
        symbol: chalk.yellow('⚡'),
        text: `${chalk.yellow.bold(data.tool)} ${chalk.dim(JSON.stringify(data.args || {}).slice(0, 80))}`,
      });
      this.spinner.start();
    } else if (event.state === 'COMPLETED') {
      this.spinner.succeed(chalk.green.bold('Goal achieved successfully!'));
    } else if (event.state === 'FAILED') {
      this.spinner.fail(chalk.red.bold(`Agent stopped: ${msg}`));
    }
  }

  public streamReasoning(thoughtFragment: string): void {
    // Optionally display brief thought fragments
    process.stdout.write(chalk.dim.italic(thoughtFragment));
  }

  public stop(): void {
    if (this.spinner.isSpinning) {
      this.spinner.stop();
    }
  }

  public summary(turns: number, tokens: { totalTokens: number; promptTokens: number; completionTokens: number }, artifactPath?: string): void {
    console.log('\n' + chalk.dim('─'.repeat(60)));
    console.log(chalk.bold.cyan('  🏁 EXECUTION COCKPIT SUMMARY'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(`  ${Theme.kpi('Total Turns', turns)}`);
    console.log(`  ${Theme.kpi('Total Tokens', tokens.totalTokens.toLocaleString(), '#a855f7')}`);
    console.log(`  ${Theme.kpi('Prompt / Completion', `${tokens.promptTokens} / ${tokens.completionTokens}`, '#ec4899')}`);
    if (artifactPath) {
      console.log(`  ${Theme.kpi('Living Artifact', artifactPath, '#10b981')}`);
      console.log(chalk.green.bold(`\n  👉 Open in your browser: file://${artifactPath}`));
    }
    console.log(chalk.dim('─'.repeat(60)) + '\n');
  }
}
