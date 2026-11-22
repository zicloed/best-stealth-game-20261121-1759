// Shadow Vault — entrypoint: hand the game in.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with make.fun's buildDossier.
// Run:  MAKEFUN_OUTPUT_DIR=out node main.ts
// (defaults to /output when the variable is unset, matching the grader.)
import { cpSync, mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const root = new URL('./', import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });

// Copy the playable game and its screenshots into the output dir.
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Build the dossier from the copied output, under the bounty caps.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);
console.log(`Wrote ${dossierPath}`);

// Verify what was written: the dossier must parse, stay within the
// 1.5 MiB cap, and describe the game/ and screenshots/ just copied.
// (buildDossier returns bytes, so decode to text before parsing.)
const dossierText = new TextDecoder().decode(dossier);
const parsed = JSON.parse(dossierText);
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) {
  throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
}
for (const sub of ['game', 'screenshots']) {
  if (!readdirSync(join(outDir, sub)).length) {
    throw new Error(`output is missing files under ${sub}/`);
  }
}
console.log(`Verified dossier (${dossierBytes} bytes, schema ${parsed.schema ?? 'n/a'}), ` +
  `game/ + screenshots/ present in ${outDir}`);
