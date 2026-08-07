import { formatBytes } from "./paths.js";
import type { ScreenshotResult, RunSummary } from "../types/index.js";

// ANSI color escape sequences without external dependencies for maximum portability and speed
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
};

export class Logger {
  public verbose: boolean = false;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  banner(version = "0.1.0"): void {
    console.log(
      `\n${colors.bold}${colors.cyan}📸 snapsite${colors.reset} ${colors.dim}v${version}${colors.reset} — ${colors.gray}Deterministic static screenshot engine${colors.reset}\n`
    );
  }

  info(msg: string): void {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
  }

  success(msg: string): void {
    console.log(`${colors.green}✔${colors.reset} ${msg}`);
  }

  warn(msg: string): void {
    console.log(`${colors.yellow}▲${colors.reset} ${msg}`);
  }

  error(msg: string, err?: unknown): void {
    console.error(`${colors.red}✖ ${msg}${colors.reset}`);
    if (err && this.verbose) {
      console.error(err);
    }
  }

  debug(msg: string): void {
    if (this.verbose) {
      console.log(`${colors.dim}${colors.gray}[debug] ${msg}${colors.reset}`);
    }
  }

  logCapture(result: ScreenshotResult): void {
    const status = result.success
      ? `${colors.green}✓${colors.reset}`
      : `${colors.red}✗${colors.reset}`;

    const routeFormatted = `${colors.bold}${result.route}${colors.reset}`;
    const arrow = `${colors.dim}→${colors.reset}`;
    const outputFormatted = `${colors.cyan}${result.outputPath}${colors.reset}`;

    const dimensions = `${colors.dim}(${result.width}x${result.height})${colors.reset}`;
    const size = `${colors.yellow}${formatBytes(result.sizeBytes)}${colors.reset}`;
    const time = `${colors.gray}${result.durationMs}ms${colors.reset}`;

    if (result.success) {
      console.log(`  ${status} ${routeFormatted} ${arrow} ${outputFormatted} ${dimensions} ${size} ${time}`);
    } else {
      console.log(`  ${status} ${routeFormatted} ${arrow} ${outputFormatted} ${colors.red}FAILED${colors.reset} ${time}`);
      if (result.error) {
        console.log(`    ${colors.red}${result.error.message}${colors.reset}`);
      }
    }
  }

  summary(summary: RunSummary): void {
    const totalTimeSec = (summary.totalDurationMs / 1000).toFixed(2);
    console.log(
      `\n${colors.bold}${colors.green}Done!${colors.reset} Generated ${colors.bold}${summary.succeeded}/${summary.total}${colors.reset} screenshots in ${colors.cyan}${totalTimeSec}s${colors.reset} → ${colors.dim}${summary.outputDir}${colors.reset}\n`
    );
  }
}

export const logger = new Logger();
