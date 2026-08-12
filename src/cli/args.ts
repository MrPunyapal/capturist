import type { CliOptions } from "../types/index.js";

/**
 * Parses raw command-line arguments into structured options without external bloat.
 */
export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "init") {
      options.init = true;
    } else if (arg === "--config" || arg === "-c") {
      options.config = args[++i];
    } else if (arg.startsWith("--config=")) {
      options.config = arg.split("=")[1];
    } else if (arg === "--baseUrl" || arg === "-u") {
      options.baseUrl = args[++i];
    } else if (arg.startsWith("--baseUrl=")) {
      options.baseUrl = arg.split("=")[1];
    } else if (arg === "--outputDir" || arg === "-o") {
      options.outputDir = args[++i];
    } else if (arg.startsWith("--outputDir=")) {
      options.outputDir = arg.split("=")[1];
    } else if (arg === "--concurrency") {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg.startsWith("--concurrency=")) {
      options.concurrency = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--serverDir") {
      options.serverDir = args[++i];
    } else if (arg.startsWith("--serverDir=")) {
      options.serverDir = arg.split("=")[1];
    } else if (arg === "--serverPort") {
      options.serverPort = parseInt(args[++i], 10);
    } else if (arg.startsWith("--serverPort=")) {
      options.serverPort = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--cwd") {
      options.cwd = args[++i];
    } else if (arg.startsWith("--cwd=")) {
      options.cwd = arg.split("=")[1];
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

export function printHelp(): void {
  console.log(`
\x1b[1m\x1b[36m📸 capturist\x1b[0m — Production-grade static screenshot and Open Graph generator

\x1b[1mUSAGE\x1b[0m
  $ \x1b[36mcapturist\x1b[0m [command] [options]

\x1b[1mCOMMANDS\x1b[0m
  \x1b[32minit\x1b[0m                  Scaffold a starter capturist.config.js in current directory

\x1b[1mOPTIONS\x1b[0m
  \x1b[33m-c, --config\x1b[0m <path>    Path to config file (default: capturist.config.ts|.js|.json)
  \x1b[33m-u, --baseUrl\x1b[0m <url>    Base URL override (e.g. http://localhost:3000)
  \x1b[33m-o, --outputDir\x1b[0m <dir>  Output directory override (default: public)
  \x1b[33m--concurrency\x1b[0m <n>      Number of parallel browser pages (default: 4)
  \x1b[33m--serverDir\x1b[0m <dir>      Directory for built-in static server (e.g. ./dist)
  \x1b[33m--serverPort\x1b[0m <port>    Port for built-in static server
  \x1b[33m--cwd\x1b[0m <dir>            Working directory for config and relative paths
  \x1b[33m-q, --quiet\x1b[0m            Suppress human logs (errors still print)
  \x1b[33m--json\x1b[0m                 Print machine-readable JSON summary on stdout
  \x1b[33m--dry-run\x1b[0m              Validate configuration without launching browser
  \x1b[33m--verbose\x1b[0m              Enable detailed debug logs
  \x1b[33m-v, --version\x1b[0m          Show version number
  \x1b[33m-h, --help\x1b[0m             Display this help message

\x1b[1mEXAMPLES\x1b[0m
  $ \x1b[36mcapturist\x1b[0m
  $ \x1b[36mcapturist\x1b[0m --baseUrl http://localhost:5173
  $ \x1b[36mcapturist\x1b[0m --config ./configs/og.config.ts
  $ \x1b[36mcapturist\x1b[0m --cwd ./docs --config capturist.config.json --json --quiet
  $ \x1b[36mcapturist init\x1b[0m

\x1b[1mHTML / OG CARDS\x1b[0m
  Pages may use \x1b[33mhtml\x1b[0m or \x1b[33mhtmlFile\x1b[0m instead of \x1b[33mroute\x1b[0m — no baseUrl or server required.
  Ideal for static site generators that emit HTML card templates.
`);
}
