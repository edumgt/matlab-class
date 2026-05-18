# MATLAB 분석 대시보드 (ApexCharts)

MATLAB에서 생성한 분석 결과(신호 처리, 이상 탐지, 제어 시뮬레이션, 데이터 분석)를 JSON 형태로 전달받아 ApexCharts로 시각화하는 Vite 기반 프론트엔드 종합 리포팅 예시입니다.

---

# MATLAB (매트랩) 개요

**MATLAB(매트랩)**은 **MAT**rix **LAB**oratory(행렬 연구소)의 줄임말로, 전 세계의 엔지니어와 과학자들이 가장 많이 사용하는 **수치 해석 및 데이터 시각화용 소프트웨어이자 프로그래밍 언어**입니다.

미국의 MathWorks사에서 개발했으며, 복잡한 수학 계산, 데이터 분석, 알고리즘 개발을 훨씬 쉽고 빠르게 할 수 있도록 도와주는 강력한 툴입니다.

---

## 💡 MATLAB의 핵심 특징 3가지

* **모든 데이터는 '행렬(Matrix)'이다**
    * 일반적인 프로그래밍 언어(C, Java 등)에서는 복잡한 반복문(for, while)을 돌려야 하는 행렬 계산을, MATLAB에서는 단 한 줄의 코드로 가볍게 처리할 수 있습니다.
* **강력한 데이터 시각화(Graph & Plot)**
    * 복잡한 수식이나 방대한 데이터를 2D, 3D 그래프로 아주 쉽게 시각화할 수 있어서 데이터의 트렌드를 한눈에 파악하기 좋습니다.
* **풍부한 툴박스(Toolbox)**
    * 신호 처리, 이미지 처리, 제어 시스템, 딥러닝, 금융 분석 등 각 분야에 특화된 라이브러리(툴박스)가 이미 잘 만들어져 있어서 맨땅에 헤딩할 필요가 없습니다.

---

## 🛠️ 주로 어디에 쓰이나요?

> **"수학적 계산과 시각화가 필요한 거의 모든 공학 분야"**

* **공학 및 과학 연구:** 자동차, 항공우주, 로봇 공학의 제어 시스템 설계
* **신호 처리 및 통신:** 5G/6G 통신 시스템 시뮬레이션, 오디오/비디오 데이터 분석
* **AI 및 머신러닝:** 인공지능 모델 학습 및 데이터 전처리
* **대학 및 연구소:** 공과대학(전자, 기계, 컴퓨터 등)의 전공 수업 및 논문 작성용 필수 프로그램

---

## 🤖 시뮬링크(Simulink)와의 꿀조합

MATLAB을 이야기할 때 빼놓을 수 없는 게 바로 **Simulink**입니다. 블록다이어그램을 마우스로 드래그 앤 드롭하여 시스템을 모델링하고 시뮬레이션할 수 있는 프로그램인데, MATLAB과 완벽히 연동되어 하드웨어(예: 자율주행차, 드론)를 실제로 만들기 전에 가상으로 테스트해 보는 용도로 핵심적인 역할을 합니다.

---

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

