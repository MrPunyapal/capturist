import type { CliOptions, SingleShotOptions } from "../types/index.js";

/**
 * Reads a flag value either from `--flag=value` or the next argv entry (`--flag value`).
 */
function flagValue(arg: string, args: string[], next: () => string): string {
  if (arg.includes("=")) {
    return arg.slice(arg.indexOf("=") + 1);
  }
  return next();
}

/**
 * Parses raw command-line arguments into structured options without external bloat.
 */
export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  let singleShot: SingleShotOptions | null = null;

  const readViewport = (raw: string): string => raw;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "init") {
      options.init = true;
    } else if (arg === "shot") {
      options.shot = options.shot || {};
      singleShot = options.shot;
    } else if (arg === "record") {
      options.record = options.record || {};
      singleShot = options.record;
    } else if (singleShot && (arg === "--url" || arg.startsWith("--url="))) {
      singleShot.url = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--html" || arg.startsWith("--html="))) {
      singleShot.html = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--html-file" || arg.startsWith("--html-file="))) {
      singleShot.htmlFile = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--output" || arg.startsWith("--output="))) {
      singleShot.output = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--selector" || arg.startsWith("--selector="))) {
      singleShot.selector = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--full-page" || arg === "--fullPage")) {
      singleShot.fullPage = true;
    } else if (singleShot && (arg === "--wait-for" || arg.startsWith("--wait-for="))) {
      singleShot.waitFor = flagValue(arg, args, () => args[++i]);
    } else if (singleShot && (arg === "--delay" || arg.startsWith("--delay="))) {
      singleShot.delay = parseInt(flagValue(arg, args, () => args[++i]), 10);
    } else if (singleShot && (arg === "--viewport" || arg.startsWith("--viewport="))) {
      singleShot.viewport = readViewport(flagValue(arg, args, () => args[++i]));
    } else if (singleShot && (arg === "--retina")) {
      singleShot.retina = true;
    } else if (singleShot && (arg === "--dark")) {
      singleShot.dark = true;
    } else if (singleShot && (arg === "--steps-file" || arg.startsWith("--steps-file="))) {
      singleShot.stepsFile = flagValue(arg, args, () => args[++i]);
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
    } else if (arg === "--cache") {
      options.cache = true;
    } else if (arg === "--no-cache") {
      options.noCache = true;
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
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
  \x1b[32mshot\x1b[0m                  One-off screenshot without a config file (see SHOT below)
  \x1b[32mrecord\x1b[0m                Record an interaction flow as .webm video (see RECORD below)

\x1b[1mSHOT\x1b[0m — one page, zero config
  $ capturist shot --url http://127.0.0.1:8000/dashboard --output ui.png --json --quiet

  Flags: --url <url>  --output <file>  [--selector <css>]  [--full-page]
         [--wait-for <css>]  [--delay <ms>]  [--viewport WxH]  [--retina]  [--dark]
         [--html-file <path>]  [--html "<markup>"]  plus global -u/--baseUrl and -o/--outputDir

\x1b[1mRECORD\x1b[0m — interaction flow as WebM video
  $ capturist record --url http://127.0.0.1:8000/login --output demo.webm \\
        --steps-file steps.json --viewport 1280x720 --json --quiet

  steps.json:
    { "steps": [
      { "action": "fill", "selector": "#email", "value": "taylor@example.com" },
      { "action": "type", "selector": "#password", "text": "secret" },
      { "action": "click", "selector": "#login" },
      { "action": "wait", "selector": ".dashboard" },
      { "action": "screenshot", "output": "after-login.png" }
    ] }

  Steps: goto, click, dblclick, hover, fill, type, press, scroll, wait, screenshot

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
  \x1b[33m--cache\x1b[0m                Enable incremental cache for this run
  \x1b[33m--no-cache\x1b[0m             Disable cache (recapture everything)
  \x1b[33m-f, --force\x1b[0m            Force recapture (same as --no-cache)
  \x1b[33m--verbose\x1b[0m              Enable detailed debug logs
  \x1b[33m-v, --version\x1b[0m          Show version number
  \x1b[33m-h, --help\x1b[0m             Display this help message

\x1b[1mEXAMPLES\x1b[0m
  $ \x1b[36mcapturist\x1b[0m
  $ \x1b[36mcapturist\x1b[0m --baseUrl http://localhost:5173
  $ \x1b[36mcapturist\x1b[0m --config ./configs/og.config.ts
  $ \x1b[36mcapturist\x1b[0m --cwd ./docs --config capturist.config.json --json --quiet
  $ \x1b[36mcapturist\x1b[0m --force
  $ \x1b[36mcapturist init\x1b[0m

\x1b[1mHTML / OG CARDS\x1b[0m
  Pages may use \x1b[33mhtml\x1b[0m or \x1b[33mhtmlFile\x1b[0m instead of \x1b[33mroute\x1b[0m — no baseUrl or server required.
  Ideal for static site generators that emit HTML card templates.

\x1b[1mCACHE\x1b[0m
  Set \x1b[33mcache: true\x1b[0m in config (or pass \x1b[33m--cache\x1b[0m) to skip unchanged pages.
  Fingerprints HTML (\x1b[33mhtml\x1b[0m / \x1b[33mhtmlFile\x1b[0m / static file for \x1b[33mroute\x1b[0m) + capture settings.
  Manifest default: \x1b[33m{outputDir}/.capturist-cache.json\x1b[0m
`);
}
