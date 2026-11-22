# 매달 앱 업데이트 절차 (아이뽀픽)

> 목표: 한 달에 한 번, **화면·로직을 깨지 않는 작은 수정**만 모아 안전하게 올린다.
> 자동으로 하는 것은 "점검 → 빌드 → 테스트 트랙 업로드"까지. **공개 출시는 사람이 콘솔에서 직접 누른다.**

## 한눈에 보기

| 언제 | 누가 | 무엇을 |
|---|---|---|
| 매달 20일쯤 | Claude | "월간 업데이트 vX.Y.Z" PR 생성 (작은 수정 + 버전 올리기). PR마다 **앱 점검** 자동 실행 |
| PR 점검 통과 후 | 코린이(또는 yennie) | PR 확인하고 merge |
| 매달 1일 10:00 (KST) | GitHub Actions | **월간 업데이트** 실행: EAS 클라우드 빌드 → Play 내부 테스트 · TestFlight 업로드 |
| 업로드 후 1~2일 | 코린이 | 폰에 테스트 버전 설치 → 아래 "5가지 확인" → 콘솔에서 공개 |
| 매달 말 | Claude + 코린이 | Firebase Analytics 화면 조회 숫자 보고 다음 달 수정 거리 정하기 |

- main 의 버전이 이미 올린 버전(태그 `v1.2.3`)이면 1일 자동 실행은 그냥 건너뛴다. 새 수정이 없는 달은 아무것도 안 올라간다.
- 급할 땐 GitHub > Actions > **월간 업데이트** > Run workflow 로 바로 실행할 수 있다.
- 빌드는 모두 클라우드(GitHub Actions + EAS)에서 한다. 서버 PC(DESKTOP-RHQ5N88)는 쓰지 않는다.

## 월간 PR에 넣어도 되는 것 / 안 되는 것

넣어도 됨
- 오타·문구 수정, 오류 메시지 개선
- 린트 경고·오류 정리(동작이 같다는 근거가 있을 때)
- 크래시·예외 처리 보강(try/catch, 빈 값 처리)
- 분석 이벤트 추가(화면·버튼 이름만, 개인정보 없이)
- 의존성 **패치** 버전 업데이트(`npx expo install --check` 기준)
- 스토어 요건 대응(대상 API, Xcode 버전)

넣지 않음(따로 결정)
- 화면 배치·디자인 변경, 새 기능, API 주소·응답 형식 변경
- 로그인·알림·광고 흐름 변경
- Expo SDK 메이저 업그레이드(따로 테스트 빌드부터)
- 앱 안 리뷰 요청·공유 버튼(보류로 정해짐)

## 스토어 요건 (CI가 매번 자동 검사: `scripts/check-store-requirements.js`)

- **Google Play**: 2026-08-31부터 새 앱·업데이트는 Android 16(API 36) 이상 대상. 지금 targetSdk 36 ✅
- **App Store Connect**: 2026-04-28부터 Xcode 26(iOS 26 SDK)으로 빌드한 앱만 업로드 가능.
  예전 `eas.json` 에 Xcode 16.3 이미지가 고정돼 있어 이번에 풀었다 ✅
- 표시 버전은 4곳(app.config.js, iOS 2곳, Android)이 같아야 한다 → `node scripts/bump-version.js` 로 한 번에 올린다.
- 빌드 번호(versionCode / build number)는 EAS가 자동으로 올린다(`appVersionSource: remote`).

## 처음 한 번만 (코린이 할 일, 순서대로)

1. **Expo 토큰 만들기**: expo.dev 로그인 → 오른쪽 위 계정 → Account settings → Access tokens → Create token → 이름 `github-actions` → 나온 값 복사.
2. **GitHub에 넣기**: github.com/YennieJ/aippo_pick → Settings → Secrets and variables → Actions → New repository secret
   - Name: `EXPO_TOKEN` / Secret: 1번 값 붙여넣기 → Add secret
   - 저장소 주인(yennie) 권한이 필요할 수 있다.
3. **Play 자동 업로드 키 확인**: expo.dev → 프로젝트(front_end) → Credentials → Android → `com.itl.aippopick` → "Google Service Account Key" 가 있는지 본다.
   없으면: Play Console → 설정 → API 액세스 안내대로 서비스 계정 JSON 키를 만들고(권한: 출시 관리), 그 파일을 여기에 업로드.
4. **App Store 자동 업로드 키 확인**: expo.dev → Credentials → iOS → "App Store Connect API Key" 가 있는지 본다.
   없으면: App Store Connect → 사용자 및 액세스 → 통합 → 키 → 생성(역할: 앱 관리) → `.p8` 내려받기 → 여기에 업로드.
5. **Firebase Analytics 켜기(무료)**: console.firebase.google.com → 아이뽀픽 프로젝트 → 프로젝트 설정 → 통합 → Google Analytics → 사용 설정.
6. **스토어 개인정보 표시 고치기(공개 출시 전에)**: 이번 버전부터 화면 조회 기록을 모은다.
   - Play Console → 앱 콘텐츠 → 데이터 보안: "앱 활동 > 앱 상호작용" 수집 = 예, 목적 = 분석, 공유 안 함.
   - App Store Connect → 앱 개인정보 보호: "사용 데이터 > 제품 상호작용" = 분석, 사용자와 연결 안 됨, 추적 안 함.
7. **첫 실행 시험**: GitHub → Actions → 월간 업데이트 → Run workflow → platform `android` → 실행. expo.dev Builds 에서 성공하는지 본다.

## 테스트 버전 5가지 확인 (공개 전에)

1. 앱이 켜지고 스플래시 뒤 홈이 나온다
2. 달력에서 이번 달 청약 일정이 보인다
3. 종목 하나 눌러 상세 화면이 열린다
4. 내 페이지 > 알림 설정이 열린다(알림 켜짐 유지)
5. 위젯이 그대로 보인다

다 괜찮으면 → Play Console: 내부 테스트 → 프로덕션으로 승격 / App Store Connect: 새 버전에 TestFlight 빌드 선택 → 심사 제출.

## 어디까지 보는지 확인 (Firebase Analytics)

- 앱이 보내는 것: `screen_view` 하나. 화면 이름은 라우트 패턴만(예: `/`, `/calendar`, `/ipo/[codeId]`, `/ipo/ai-report`). 종목 코드·검색어·개인정보·광고 ID는 보내지 않는다.
- 보는 곳: Firebase 콘솔 → Analytics → 이벤트 → `screen_view` → `screen_name` 별 사용자 수.
  (또는 Google Analytics → 보고서 → 참여도 → 페이지 및 화면)
- 숫자는 하루 정도 늦게 쌓인다. 매달 말에 "홈 → 달력 → 종목 상세 → AI 리포트" 단계별 사용자 수를 기록하고, 가장 많이 빠지는 단계를 다음 달 수정 거리로 삼는다.

## 미확인

- Play 스토어에 보이는 버전 이름: Android `versionName` 이 그동안 `1.0.0` 으로 남아 있었다(이번에 1.2.3 으로 맞춤). 실제 Play 화면 표시값은 미확인.
- EAS 원격 빌드 번호가 스토어 최신 번호보다 큰지: 첫 실행 전에 expo.dev 프로젝트 화면에서 확인 필요.
