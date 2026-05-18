# Python 주가 분석 대시보드 (ApexCharts)

Python 백엔드가 제공하는 주가 분석 데이터를 Vite + ApexCharts 프론트엔드에서 시각화하는 예제 저장소입니다.  
기존 MATLAB/공정 분석 예시를 **Python 기반 주가 분석 대시보드**로 전환했습니다.

---

## 구성

- **frontend**: Vite + TypeScript + ApexCharts
- **backend**: FastAPI + Uvicorn
- **analysis data**: 국내 대표 종목의 종가, 거래량, 섹터 수익률, 포트폴리오 비중

---

## 제공 화면

### 1. 시장 흐름 & 포트폴리오 성과

- 포트폴리오 vs KOSPI 누적 성과
- 종목별 종가 추이
- 섹터 주간 수익률

### 2. 포트폴리오 구성 & 수급

- 보유 비중 도넛 차트
- 관심 종목 거래량 추이
- 종목별 변동성 레이더 차트

### 3. 수익률 분석

- 리스크-리턴 산점도
- 일별 수익률 히트맵

---

## 백엔드 API

Python 백엔드는 `/home/runner/work/matlab-class/matlab-class/server/app.py` 에 있습니다.

### 실행

```bash
cd /home/runner/work/matlab-class/matlab-class
python -m pip install -r requirements.txt
uvicorn server.app:app --reload --host 0.0.0.0 --port 8000
```

### 엔드포인트

- `GET /api/health`
- `GET /api/stocks`

`/api/stocks` 는 정적 JSON 기반 주가 분석 데이터를 반환합니다.

---

## 프론트엔드 실행

```bash
cd /home/runner/work/matlab-class/matlab-class
npm install
npm run dev
```

기본적으로 프론트엔드는 `http://localhost:8000/api/stocks` 를 호출합니다.  
필요하면 `VITE_API_BASE` 환경변수로 백엔드 주소를 바꿀 수 있습니다.

예:

```bash
VITE_API_BASE=http://localhost:8000 npm run dev
```

---

## 프로덕션 빌드

```bash
cd /home/runner/work/matlab-class/matlab-class
npm run build
```

---

## 예제 데이터

백엔드 샘플 데이터는 다음 파일에 있습니다.

`/home/runner/work/matlab-class/matlab-class/server/data/stocks.json`

포함 항목:

- 삼성전자
- SK하이닉스
- NAVER
- 카카오

---

## 간단한 개발 흐름

1. Python 백엔드 실행
2. 프론트엔드 개발 서버 실행
3. 브라우저에서 대시보드 확인

---

## 기술 메모

- FastAPI + Uvicorn 기반으로 API와 정적 프론트엔드를 함께 서비스할 수 있습니다.
- CORS 허용이 포함되어 있어 Vite 개발 서버에서 바로 조회할 수 있습니다.
- 주가 데이터 구조를 바꾸면 대시보드 차트도 함께 갱신됩니다.

---

## Docker 실행

```bash
cd /home/runner/work/matlab-class/matlab-class
docker build -t matlab-class .
docker run --rm -p 8000:8000 matlab-class
```

컨테이너는 Vite로 빌드한 프론트엔드와 FastAPI 백엔드를 함께 실행합니다.
