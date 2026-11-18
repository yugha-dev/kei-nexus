import chalk from 'chalk';

export class Theme {
  public static banner(): string {
    const art = `
  ██╗  ██╗███████╗██╗    ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
  ██║ ██╔╝██╔════╝██║    ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
  █████╔╝ █████╗  ██║    ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
  ██╔═██╗ ██╔══╝  ██║    ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
  ██║  ██╗███████╗██║    ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
  ╚═╝  ╚═╝╚══════╝╚═╝    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`;

    return chalk.cyan(art) + '\n' +
      chalk.bold.hex('#06b6d4')('  ⚡ AUTONOMOUS AI AGENT ECOSYSTEM • CHALLENGE KEI INFERENCE ⚡\n') +
      chalk.dim('  ─────────────────────────────────────────────────────────────\n');
  }

  public static header(title: string): string {
    return chalk.bold.cyan(`\n═══ [ ${title} ] ═══\n`);
  }

  public static stateBadge(state: string): string {
    switch (state) {
      case 'THINKING':
        return chalk.bgCyan.black.bold(' THINKING ');
      case 'CALLING_TOOL':
        return chalk.bgYellow.black.bold(' TOOL CALL ');
      case 'EXECUTING_TOOL':
        return chalk.bgBlue.white.bold(' EXECUTE ');
      case 'REFLECTING':
        return chalk.bgMagenta.white.bold(' REFLECT ');
      case 'COMPLETED':
        return chalk.bgGreen.black.bold(' SUCCESS ');
      case 'FAILED':
        return chalk.bgRed.white.bold(' FAILED ');
      default:
        return chalk.bgGray.white.bold(` ${state} `);
    }
  }

  public static kpi(label: string, value: string | number, color = '#06b6d4'): string {
    return `${chalk.dim(label)}: ${chalk.bold.hex(color)(String(value))}`;
  }
}
