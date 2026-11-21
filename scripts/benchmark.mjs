#!/usr/bin/env bun
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function runTimed(command) {
  const output = execSync(`/usr/bin/time -l sh -c "${command}" 2>&1 || true`, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const realMatch = output.match(/([\d.]+)\s+real\s+([\d.]+)\s+user\s+([\d.]+)\s+sys/);
  const rssMatch = output.match(/(\d+)\s+maximum resident set size/);
  return {
    realSec: realMatch ? Number(realMatch[1]) : null,
    userSec: realMatch ? Number(realMatch[2]) : null,
    sysSec: realMatch ? Number(realMatch[3]) : null,
    peakRssMB: rssMatch ? Number((Number(rssMatch[1]) / (1024 * 1024)).toFixed(1)) : null,
  };
}

function walk(dir, filterFn) {
  const out = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, filterFn));
    } else if (!filterFn || filterFn(full)) {
      out.push(full);
    }
  }
  return out;
}

function measureChunks() {
  const chunks = walk(".next/static/chunks", (f) => f.endsWith(".js"));
  let totalRaw = 0;
  let totalGzip = 0;
  let maxRaw = 0;
  let maxGzip = 0;
  for (const file of chunks) {
    const buf = fs.readFileSync(file);
    const gz = zlib.gzipSync(buf).length;
    totalRaw += buf.length;
    totalGzip += gz;
    if (buf.length > maxRaw) {
      maxRaw = buf.length;
      maxGzip = gz;
    }
  }
  return {
    chunkCount: chunks.length,
    totalRawKB: Number((totalRaw / 1024).toFixed(1)),
    totalGzipKB: Number((totalGzip / 1024).toFixed(1)),
    largestChunkRawKB: Number((maxRaw / 1024).toFixed(1)),
    largestChunkGzipKB: Number((maxGzip / 1024).toFixed(1)),
  };
}

function measureStaticCode() {
  const files = [
    ...walk("app", (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
    ...walk("src", (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
  ];
  let anyCount = 0;
  let asCastCount = 0;
  let eslintDisableCount = 0;
  let useEffectCount = 0;
  let useStateCount = 0;
  let totalLines = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    totalLines += text.split("\n").length;
    anyCount += (text.match(/:\s*any\b|\bas\s+any\b/g) || []).length;
    asCastCount += (text.match(/\bas\s+(?!const\b)[A-Za-z_({\[]/g) || []).length;
    eslintDisableCount += (text.match(/eslint-disable/g) || []).length;
    useEffectCount += (text.match(/\buseEffect\s*\(/g) || []).length;
    useStateCount += (text.match(/\buseState\s*[<(]/g) || []).length;
  }

  return {
    tsFiles: files.length,
    totalLines,
    anyCount,
    asCastCount,
    eslintDisableCount,
    useEffectCount,
    useStateCount,
  };
}

async function measureServer() {
  const port = 3457;
  const proc = spawn("bun", ["run", "start", "--", "-p", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const t0 = performance.now();

  try {
    let startupMs = null;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/login`);
        if (res.ok) {
          startupMs = performance.now() - t0;
          break;
        }
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (startupMs === null) {
      throw new Error("Server did not start in time");
    }

    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const res = await fetch(`http://127.0.0.1:${port}/login`);
      await res.text();
      times.push(performance.now() - start);
    }

    const allRssKb = execSync("ps -eo pid,ppid,rss,comm", { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) => Number(parts[0]) === proc.pid || Number(parts[1]) === proc.pid)
      .reduce((acc, parts) => acc + (Number(parts[2]) || 0), 0);

    times.sort((a, b) => a - b);
    return {
      startupMs: Number(startupMs.toFixed(1)),
      loginMedianMs: Number(times[Math.floor(times.length / 2)].toFixed(2)),
      loginP95Ms: Number(times[Math.floor(times.length * 0.95)].toFixed(2)),
      serverRssMB: Number((allRssKb / 1024).toFixed(1)),
    };
  } finally {
    proc.kill("SIGTERM");
  }
}

const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
fs.rmSync(".next", { recursive: true, force: true });

const lint = runTimed("bun run lint >/dev/null");
const typecheck = runTimed("bunx next typegen >/dev/null && bunx tsc --noEmit >/dev/null");
const build = runTimed("bun run build >/dev/null");
const bundle = measureChunks();
const code = measureStaticCode();
const server = await measureServer();

console.log(
  JSON.stringify(
    {
      branch,
      timestamp: new Date().toISOString(),
      lint,
      typecheck,
      build,
      bundle,
      code,
      server,
    },
    null,
    2
  )
);
