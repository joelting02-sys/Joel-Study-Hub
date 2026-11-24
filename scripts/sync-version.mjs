import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function syncVersion(rootDir, rawVersion) {
  const ver = String(rawVersion || '').trim().replace(/^[vV]/, '');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(ver)) {
    throw new Error(`Invalid semantic version: "${rawVersion}"`);
  }

  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = ver;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = ver;
  fs.writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`, 'utf8');

  const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
  const cargo = fs.readFileSync(cargoPath, 'utf8');
  const versionPattern = /^version\s*=\s*"[^"]+"/m;
  if (!versionPattern.test(cargo)) {
    throw new Error(`Could not find package version field in ${cargoPath}`);
  }
  const updatedCargo = cargo.replace(versionPattern, `version = "${ver}"`);
  fs.writeFileSync(cargoPath, updatedCargo, 'utf8');

  return ver;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const versionArg = process.argv[2];
  const synced = syncVersion(process.cwd(), versionArg);
  console.log(`Synced version ${synced} across package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml`);
}
