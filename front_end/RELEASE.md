# 배포 가이드 (RELEASE)

아이뽀픽 앱의 **버전 올리기 → 빌드 → 스토어 제출** 절차를 정의한다.
> 배포 관련 질문이 오면 Claude는 **이 문서를 먼저 읽고**, "Claude가 하는 일"은 직접 처리한 뒤
> **"사용자가 해야 하는 일"만 안내**한다.

- **iOS**: Xcode에서 아카이브 → App Store Connect 업로드 (EAS 사용 안 함)
- **Android**: EAS Build → EAS Submit (Play Console)

---

## 1. 버전 관리 위치 (중요)

버전 문자열/빌드번호가 여러 파일에 흩어져 있고, **iOS 앱 타깃은 Info.plist 값이 하드코딩**되어
pbxproj보다 우선한다. 따라서 아래 **모든 위치를 함께** 바꿔야 실제 버전이 반영된다.

| 플랫폼 | 파일 | 항목 | 비고 |
|--------|------|------|------|
| 공통 | `app.config.js` (line ~8) | `version` | Android/EAS가 사용 + 전체 기준값 |
| iOS 앱 | `ios/app/Info.plist` | `CFBundleShortVersionString` | 버전 문자열 (하드코딩) |
| iOS 앱 | `ios/app/Info.plist` | `CFBundleVersion` | 빌드번호 (하드코딩) |
| iOS 앱 | `ios/app.xcodeproj/project.pbxproj` | `MARKETING_VERSION` ×2 | 앱 Debug/Release |
| iOS 앱 | `ios/app.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` ×2 | 앱 Debug/Release |
| iOS 위젯 | `ios/app.xcodeproj/project.pbxproj` | `MARKETING_VERSION` ×2 | 위젯(IPOWidget) Debug/Release |
| iOS 위젯 | `ios/app.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` ×2 | 위젯 Debug/Release |

- `ios/IPOWidget/Info.plist` 은 `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)` **변수 참조**라 수정 불필요.
- Android(`android/app/build.gradle`)의 `versionCode`/`versionName`은 EAS 프로덕션 빌드가
  `appVersionSource: "remote"` + `autoIncrement: true`로 **자동 관리**하므로 손대지 않는다.

**버전 규칙**
- `version`(마케팅 버전, 예 `1.2.3`): 릴리스마다 사용자가 지정.
- iOS 빌드번호(`CFBundleVersion`/`CURRENT_PROJECT_VERSION`): **직전 업로드보다 큰 정수**.
  같은 마케팅 버전으로 재업로드해도 빌드번호는 반드시 증가해야 함.
- iOS는 앱·위젯 타깃의 빌드번호를 **동일 값**으로 통일한다.

---

## 2. Claude가 하는 일 (파일 수정 — 자동 처리)

새 버전 `X.Y.Z`, 새 iOS 빌드번호 `N`이 정해지면 Claude가 아래를 일괄 수정한다.

1. `app.config.js` → `version: "X.Y.Z"`
2. `ios/app/Info.plist` → `CFBundleShortVersionString = X.Y.Z`, `CFBundleVersion = N`
3. `ios/app.xcodeproj/project.pbxproj`
   - `MARKETING_VERSION = X.Y.Z` (4곳 전부: 앱·위젯 Debug/Release)
   - `CURRENT_PROJECT_VERSION = N` (4곳 전부)
4. 변경 후 남은 `1.2.2` 등 옛 버전 문자열이 없는지 grep으로 검증:
   ```
   grep -RnE "MARKETING_VERSION|CURRENT_PROJECT_VERSION|CFBundleShortVersionString|CFBundleVersion" \
     ios/app/Info.plist ios/app.xcodeproj/project.pbxproj
   grep -n "version:" app.config.js
   ```

> iOS 빌드번호 `N`을 사용자가 지정하지 않으면, 현재 `CFBundleVersion` 값 + 1 을 기본으로 제안한다.

---

## 3. 사용자가 하는 일 (수동 — Claude가 안내만)

### iOS (Xcode)
1. `ios/app.xcworkspace` 를 Xcode로 연다. (⚠️ `.xcodeproj` 아님)
2. 필요 시 `npx pod-install` 또는 `cd ios && pod install`.
3. 상단 타깃을 **`app`**, 기기를 **Any iOS Device (arm64)** 로 선택.
4. **Product → Archive**.
5. Organizer에서 **Distribute App → App Store Connect → Upload**.
6. App Store Connect에서 심사 제출 (스크린샷/변경사항 작성 후 "심사에 제출").

### Android (EAS)
```bash
# 프로덕션 AAB 빌드 (versionCode 자동 증가)
eas build --platform android --profile production

# 빌드 완료 후 Play Console 제출
eas submit --platform android --profile production
```
> EAS 로그인이 필요하므로 이 명령들은 사용자가 터미널에서 직접 실행한다.
> (세션 안에서 실행하려면 프롬프트에 `! eas build ...` 형태로 입력)

### 마무리 (공통)
```bash
git commit -am "chore: bump version to X.Y.Z"
```

---

## 4. 배포 요청 시 Claude 진행 순서

1. 이 문서를 읽는다.
2. 새 버전(`X.Y.Z`)과 iOS 빌드번호(`N`, 미지정 시 현재+1 제안)를 확인한다.
3. **2절**의 파일 수정을 모두 수행하고 grep으로 검증한다.
4. 사용자에게는 **3절의 수동 작업(iOS Xcode 아카이브 / Android EAS 명령)만** 요약해 안내한다.
5. (요청 시) 버전 bump 커밋까지 수행한다.
