# MATLAB 분석 대시보드 (ApexCharts)

MATLAB에서 생성한 분석 결과(신호 처리, 이상 탐지, 제어 시뮬레이션, 데이터 분석)를 JSON 형태로 전달받아 ApexCharts로 시각화하는 Vite 기반 프론트엔드 종합 리포팅 예시입니다.

> **MATLAB**(MATrix LABoratory)은 수학 계산 + 데이터 분석 + 시뮬레이션 + 시각화를 한 번에 처리하는 공학·과학 계산 전문 환경입니다.  
> 이 저장소는 MATLAB 스크립트의 출력 결과(JSON)를 프론트엔드에서 다양한 차트로 리포팅하는 패턴을 보여줍니다.

---

## 📸 결과 화면

### 전체 대시보드 (KPI + 공정 이상 탐지)

![대시보드 상단 — KPI 카드 8개 + 공정 이상 탐지 & 품질 분석 차트](https://github.com/user-attachments/assets/60d4307b-b34d-41c8-83b9-8e5e6d06bab3)

---

## 📊 포함된 리포팅 솔루션

### 1. 공정 이상 탐지 & 품질 분석

| 차트 | 타입 | 설명 |
|------|------|------|
| 진동 RMS 추세 | Line | 시계열 RMS(g) 진동 모니터링 |
| 주파수 대역 스펙트럼 | Bar | 0~500Hz 대역별 진폭 분석 |
| 공정별 이상 확률 | Radar | 5개 공정 존 이상 확률 비교 |
| 품질 분류 비율 | Donut | 정상/재작업/폐기 비율 |
| 모델 성능 vs 목표치 | Mixed (Column + Line) | F1·Precision·Recall·AUC vs 목표 |

### 2. 신호 처리 (Signal Processing)

| 차트 | 타입 | 설명 |
|------|------|------|
| 사인파 시뮬레이션 | Line (2-series) | `y = sin(x)` 순수 파형 vs 노이즈 포함 파형 비교 |
| FFT 주파수 분석 | Bar (distributed + annotation) | Fast Fourier Transform — 피크 주파수(40Hz) 자동 표시 |

```matlab
% MATLAB 대응 코드
x = 0:0.1:10;
y = sin(x);
y_noisy = y + 0.1 * randn(size(x));   % 노이즈 추가
plot(x, y, x, y_noisy);

% FFT
Y = fft(signal);
f = (0:length(Y)-1) * Fs/length(Y);
plot(f, abs(Y));
```

### 3. 제어 공학 (Control Engineering)

| 차트 | 타입 | 설명 |
|------|------|------|
| PID 제어 응답 시뮬레이션 | Line (3-series + annotation) | 목표값(Setpoint) vs 실제 응답 vs 제어 신호, 정착 시간 표시 |

```matlab
% MATLAB 대응 코드 (Simulink / Control System Toolbox)
sys = tf(1, [1 2 1]);          % 2차 시스템
C   = pid(1.2, 0.8, 0.1);      % PID 제어기
T   = feedback(C*sys, 1);
step(T);                        % 계단 응답 플롯
```

### 4. 데이터 분석 & 머신러닝

| 차트 | 타입 | 설명 |
|------|------|------|
| 데이터 분류 산점도 | Scatter (3-class) | K-Means 클러스터링 결과 — 클래스 A/B/C 분리 시각화 |
| 공정 변수 상관 히트맵 | Heatmap | 온도·압력·진동·전류·속도 간 상관계수 행렬 |

```matlab
% MATLAB 대응 코드
% K-Means 클러스터링
[idx, C] = kmeans(X, 3);
gscatter(X(:,1), X(:,2), idx);

% 상관 행렬
R = corrcoef(processData);
heatmap(varNames, varNames, R);
```

---

## 🔢 KPI 카드 (8개)

| KPI | 설명 |
|-----|------|
| 최근 RMS | 최신 진동 RMS(g) 값 |
| 최대 이상 확률 | 공정 중 가장 높은 이상 확률 |
| 정상품 비중 | 품질 분류 중 정상 비율 |
| 모델 평균 점수 | F1/Precision/Recall/AUC 평균 |
| FFT 피크 주파수 | FFT 분석에서 감지된 주파수 피크 |
| SNR | 신호 대 잡음비 (dB) |
| PID 정착 시간 | 제어 응답이 목표값에 정착하는 시간 |
| 분류 클러스터 수 | K-Means 클러스터 개수 |

---

## MATLAB 연동 아이디어

실무에서는 아래 흐름으로 연동할 수 있습니다.

```
MATLAB 스크립트 실행
    → jsonencode()로 결과 직렬화
    → REST API 또는 파일로 프론트엔드 전달
    → ApexCharts 시리즈 데이터로 매핑
    → 브라우저에서 인터랙티브 차트 리포팅
```

예시 MATLAB 코드:

```matlab
result.timestamp       = ["09:00","09:10","09:20"];
result.vibrationRms    = [1.8, 2.1, 2.4];
result.fftPeakHz       = 40;
result.pidSettleTime   = 4.5;
result.clusterCount    = 3;
jsonText = jsonencode(result);
writefile('report.json', jsonText);
```

---

## MATLAB vs Python 비교

| 항목 | MATLAB | Python |
|------|--------|--------|
| 목적 | 공학 계산 특화 | 범용 프로그래밍 |
| 사용성 | 매우 직관적 | 자유도 높음 |
| 비용 | ❌ 유료 | ✅ 무료 |
| 신호처리 | 내장 | SciPy |
| 제어공학 | Control System Toolbox | python-control |
| 머신러닝 | Statistics & ML Toolbox | scikit-learn |
| 시각화 | plot / Simulink | matplotlib / Plotly |

> 👉 **Python 대체**: NumPy (행렬), SciPy (신호처리), scikit-learn (ML), matplotlib (시각화)

---

## 로컬 개발

```bash
npm install
npm run dev
```

## 프로덕션 빌드

```bash
npm run build
npm run preview
```

