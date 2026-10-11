import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
const roundsArg = process.argv.find(arg => arg.startsWith('--rounds='));
const rounds = roundsArg ? Number(roundsArg.split('=')[1]) : 1;
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5) throw new Error('rounds must be 1–5');
const suites = ['auth', 'gym', 'gym-live', 'package', 'package-live', 'payment-demo', 'pt-workflow', 'customer-calendar', 'reports', 'consultation', 'gallery', 'trainer-profile', 'reviews', 'review-moderation', 'admin-users', 'security', 'qa02'];
await mkdir(`${cwd}.qa-artifacts`, { recursive: true });
const results = [];
for (let round = 1; round <= rounds; round++) {
  for (const suite of suites) {
    console.log(`Round ${round}/${rounds}: ${suite}`);
    const started = Date.now();
    let output = '';
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, 'test', '--config', `playwright.${suite}.config.ts`, '--retries=0', '--reporter=list'], { cwd, env: { ...process.env, FORCE_COLOR: '0' } });
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.on('error', reject);
      child.on('close', resolve);
    });
    await writeFile(`${cwd}.qa-artifacts/${suite}-round-${round}.log`, output);
    results.push({ suite, round, code, seconds: Math.round((Date.now() - started) / 1000), result: output.match(/\d+ passed[^\n]*/)?.[0] });
    await writeFile(`${cwd}.qa-artifacts/browser-results.json`, JSON.stringify(results, null, 2));
    if (code !== 0) { console.error(output.slice(-10000)); process.exit(1); }
    console.log(results.at(-1).result || 'Passed');
  }
}
console.log(`Passed ${suites.length} suites × ${rounds} rounds without retries.`);
