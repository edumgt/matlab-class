# Python 주가 분석 + 제조 신호처리 대시보드 (ApexCharts)

Python 백엔드가 제공하는 데이터를 Vite + ApexCharts 프론트엔드에서 시각화하는 예제 저장소입니다.
Keycloak 로그인 뒤에서 **KOSPI 주가 분석**과 **numpy/scipy 기반 제조 신호처리 분석(MATLAB 스타일)** 두 화면을 offcanvas 사이드바로 전환하며 볼 수 있습니다.

---

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프론트엔드 | [Vite](https://vitejs.dev/) 7, TypeScript 5, [ApexCharts](https://apexcharts.com/) 5 |
| 백엔드 | [FastAPI](https://fastapi.tiangolo.com/) 0.136, [Uvicorn](https://www.uvicorn.org/) (ASGI 서버) |
| 신호 처리 / 수치 계산 | [numpy](https://numpy.org/), [scipy](https://scipy.org/) (`scipy.signal.welch` 기반 PSD 대역 에너지 계산) |
| 인증 | [Keycloak](https://www.keycloak.org/) (OpenID Connect, Resource Owner Password 그랜트), `python-jose` (JWT 서명 검증), `httpx` (비동기 HTTP 클라이언트) |
| 배포 | Docker (BE/FE 분리 이미지), [Nginx](https://nginx.org/) (프론트엔드 정적 서빙), Docker Compose |
| UI 디자인 | Copilot 스타일 화이트 톤 + offcanvas 사이드바 (커스텀 CSS, 프레임워크 없음) |

---

## 폴더 구조

```
.
├── README.md
├── matlab-dashboard.png
├── docker-compose.yml     # 저장소 루트에서 BE/FE 컨테이너를 함께 기동
└── app/                   # 실제 프로그래밍 소스 (여기서 npm/pip 명령 실행)
    ├── index.html
    ├── src/                # 프론트엔드 (Vite + TypeScript)
    ├── public/
    ├── server/             # 백엔드 (FastAPI)
    │   ├── app.py
    │   ├── auth.py          # Keycloak 로그인 연동
    │   ├── manufacturing.py # numpy/scipy 신호처리 분석 (제조 분석 화면 데이터)
    │   └── data/stocks.json
    ├── Dockerfile          # 프론트엔드 이미지
    ├── server/Dockerfile   # 백엔드 이미지
    ├── package.json / tsconfig.json / nginx.conf
    └── requirements.txt
```

---

## 제공 화면

로그인 후 상단 햄버거 버튼으로 여는 offcanvas 사이드바에서 두 화면을 전환합니다.

### 1. KOSPI 대시보드

- 코스피 종합/50/200/대형주/중형주 지수 전환 탭 + 메인 추이 차트
- 1D/1W/1M/YTD 변동률
- Watchlist (사이드바) — 지수 클릭 시 메인 차트 갱신

### 2. 제조 분석 (MATLAB 스타일)

`app/server/manufacturing.py`에서 numpy로 합성 진동 신호를 생성하고 `scipy.signal.welch`로 실제 PSD(파워 스펙트럼 밀도)를 계산해 반환합니다. 정적 목업 JSON이 아니라 매 요청마다(고정 시드) 실계산된 결과입니다.

- KPI 카드: 최근 RMS, 최대 이상 확률, 정상품 비중, 모델 평균 점수
- 진동 RMS 추세, 주파수 대역 스펙트럼(0~500Hz, 5구간)
- 공정별 이상 확률 레이더(프레스/용접/도장/조립/검사)
- 품질 분류 비율 도넛(정상/재작업/폐기)
- 모델 성능 vs 목표치(F1/Precision/Recall/AUC)

---

## 백엔드 API

Python 백엔드는 `app/server/app.py` 에 있습니다.

### 실행

```bash
cd app
python -m pip install -r requirements.txt
uvicorn server.app:app --reload --host 0.0.0.0 --port 8000
```

### 엔드포인트

- `GET /api/health` — DB/Keycloak 여부와 무관하게 항상 공개
- `POST /api/auth/login` — `{ username, password }` → Keycloak 토큰 발급
- `POST /api/auth/refresh` — `{ refresh_token }` → 토큰 갱신
- `POST /api/auth/logout` — `{ refresh_token }` → Keycloak 세션 종료
- `GET /api/auth/me` — 로그인 사용자 정보 (Bearer 토큰 필요)
- `GET /api/stocks` — 주가 분석 데이터 (Bearer 토큰 필요)
- `GET /api/manufacturing` — numpy/scipy로 계산한 제조 신호처리 분석 데이터 (Bearer 토큰 필요)

`/api/stocks`, `/api/manufacturing` 모두 로그인한 사용자만 조회할 수 있습니다.

---

## 회원 로그인 (Keycloak 연동)

이 프로젝트는 별도의 회원 DB 없이, 기존에 떠 있는 Docker Keycloak 서버(realm `integrated-id`, client `be-client`)를 통해 로그인합니다.
백엔드가 사용자의 아이디/비밀번호를 Keycloak Resource Owner Password 방식으로 대신 교환해주는 프록시 역할을 하므로, Keycloak 쪽에 새 client를 등록할 필요가 없습니다.

- 로그인 화면: 프론트엔드 최초 진입 시 로그인 폼이 표시되며, 로그인 전에는 대시보드 데이터를 볼 수 없습니다.
- 토큰은 브라우저 `localStorage`에 저장되고, access token 만료 시 refresh token으로 자동 갱신합니다.
- Keycloak 서버 주소/realm/client는 환경변수로 바꿀 수 있습니다 (기본값은 로컬 Docker Keycloak 기준).

```bash
export KEYCLOAK_BASE_URL=http://localhost:8080   # Keycloak 컨테이너 주소
export KEYCLOAK_REALM=integrated-id
export KEYCLOAK_CLIENT_ID=be-client
export KEYCLOAK_CLIENT_SECRET=be-client-secret
```

테스트 계정 (Keycloak realm에 미리 등록되어 있음): `demo-user` / `demo1234`

---

## 프론트엔드 실행

```bash
cd app
npm install
npm run dev
```

기본적으로 프론트엔드는 `http://localhost:8000` 을 백엔드로 호출합니다.
필요하면 `VITE_API_BASE` 환경변수로 백엔드 주소를 바꿀 수 있습니다.

예:

```bash
VITE_API_BASE=http://localhost:8000 npm run dev
```

---

## 프로덕션 빌드

```bash
cd app
npm run build
```

---

## 예제 데이터

백엔드 샘플 데이터는 다음 파일에 있습니다.

`app/server/data/stocks.json`

포함 항목:

- 삼성전자
- SK하이닉스
- NAVER
- 카카오

제조 분석 화면 데이터는 정적 파일이 아니라 `app/server/manufacturing.py`가 numpy/scipy로 매 요청 시 계산합니다.

---

## 간단한 개발 흐름

1. Python 백엔드 실행
2. 프론트엔드 개발 서버 실행
3. 브라우저에서 로그인 후 KOSPI / 제조 분석 화면 확인

---

## 기술 메모

- FastAPI + Uvicorn 기반으로 API와 정적 프론트엔드를 함께 서비스할 수 있습니다.
- CORS 허용이 포함되어 있어 Vite 개발 서버에서 바로 조회할 수 있습니다.
- 주가 데이터 구조를 바꾸면 대시보드 차트도 함께 갱신됩니다.
- UI는 Copilot 스타일의 화이트 톤 + offcanvas 사이드바로 구성되어 있으며, 사이드바 상단 메뉴로 KOSPI/제조 분석 화면을 전환합니다.
- 제조 분석 화면은 `scipy.signal.welch`로 실제 PSD를 계산하는 등, 이름(matlab-class)에 맞는 신호처리 계산을 백엔드에서 수행합니다.

---

## Docker 실행 (BE / FE 분리)

프론트엔드(Nginx)와 백엔드(FastAPI)를 별도 컨테이너로 띄웁니다. 두 서비스 모두 빌드 컨텍스트는 `app/` 입니다.
기존 인프라 포트(5432, 6379, 8080, 27017, 8000~9000대 다수 등)와 겹치지 않도록 호스트 포트를 18000/18080으로 매핑했습니다.

사전 조건: 회원 로그인이 붙어 있는 Keycloak(`keycloak` 컨테이너)이 `shared-net` 네트워크에 떠 있어야 합니다.
(`/home/ubuntu/edumgt-lab-init/infra` 에서 `docker compose up -d` 로 기동)

```bash
# 저장소 루트에서 실행 (docker-compose.yml 위치)
docker compose up -d --build
```

- FE: http://localhost:18080
- BE: http://localhost:18000 (`/api/health`, `/api/auth/*`, `/api/stocks`, `/api/manufacturing`)

종료: `docker compose down`

백엔드 컨테이너는 `shared-net`에 붙어 `http://keycloak:8080`으로 Keycloak과 통신합니다.
프론트엔드는 빌드 시점에 `VITE_API_BASE=http://localhost:18000`을 주입받아, 브라우저가 백엔드 컨테이너의 호스트 포트(18000)로 직접 API를 호출합니다.

---

## Footer

모든 화면 하단에 `(주)에듀엠지티 · www.edumgt.co.kr` 이 표시됩니다.

테스트용 로그인 계정입니다 (Keycloak realm integrated-id에 등록되어 있음):

아이디	비밀번호	비고
demo-user	demo1234	일반 사용자
demo-user2	demo2234	일반 사용자
demo-user3	demo3234	일반 사용자
admin-user	admin1234	realm role admin 보유
이 중 demo-user / demo1234로 실제 로그인 → KOSPI/제조 분석 화면까지 여러 차례 검증했습니다.
