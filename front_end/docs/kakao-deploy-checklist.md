# 카카오 로그인 추가 배포 체크리스트

> **컨텍스트**: 이미 스토어에 배포된 앱에 **카카오 로그인 기능을 추가**하는 작업.
> Apple Developer / App Store Connect / Play Console / EAS Credentials 등 배포 인프라는 이미 세팅되어 있다고 가정.

앱 키: `6b4ad4a64e775ae17d3ffbf012e65d84`
패키지/번들 ID: `com.itl.aippopick`

---

## 우선순위별 체크리스트

### 🔴 이번에 새로 해야 할 작업 (카카오 추가분)

| 항목 | 위치 | 완료 |
|------|------|------|
| 카카오 개발자 센터에 앱 생성 + 앱 키 발급 | developers.kakao.com | [x] (앱 키 발급 완료) |
| **기존** Android 릴리즈 키스토어의 SHA256 추출 → 카카오에 등록 | EAS / keytool | [ ] |
| iOS Bundle ID 카카오에 등록 (`com.itl.aippopick`) | 카카오 개발자 센터 | [ ] |
| 카카오 로그인 활성화 토글 ON | 카카오 개발자 센터 | [ ] |
| OpenID Connect 활성화 (필수, idToken 사용) | 카카오 개발자 센터 | [ ] |
| 동의항목 설정 (필요 스코프) | 카카오 개발자 센터 | [ ] |

### ✅ 이미 완료된 인프라 (재작업 X — 확인만)

| 항목 | 비고 |
|------|------|
| Apple Developer / App Store Connect 앱 등록 | Bundle ID, Team ID(`LQ97BNQH9G`) 확정 |
| Android 릴리즈 키스토어 | EAS 또는 자체 관리 — **새로 만들지 말 것** |
| EAS Credentials 초기 세팅 | 기존 키 그대로 사용 |
| 프로덕션 API URL | 이미 운영 중이면 `eas.json` / EAS env에 설정되어 있을 것 — 값만 확인 |
| iOS 네이티브 카카오 SDK 설정 | `Info.plist` + `AppDelegate.swift` 반영 완료 (아래 참조) |
| Android 네이티브 카카오 SDK 설정 | (Android 점검 단계에서 확인 예정) |

---

## 1. 카카오 개발자 센터 (developers.kakao.com)

### 플랫폼 등록
내 애플리케이션 → 앱 설정 → 플랫폼

**Android**
- 패키지명: `com.itl.aippopick`
- 키 해시: **기존 릴리즈 키스토어**의 SHA256 (아래 2번 참고, 새 키 생성 X)

**iOS**
- 번들 ID: `com.itl.aippopick`

### 카카오 로그인 활성화
제품 설정 → 카카오 로그인 → **활성화 스위치 ON**

### OpenID Connect 활성화 (필수)
> 현재 코드(`useAuth.ts`)가 `login()` 후 `idToken`을 추출해 백엔드로 전달하는 방식.
> OpenID Connect 비활성화 시 `idToken`이 `null`로 반환되어 로그인 실패.

제품 설정 → 카카오 로그인 → OpenID Connect → **활성화 ON**

### 동의항목 설정
제품 설정 → 카카오 로그인 → 동의항목
- 닉네임 (필수 또는 선택)
- 이메일 (선택 동의항목은 심사 필요)

---

## 2. Android — 기존 릴리즈 키 SHA256 추출

> **배포 실패 1순위 원인**: 디버그 키로는 테스트가 되는데 릴리즈 빌드는 다른 키를 써서 로그인 실패.
> **이미 배포된 앱**이라면 **반드시 기존 릴리즈 키스토어의 SHA256**을 등록해야 함. 새로 만들면 스토어 업데이트가 막힘.

### EAS Build 관리 키인 경우 (권장)
```bash
eas credentials -p android
# Production keystore 선택 → SHA256 Fingerprint 값을 카카오에 등록
```

### 자체 Keystore 관리하는 경우
```bash
keytool -list -v -keystore <기존 release.keystore> -alias <alias>
# SHA256 값을 카카오에 등록
```

### 현재 네이티브 코드
- `android/build.gradle`: 카카오 Maven 저장소 — **Android 점검 단계에서 확인**
- `android/app/src/main/AndroidManifest.xml`: URL Scheme, Intent Filter — **점검 예정**
- `android/app/src/main/res/values/strings.xml`: 앱 키 — **점검 예정**

---

## 3. iOS — 네이티브 설정 (반영 완료)

### 현재 반영된 변경사항 (`git status`상 staged)
- ✅ `ios/app/AppDelegate.swift`: `import kakao_login` + URL 핸들러 (`RNKakaoLogins.isKakaoTalkLoginUrl` / `handleOpen`)
- ✅ `ios/app/Info.plist`:
  - `CFBundleURLSchemes`에 `kakao6b4ad4a64e775ae17d3ffbf012e65d84`
  - `KAKAO_APP_KEY` 키
  - `LSApplicationQueriesSchemes`: `kakaokompassauth`, `storykompassauth`, `kakaolink`
- ✅ `ios/Podfile.lock`: 의존성 lock 갱신

### ⚠️ 같이 들어간 변경사항 (의도 확인 필요)
- `Info.plist`에 `NSAllowsLocalNetworking = true` 추가됨 → 카카오와 무관한 변경. 로컬 개발 서버 접속용으로 보이지만, **프로덕션 빌드에서는 제거 권장** (App Store 심사 시 굳이 노출시킬 이유 없음).

### Apple Developer (이미 세팅됨)
- Bundle ID: `com.itl.aippopick` (앱 등록 완료)
- Team ID: `LQ97BNQH9G` (`app.config.js`)
- Distribution Provisioning Profile: 기존 것 사용

---

## 4. 환경변수 점검

이미 배포된 앱이면 프로덕션 URL은 보통 EAS 쪽에 설정되어 있다. 새로 세팅하지 말고 **현재 값만 확인**:

```bash
# 현재 production 환경변수 확인
eas env:list --environment production
```

확인 포인트:
- `EXPO_PUBLIC_API_BASE_URL`이 프로덕션 URL인지 (`http://localhost:4000`이면 안 됨)
- 카카오 관련 추가 env가 필요한지 (앱 키는 네이티브에 박혀 있어 별도 env 불필요)

로컬 `.env`는 개발용이므로 `localhost`여도 문제 없음.

---

## 5. 빌드 및 배포 (기존 파이프라인 그대로)

```bash
# 빌드 번호 / 버전 올린 후
eas build --platform android --profile production
eas build --platform ios --profile production

# 스토어 제출
eas submit --platform android
eas submit --platform ios
```

### 업데이트 배포 시 주의
- **버전 코드 / 빌드 번호 증가** 필수 (`app.config.js`의 `versionCode`, `buildNumber`)
- 카카오 SDK 추가로 인한 권한/스킴 변경이 있으므로 **OTA 업데이트로는 불가능** → 네이티브 빌드 필요
- iOS 심사 시 카카오 로그인 테스트 계정 제공 권장

---

## 6. 배포 후 확인

- [ ] 릴리즈 빌드(스토어 다운로드 버전)에서 카카오톡 앱 → 로그인 정상
- [ ] 카카오톡 미설치 디바이스에서 웹뷰 로그인 정상
- [ ] iOS / Android 양쪽 모두 `idToken`이 백엔드로 전달되어 인증 성공
