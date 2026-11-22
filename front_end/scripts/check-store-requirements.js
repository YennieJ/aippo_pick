#!/usr/bin/env node
/**
 * 스토어 제출 전에 "올려도 거절당하지 않는지"를 확인한다. (CI에서 매번 실행)
 *
 * 1) Google Play: 2026-08-31부터 새 앱·업데이트는 Android 16(API 36) 이상을 대상으로 해야 함.
 *    → React Native(Expo SDK 54)가 정하는 targetSdk 가 36 이상인지 확인.
 * 2) App Store Connect: 2026-04-28부터 Xcode 26(iOS 26 SDK) 이상으로 빌드한 앱만 업로드 가능.
 *    → eas.json 에 Xcode 26 미만 빌드 이미지를 고정해 두지 않았는지 확인.
 * 3) 표시 버전이 네 파일(app.config.js / iOS 2곳 / Android)에서 같은지 확인.
 *
 * 기준이 바뀌면 아래 MIN_* 값을 올린다.
 */
const fs = require('fs');
const path = require('path');

const MIN_ANDROID_TARGET_SDK = 36;
const MIN_XCODE_MAJOR = 26;

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const problems = [];
const ok = [];

// 1) Android targetSdk
try {
  const gradle = read('android/build.gradle') + read('android/gradle.properties');
  let target = null;
  const override = gradle.match(/targetSdkVersion\s*=\s*(\d+)/) || gradle.match(/android\.targetSdkVersion\s*=\s*(\d+)/);
  if (override) {
    target = Number(override[1]);
  } else {
    const toml = read('node_modules/react-native/gradle/libs.versions.toml');
    const m = toml.match(/^targetSdk\s*=\s*"(\d+)"/m);
    if (m) target = Number(m[1]);
  }
  if (target == null) problems.push('Android targetSdk 값을 찾지 못했습니다 (npm ci 를 먼저 실행했나요?)');
  else if (target < MIN_ANDROID_TARGET_SDK) problems.push(`Android targetSdk ${target} < ${MIN_ANDROID_TARGET_SDK} (Google Play 거절 대상)`);
  else ok.push(`Android targetSdk ${target} (기준 ${MIN_ANDROID_TARGET_SDK} 이상)`);
} catch (e) {
  problems.push(`Android targetSdk 확인 실패: ${e.message}`);
}

// 2) EAS iOS 빌드 이미지
try {
  const eas = JSON.parse(read('eas.json').replace(/^\s*\/\/.*$/gm, ''));
  const before = problems.length;
  for (const [name, profile] of Object.entries(eas.build || {})) {
    const image = profile.ios && profile.ios.image;
    if (!image) continue;
    const m = String(image).match(/xcode-(\d+)/);
    if (m && Number(m[1]) < MIN_XCODE_MAJOR) {
      problems.push(`eas.json build.${name}.ios.image="${image}" → Xcode ${m[1]} (App Store Connect는 Xcode ${MIN_XCODE_MAJOR}+ 필요)`);
    }
  }
  if (problems.length === before) ok.push(`EAS iOS 이미지: Xcode ${MIN_XCODE_MAJOR} 미만 고정 없음`);
} catch (e) {
  problems.push(`eas.json 확인 실패: ${e.message}`);
}

// 3) 버전 일치
try {
  const cfg = read('app.config.js').match(/^\s*version:\s*"([^"]+)"/m)?.[1];
  const plist = read('ios/app/Info.plist').match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)</)?.[1];
  const pbx = [...read('ios/app.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([0-9.]+);/g)].map((m) => m[1]);
  const gradle = read('android/app/build.gradle').match(/versionName\s+"([^"]+)"/)?.[1];
  const all = { 'app.config.js': cfg, 'Info.plist': plist, 'Android versionName': gradle };
  pbx.forEach((v, i) => (all[`MARKETING_VERSION#${i + 1}`] = v));
  const distinct = new Set(Object.values(all));
  if (distinct.size !== 1) {
    problems.push(`표시 버전이 서로 다릅니다: ${JSON.stringify(all)} → node scripts/bump-version.js ${cfg} 로 맞추세요`);
  } else ok.push(`표시 버전 ${cfg} (4곳 일치)`);
} catch (e) {
  problems.push(`버전 확인 실패: ${e.message}`);
}

ok.forEach((m) => console.log(`✅ ${m}`));
problems.forEach((m) => console.log(`❌ ${m}`));
process.exit(problems.length ? 1 : 0);
