import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { StudyHubStorage } from '../../server/storage.ts';
import { BUILTIN_ECDICT_RECORDS } from './ecdictSeed.ts';

const rootDir = process.cwd();

test('Every Tauri invoke command in studyhubApi.ts is registered in src-tauri/src/lib.rs', () => {
  const apiSrc = fs.readFileSync(path.join(rootDir, 'src', 'api', 'studyhubApi.ts'), 'utf-8');
  const libRs = fs.readFileSync(path.join(rootDir, 'src-tauri', 'src', 'lib.rs'), 'utf-8');

  const invokedCommands = [...apiSrc.matchAll(/invoke(?:<[^>]+>)?\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(invokedCommands.length >= 20, `Expected >=20 Tauri commands, got ${invokedCommands.length}`);

  const handlerMatch = libRs.match(/tauri::generate_handler!\[([\s\S]*?)\]/);
  assert.ok(handlerMatch, 'Missing tauri::generate_handler![] in src-tauri/src/lib.rs');
  const registered = new Set(
    handlerMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  for (const cmd of invokedCommands) {
    assert.ok(registered.has(cmd), `Missing Rust #[tauri::command] in generate_handler!: ${cmd}`);
  }
});

test('Async Tauri commands in src-tauri/src/lib.rs avoid borrowed State<\'_, _> and return Result', () => {
  const libRs = fs.readFileSync(path.join(rootDir, 'src-tauri', 'src', 'lib.rs'), 'utf-8');
  const asyncCommands = [
    ...libRs.matchAll(/#\[tauri::command\]\s*async\s+fn\s+(\w+)\s*\(([\s\S]*?)\)\s*->\s*([^{]+)/g),
  ];
  assert.ok(asyncCommands.length >= 3, 'Expected at least 3 async Tauri commands');
  for (const [, name, params, ret] of asyncCommands) {
    assert.doesNotMatch(
      params,
      /State<|&/,
      `Async command ${name} must not borrow State<'_, _> or references across .await`,
    );
    assert.match(
      ret.trim(),
      /^Result</,
      `Async command ${name} must return Result<..., ...> to satisfy Tauri v2 'static future expansion`,
    );
  }
});

test('Tauri events listened by frontend are emitted by Rust backend', () => {
  const apiSrc = fs.readFileSync(path.join(rootDir, 'src', 'api', 'studyhubApi.ts'), 'utf-8');
  const libRs = fs.readFileSync(path.join(rootDir, 'src-tauri', 'src', 'lib.rs'), 'utf-8');
  const updaterRs = fs.readFileSync(path.join(rootDir, 'src-tauri', 'src', 'updater.rs'), 'utf-8');
  const rustCombined = `${libRs}\n${updaterRs}`;

  const listenedEvents = [...apiSrc.matchAll(/listen(?:<[^>]+>)?\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(listenedEvents.sort(), ['studyhub:event', 'studyhub:update-status']);

  for (const evt of listenedEvents) {
    assert.ok(rustCombined.includes(`"${evt}"`), `Rust backend must emit event: ${evt}`);
  }
});

test('Tauri v2 config, Cargo.toml, package.json versions, icons, and dictionary seed are in sync', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const tauriConf = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf-8'),
  );
  const cargoToml = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf-8');
  const cargoVerMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  assert.ok(cargoVerMatch, 'Cargo.toml must specify version');
  assert.equal(tauriConf.version, pkg.version, 'tauri.conf.json version must match package.json');
  assert.equal(cargoVerMatch[1], pkg.version, 'Cargo.toml version must match package.json');

  for (const relIcon of tauriConf.bundle.icon as string[]) {
    const absIcon = path.join(rootDir, 'src-tauri', relIcon);
    assert.equal(fs.existsSync(absIcon), true, `Missing required Tauri icon: ${relIcon}`);
    assert.ok(fs.statSync(absIcon).size > 100, `Icon file appears empty: ${relIcon}`);
  }

  const seedJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src-tauri', 'data', 'ecdict_seed.json'), 'utf-8'),
  );
  assert.equal(
    seedJson.length,
    BUILTIN_ECDICT_RECORDS.length,
    'Rust ecdict_seed.json must match TypeScript BUILTIN_ECDICT_RECORDS count',
  );
});

test('GitHub Actions CI and Windows Release workflows verify Rust tests and SHA-256 updater assets', () => {
  const ci = fs.readFileSync(path.join(rootDir, '.github', 'workflows', 'ci.yml'), 'utf-8');
  assert.match(ci, /cargo test/);
  assert.match(ci, /windows-latest/);

  const release = fs.readFileSync(
    path.join(rootDir, '.github', 'workflows', 'release-windows.yml'),
    'utf-8',
  );
  assert.match(release, /node scripts\/sync-version\.mjs/);
  assert.doesNotMatch(release, /node -e "/, 'Avoid inline node -e inside PowerShell due to quote escaping issues');
  assert.match(release, /STUDYHUB_GITHUB_REPO/);
  assert.match(release, /@tauri-apps\/cli@2 build --bundles nsis/);
  assert.match(release, /checksums\.txt/);
  assert.match(release, /make_latest:\s*true/);
  assert.match(release, /cargo test/);
});

test('scripts/sync-version.mjs cleanly updates package.json, tauri.conf.json and Cargo.toml', async () => {
  const { syncVersion } = await import('../../scripts/sync-version.mjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyhub-sync-ver-'));
  try {
    fs.mkdirSync(path.join(tmpDir, 'src-tauri'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'studyhub', version: '1.0.0' }, null, 2));
    fs.writeFileSync(
      path.join(tmpDir, 'src-tauri', 'tauri.conf.json'),
      JSON.stringify({ productName: 'StudyHub', version: '1.0.0' }, null, 2),
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src-tauri', 'Cargo.toml'),
      '[package]\nname = "studyhub"\nversion = "1.0.0"\nedition = "2021"\n',
    );

    const synced = syncVersion(tmpDir, 'v1.2.3');
    assert.equal(synced, '1.2.3');
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf8')).version, '1.2.3');
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(tmpDir, 'src-tauri', 'tauri.conf.json'), 'utf8')).version,
      '1.2.3',
    );
    assert.match(
      fs.readFileSync(path.join(tmpDir, 'src-tauri', 'Cargo.toml'), 'utf8'),
      /^version = "1\.2\.3"$/m,
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Fresh StudyHub data directory starts blank and auto-generates AGENT_GUIDE.md', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyhub-clean-'));
  const prevEnv = process.env.STUDYHUB_DATA_DIR;
  process.env.STUDYHUB_DATA_DIR = tmpDir;

  const store = new StudyHubStorage();
  try {
    assert.equal(store.readVocabFile().words.length, 0);
    assert.equal(store.listQuizzes().length, 0);
    assert.equal(store.listResults().length, 0);

    const guidePath = path.join(tmpDir, 'AGENT_GUIDE.md');
    assert.equal(fs.existsSync(guidePath), true);

    const inboxRes = store.dropInboxFile('agent_batch.json', {
      words: [{ word: 'latency', meaning_zh: '延迟', subject: 'ICT' }],
    });
    assert.equal(inboxRes.addedCount, 1);
    assert.equal(fs.existsSync(path.join(tmpDir, 'vocab_inbox', 'agent_batch.json')), false);
  } finally {
    await store.close();
    if (prevEnv === undefined) {
      delete process.env.STUDYHUB_DATA_DIR;
    } else {
      process.env.STUDYHUB_DATA_DIR = prevEnv;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
