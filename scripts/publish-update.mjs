#!/usr/bin/env node
/**
 * Packages the built web app for over-the-air delivery to installed APKs.
 *
 *   npm run build
 *   npm run updates:publish            # writes updates/latest.json + a zip
 *   npm run updates:publish -- --deploy  # ...and publishes them to Hosting
 *
 * The app reads https://<project>.web.app/latest.json (or VITE_UPDATE_BASE_URL)
 * and downloads the zip named there. Only web assets ship this way: native
 * plugins or permission changes still need a new APK.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const out = join(root, "updates");

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ is missing or empty. Run `npm run build` first.");
  process.exit(1);
}

function envValue(key) {
  const file = join(root, ".env");
  if (!existsSync(file)) return "";
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : "";
}

const pad = (value) => String(value).padStart(2, "0");
const now = new Date();
const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
  now.getUTCDate(),
)}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const version = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? stamp;

const projectId = envValue("VITE_FIREBASE_PROJECT_ID");
const baseUrl = (
  process.env.VITE_UPDATE_BASE_URL ||
  envValue("VITE_UPDATE_BASE_URL") ||
  (projectId ? `https://${projectId}.web.app` : "")
).replace(/\/+$/, "");

if (!baseUrl) {
  console.error(
    "No update base URL. Set VITE_UPDATE_BASE_URL or VITE_FIREBASE_PROJECT_ID.",
  );
  process.exit(1);
}

mkdirSync(out, { recursive: true });
const zipName = `mmt-${version}.zip`;
const zipPath = join(out, zipName);
if (existsSync(zipPath)) rmSync(zipPath);

if (process.platform === "win32") {
  const quote = (value) => value.replace(/'/g, "''");
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${quote(dist)}\\*' -DestinationPath '${quote(
        zipPath,
      )}' -Force`,
    ],
    { stdio: "inherit" },
  );
} else {
  execFileSync("zip", ["-rq", zipPath, "."], { cwd: dist, stdio: "inherit" });
}

const checksum = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
const manifest = {
  version,
  url: `${baseUrl}/${zipName}`,
  checksum,
};
writeFileSync(join(out, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nPrepared ${zipName}`);
console.log(`  version  ${version}`);
console.log(`  sha256   ${checksum}`);
console.log(`  manifest ${baseUrl}/latest.json`);

if (process.argv.includes("--deploy")) {
  console.log("\nDeploying Firebase Hosting…");
  execFileSync("npx", ["firebase", "deploy", "--only", "hosting"], {
    stdio: "inherit",
  });
} else {
  console.log("\nUpload with: npx firebase deploy --only hosting");
}
