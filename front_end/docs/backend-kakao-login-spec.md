# 백엔드 로컬 노출 설정 (ngrok)

> **목적**: 프론트엔드를 실기기(아이폰)에서 테스트하기 위해, 로컬에서 도는 백엔드를 외부 HTTPS URL로 노출.
> 폰은 백엔드의 `localhost`에 직접 닿을 수 없어서 ngrok 터널이 필요함.

---

## 1. 백엔드 바인딩 변경

`localhost` / `127.0.0.1`이 아니라 **`0.0.0.0`** 에 바인딩.

```js
// Express 예시
app.listen(4000, '0.0.0.0', () => {
  console.log('listening on http://0.0.0.0:4000');
});
```

```js
// NestJS 예시
await app.listen(4000, '0.0.0.0');
```

```python
# FastAPI/Uvicorn 예시
uvicorn.run(app, host='0.0.0.0', port=4000)
```

→ 이게 안 되면 ngrok도 의미 없음.

---

## 2. ngrok 설치 + 인증

```bash
# 설치
brew install ngrok

# 회원가입: https://ngrok.com (이메일만)
# Authtoken 페이지에서 토큰 복사 후 등록 (한 번만)
ngrok config add-authtoken <복사한_토큰>
```

---

## 3. 터널 시작

백엔드를 4000번 포트로 띄운 상태에서, 새 터미널에서:

```bash
ngrok http 4000
```

출력 예시:
```
Forwarding   https://abcd-1234-5678.ngrok-free.app -> http://localhost:4000
```

→ 이 **HTTPS URL**을 프론트엔드에 전달.
→ ngrok 터미널 창은 **테스트하는 동안 계속 켜둬야** 함.

---

## 4. CORS 허용

백엔드 CORS 설정에 ngrok 도메인 추가. 모바일 앱 자체는 origin이 없어 영향 적지만, 웹뷰/디버그 클라이언트 호출에서 막힐 수 있음.

```js
// Express 예시
app.use(cors({
  origin: [
    /\.ngrok-free\.app$/,
    /\.ngrok\.app$/,
    'http://localhost:8081',     // Metro
    'https://api.aippopick.shop' // 프로덕션
  ],
  credentials: true,
}));
```

```python
# FastAPI 예시
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
  CORSMiddleware,
  allow_origin_regex=r"https://.*\.ngrok-free\.app|https://.*\.ngrok\.app",
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
```

---

## 5. 동작 확인

```bash
# Mac에서 ngrok URL이 정상 응답하는지
curl https://abcd-1234.ngrok-free.app/<헬스체크 엔드포인트>
```

응답 OK → 프론트엔드에 URL 전달.

---

## 주의사항

- **무료 플랜은 ngrok 재시작할 때마다 URL이 바뀜** → 프론트가 매번 `.env` 수정해야 함.
- 첫 접속 시 ngrok 경고 페이지가 뜰 수 있음 (브라우저 직접 접속 시). API 호출엔 영향 없음.
- ngrok은 **로컬 개발용 임시 도구**. 프로덕션 배포(`https://api.aippopick.shop`) 후엔 불필요.
- 매번 같은 URL을 원하면 ngrok 유료 플랜의 reserved domain 기능 사용 (선택).

---

## 프론트엔드가 받아야 할 정보

- ngrok HTTPS URL (예: `https://abcd-1234.ngrok-free.app`)
- 백엔드 포트가 4000번이 아니면 실제 포트
