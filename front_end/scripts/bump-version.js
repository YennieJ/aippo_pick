#!/usr/bin/env node
/**
 * 앱 표시 버전(예: 1.2.3)을 네 곳에서 한 번에 맞춘다.
 *   - app.config.js            version
 *   - ios/app.xcodeproj         MARKETING_VERSION (앱 + 위젯)
 *   - ios/app/Info.plist        CFBundleShortVersionString
 *   - android/app/build.gradle  versionName
 *
 * 빌드 번호(versionCode / CFBundleVersion)는 EAS가 원격으로 자동 증가시키므로 건드리지 않는다
 * (eas.json: appVersionSource "remote", production.autoIncrement true).
 *
 * 사용법:
 *   node scripts/bump-version.js          # 1.2.2 → 1.2.3 (patch)
 *   node scripts/bump-version.js minor    # 1.2.2 → 1.3.0
 *   node scripts/bump-version.js 1.4.0    # 지정한 버전으로
 *   node scripts/bump-version.js --print  # 현재 버전만 출력
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  config: path.join(root, 'app.config.js'),
  pbxproj: path.join(root, 'ios/app.xcodeproj/project.pbxproj'),
  plist: path.join(root, 'ios/app/Info.plist'),
  gradle: path.join(root, 'android/app/build.gradle'),
};

function currentVersion() {
  const m = fs.readFileSync(files.config, 'utf8').match(/^\s*version:\s*"(\d+\.\d+\.\d+)"/m);
  if (!m) throw new Error('app.config.js 에서 version 을 찾지 못했습니다.');
  return m[1];
}

function nextVersion(cur, arg) {
  if (/^\d+\.\d+\.\d+$/.test(arg || '')) return arg;
  const [maj, min, pat] = cur.split('.').map(Number);
  if (arg === 'major') return `${maj + 1}.0.0`;
  if (arg === 'minor') return `${maj}.${min + 1}.0`;
  if (!arg || arg === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`알 수 없는 인자: ${arg} (patch | minor | major | x.y.z)`);
}

function replaceIn(file, regex, replacement, label) {
  const before = fs.readFileSync(file, 'utf8');
  if (!regex.test(before)) throw new Error(`${label}: 바꿀 곳을 찾지 못했습니다 (${path.relative(root, file)})`);
  fs.writeFileSync(file, before.replace(regex, replacement));
}

function main() {
  const arg = process.argv[2];
  const cur = currentVersion();
  if (arg === '--print') {
    process.stdout.write(cur + '\n');
    return;
  }
  const next = nextVersion(cur, arg);

  replaceIn(files.config, /^(\s*version:\s*")\d+\.\d+\.\d+(")/m, `$1${next}$2`, 'app.config.js');
  replaceIn(files.pbxproj, /MARKETING_VERSION = [0-9.]+;/g, `MARKETING_VERSION = ${next};`, 'project.pbxproj');
  replaceIn(
    files.plist,
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[0-9.]+(<\/string>)/,
    `$1${next}$2`,
    'Info.plist',
  );
  replaceIn(files.gradle, /(versionName\s+")[^"]+(")/, `$1${next}$2`, 'build.gradle');

  process.stdout.write(`${cur} → ${next}\n`);
}

try {
  main();
} catch (e) {
  console.error(`[bump-version] ${e.message}`);
  process.exit(1);
}
