import ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import "./style.css";

type MatlabAnalysisResult = {
  timestamp: string[];
  vibrationRms: number[];
  vibrationSpectrum: { frequencyBand: string; amplitude: number }[];
  anomalyProbability: { zone: string; probability: number }[];
  qualityBreakdown: { category: string; ratio: number }[];
  modelScore: { metric: string; value: number; target: number }[];
};

type SignalSimResult = {
  t: number[];
  sineWave: number[];
  noisySignal: number[];
};

type FftResult = {
  frequency: string[];
  magnitude: number[];
};

type PidResult = {
  t: string[];
  setpoint: number[];
  actual: number[];
  controlSignal: number[];
};

type ScatterPoint = { x: number; y: number };
type ScatterResult = {
  classA: ScatterPoint[];
  classB: ScatterPoint[];
  classC: ScatterPoint[];
};

type HeatmapRow = { name: string; data: { x: string; y: number }[] };

// MATLAB 스크립트가 생성했다고 가정한 결과(JSON 변환본)
const matlabResult: MatlabAnalysisResult = {
  timestamp: [
    "09:00",
    "09:10",
    "09:20",
    "09:30",
    "09:40",
    "09:50",
    "10:00",
    "10:10",
    "10:20",
    "10:30",
    "10:40",
    "10:50",
  ],
  vibrationRms: [1.8, 2.1, 2.4, 2.6, 2.9, 3.2, 3.5, 3.3, 3.1, 2.8, 2.6, 2.5],
  vibrationSpectrum: [
    { frequencyBand: "0~100Hz", amplitude: 0.7 },
    { frequencyBand: "100~200Hz", amplitude: 1.2 },
    { frequencyBand: "200~300Hz", amplitude: 1.9 },
    { frequencyBand: "300~400Hz", amplitude: 1.4 },
    { frequencyBand: "400~500Hz", amplitude: 0.9 },
  ],
  anomalyProbability: [
    { zone: "프레스", probability: 14 },
    { zone: "용접", probability: 37 },
    { zone: "도장", probability: 26 },
    { zone: "조립", probability: 18 },
    { zone: "검사", probability: 9 },
  ],
  qualityBreakdown: [
    { category: "정상", ratio: 78 },
    { category: "재작업", ratio: 12 },
    { category: "폐기", ratio: 10 },
  ],
  modelScore: [
    { metric: "F1", value: 0.91, target: 0.9 },
    { metric: "Precision", value: 0.94, target: 0.9 },
    { metric: "Recall", value: 0.88, target: 0.9 },
    { metric: "AUC", value: 0.96, target: 0.92 },
  ],
};

// --- 신호 시뮬레이션 (x = 0:0.1:10; y = sin(x) + noise) ---
const signalSim: SignalSimResult = (() => {
  const t: number[] = [];
  const sineWave: number[] = [];
  const noisySignal: number[] = [];
  const noise = [
    0.05, -0.08, 0.12, -0.03, 0.07, -0.11, 0.04, -0.06, 0.09, -0.02,
    0.08, -0.07, 0.03, -0.09, 0.06, -0.04, 0.11, -0.05, 0.07, -0.08,
    0.04, -0.06, 0.09, -0.03, 0.07, -0.1, 0.05, -0.07, 0.08, -0.02,
    0.06, -0.09, 0.04, -0.05, 0.1, -0.06, 0.08, -0.03, 0.07, -0.09,
    0.05, -0.08, 0.12, -0.04, 0.06, -0.07, 0.09, -0.05, 0.03, -0.11,
    0.07, -0.06, 0.08, -0.04, 0.05, -0.09, 0.11, -0.03, 0.06, -0.08,
    0.04, -0.07, 0.09, -0.05, 0.07, -0.1, 0.03, -0.06, 0.08, -0.04,
    0.06, -0.09, 0.05, -0.07, 0.11, -0.04, 0.07, -0.08, 0.03, -0.06,
    0.09, -0.05, 0.07, -0.1, 0.04, -0.07, 0.08, -0.03, 0.06, -0.09,
    0.05, -0.08, 0.11, -0.04, 0.07, -0.06, 0.09, -0.05, 0.03, -0.11,
    0.07,
  ];
  for (let i = 0; i <= 100; i++) {
    const x = i * 0.1;
    t.push(Number(x.toFixed(1)));
    const s = Number(Math.sin(x).toFixed(3));
    sineWave.push(s);
    noisySignal.push(Number((s + (noise[i] ?? 0)).toFixed(3)));
  }
  return { t, sineWave, noisySignal };
})();

// --- FFT 주파수 분석 ---
const fftResult: FftResult = {
  frequency: [
    "0Hz", "10Hz", "20Hz", "30Hz", "40Hz", "50Hz",
    "60Hz", "70Hz", "80Hz", "90Hz", "100Hz",
  ],
  magnitude: [0.02, 0.08, 0.45, 1.82, 2.94, 0.87, 0.31, 0.14, 0.06, 0.03, 0.01],
};

// --- PID 제어 응답 시뮬레이션 ---
const pidResult: PidResult = {
  t: ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5",
      "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
  setpoint: Array(21).fill(1.0),
  actual: [
    0.0, 0.18, 0.52, 0.81, 1.05, 1.14, 1.12, 1.07, 1.03, 1.01, 1.0,
    1.0, 0.99, 1.0, 1.0, 1.01, 1.0, 1.0, 1.0, 1.0, 1.0,
  ],
  controlSignal: [
    1.0, 0.82, 0.61, 0.38, 0.19, 0.07, 0.02, 0.0, 0.01, 0.01, 0.0,
    0.0, 0.01, 0.0, 0.0, 0.01, 0.0, 0.0, 0.0, 0.0, 0.0,
  ],
};

// --- 산점도 데이터 분류 (클러스터 A/B/C) ---
const scatterResult: ScatterResult = {
  classA: [
    { x: 1.2, y: 3.1 }, { x: 1.5, y: 3.5 }, { x: 0.9, y: 2.8 },
    { x: 1.8, y: 3.8 }, { x: 1.1, y: 3.3 }, { x: 1.6, y: 3.0 },
    { x: 0.7, y: 3.6 }, { x: 1.4, y: 2.9 }, { x: 1.0, y: 3.7 },
    { x: 1.7, y: 3.2 },
  ],
  classB: [
    { x: 4.1, y: 1.2 }, { x: 4.5, y: 0.9 }, { x: 3.8, y: 1.5 },
    { x: 4.3, y: 1.1 }, { x: 4.7, y: 1.4 }, { x: 3.9, y: 0.8 },
    { x: 4.4, y: 1.6 }, { x: 4.0, y: 1.0 }, { x: 4.6, y: 1.3 },
    { x: 3.7, y: 1.2 },
  ],
  classC: [
    { x: 2.5, y: 2.2 }, { x: 3.1, y: 2.5 }, { x: 2.8, y: 1.9 },
    { x: 3.3, y: 2.8 }, { x: 2.6, y: 2.4 }, { x: 3.0, y: 2.1 },
    { x: 2.9, y: 2.7 }, { x: 2.4, y: 2.3 }, { x: 3.2, y: 2.0 },
    { x: 2.7, y: 2.6 },
  ],
};

// --- 상관 히트맵 (공정 변수 간 상관계수) ---
const heatmapData: HeatmapRow[] = [
  {
    name: "온도",
    data: [
      { x: "온도", y: 100 }, { x: "압력", y: 72 }, { x: "진동", y: 55 },
      { x: "전류", y: 38 }, { x: "속도", y: 61 },
    ],
  },
  {
    name: "압력",
    data: [
      { x: "온도", y: 72 }, { x: "압력", y: 100 }, { x: "진동", y: 80 },
      { x: "전류", y: 45 }, { x: "속도", y: 53 },
    ],
  },
  {
    name: "진동",
    data: [
      { x: "온도", y: 55 }, { x: "압력", y: 80 }, { x: "진동", y: 100 },
      { x: "전류", y: 67 }, { x: "속도", y: 43 },
    ],
  },
  {
    name: "전류",
    data: [
      { x: "온도", y: 38 }, { x: "압력", y: 45 }, { x: "진동", y: 67 },
      { x: "전류", y: 100 }, { x: "속도", y: 88 },
    ],
  },
  {
    name: "속도",
    data: [
      { x: "온도", y: 61 }, { x: "압력", y: 53 }, { x: "진동", y: 43 },
      { x: "전류", y: 88 }, { x: "속도", y: 100 },
    ],
  },
];

const avgModelScore = (
  matlabResult.modelScore.reduce((sum, item) => sum + item.value, 0) /
  matlabResult.modelScore.length
).toFixed(2);

const snr = (() => {
  const signalPower =
    signalSim.sineWave.reduce((s, v) => s + v * v, 0) / signalSim.sineWave.length;
  const noisePower =
    signalSim.noisySignal.reduce((s, v, i) => {
      const d = v - signalSim.sineWave[i];
      return s + d * d;
    }, 0) / signalSim.noisySignal.length;
  return (10 * Math.log10(signalPower / noisePower)).toFixed(1);
})();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app element not found");

app.innerHTML = `
  <main class="page">
    <header class="hero">
      <h1>MATLAB + ApexCharts 분석 대시보드</h1>
      <p>
        MATLAB에서 신호 처리/이상 탐지/제어 시뮬레이션 결과를 JSON으로 전달받아 프론트엔드에서 시각화한 종합 리포팅 예시입니다.
      </p>
    </header>

    <section class="kpi-grid">
      <article class="kpi-card">
        <span>최근 RMS</span>
        <strong>${matlabResult.vibrationRms.at(-1)} g</strong>
      </article>
      <article class="kpi-card">
        <span>최대 이상 확률</span>
        <strong>${Math.max(...matlabResult.anomalyProbability.map((x) => x.probability))}%</strong>
      </article>
      <article class="kpi-card">
        <span>정상품 비중</span>
        <strong>${matlabResult.qualityBreakdown[0].ratio}%</strong>
      </article>
      <article class="kpi-card">
        <span>모델 평균 점수</span>
        <strong>${avgModelScore}</strong>
      </article>
      <article class="kpi-card">
        <span>FFT 피크 주파수</span>
        <strong>40Hz</strong>
      </article>
      <article class="kpi-card">
        <span>SNR (신호 대 잡음비)</span>
        <strong>${snr} dB</strong>
      </article>
      <article class="kpi-card">
        <span>PID 정착 시간</span>
        <strong>4.5 s</strong>
      </article>
      <article class="kpi-card">
        <span>분류 클러스터 수</span>
        <strong>3 개</strong>
      </article>
    </section>

    <section class="section-label">📊 공정 이상 탐지 &amp; 품질 분석</section>
    <section class="chart-grid">
      <article class="chart-card"><h2>진동 RMS 추세</h2><div id="rmsChart"></div></article>
      <article class="chart-card"><h2>주파수 대역 스펙트럼</h2><div id="spectrumChart"></div></article>
      <article class="chart-card"><h2>공정별 이상 확률</h2><div id="anomalyChart"></div></article>
      <article class="chart-card"><h2>품질 분류 비율</h2><div id="qualityChart"></div></article>
      <article class="chart-card full"><h2>모델 성능 vs 목표치</h2><div id="modelChart"></div></article>
    </section>

    <section class="section-label">🔬 신호 처리 (Signal Processing)</section>
    <section class="chart-grid">
      <article class="chart-card full"><h2>사인파 시뮬레이션 — sin(x) + 노이즈</h2><div id="sineChart"></div></article>
      <article class="chart-card full"><h2>FFT 주파수 분석 (Fast Fourier Transform)</h2><div id="fftChart"></div></article>
    </section>

    <section class="section-label">⚙️ 제어 공학 (Control Engineering)</section>
    <section class="chart-grid">
      <article class="chart-card full"><h2>PID 제어 응답 시뮬레이션</h2><div id="pidChart"></div></article>
    </section>

    <section class="section-label">📈 데이터 분석 &amp; 머신러닝</section>
    <section class="chart-grid">
      <article class="chart-card full"><h2>데이터 분류 산점도 (K-Means 클러스터링)</h2><div id="scatterChart"></div></article>
      <article class="chart-card full"><h2>공정 변수 상관 히트맵</h2><div id="heatmapChart"></div></article>
    </section>
  </main>
`;

const sharedChart: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: "Pretendard, system-ui, sans-serif",
  },
  theme: {
    palette: "palette2",
  },
  dataLabels: { enabled: false },
  stroke: { curve: "smooth" },
};

const render = (selector: string, options: ApexOptions) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`${selector} element not found`);
  new ApexCharts(el, options).render();
};

// ── 공정 이상 탐지 & 품질 분석 ──────────────────────────────────────────────

render("#rmsChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "line", height: 280 },
  series: [{ name: "RMS(g)", data: matlabResult.vibrationRms }],
  xaxis: { categories: matlabResult.timestamp },
  yaxis: { title: { text: "RMS(g)" } },
});

render("#spectrumChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "bar", height: 280 },
  plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
  series: [{ name: "진폭", data: matlabResult.vibrationSpectrum.map((x) => x.amplitude) }],
  xaxis: { categories: matlabResult.vibrationSpectrum.map((x) => x.frequencyBand) },
});

render("#anomalyChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "radar", height: 280 },
  series: [{ name: "이상 확률(%)", data: matlabResult.anomalyProbability.map((x) => x.probability) }],
  xaxis: { categories: matlabResult.anomalyProbability.map((x) => x.zone) },
  yaxis: { max: 40 },
});

render("#qualityChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "donut", height: 280 },
  labels: matlabResult.qualityBreakdown.map((x) => x.category),
  series: matlabResult.qualityBreakdown.map((x) => x.ratio),
  legend: { position: "bottom" },
});

render("#modelChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "line", height: 320 },
  stroke: { width: [0, 3], curve: "straight" },
  series: [
    {
      name: "실측",
      type: "column",
      data: matlabResult.modelScore.map((x) => Number(x.value.toFixed(2))),
    },
    {
      name: "목표",
      type: "line",
      data: matlabResult.modelScore.map((x) => Number(x.target.toFixed(2))),
    },
  ],
  xaxis: { categories: matlabResult.modelScore.map((x) => x.metric) },
  yaxis: { min: 0.7, max: 1 },
});

// ── 신호 처리 ────────────────────────────────────────────────────────────────

render("#sineChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "line", height: 300 },
  series: [
    { name: "sin(x)", data: signalSim.sineWave },
    { name: "sin(x) + noise", data: signalSim.noisySignal },
  ],
  xaxis: {
    categories: signalSim.t,
    tickAmount: 10,
    title: { text: "x (0–10 rad)" },
  },
  yaxis: { min: -1.5, max: 1.5, title: { text: "진폭" } },
  stroke: { width: [2, 1], curve: "smooth" },
  colors: ["#3B82F6", "#F59E0B"],
  tooltip: { x: { formatter: (v: number) => `x = ${v}` } },
});

render("#fftChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "bar", height: 300 },
  plotOptions: { bar: { borderRadius: 6, columnWidth: "55%", distributed: true } },
  series: [{ name: "크기(Magnitude)", data: fftResult.magnitude }],
  xaxis: {
    categories: fftResult.frequency,
    title: { text: "주파수 (Hz)" },
  },
  yaxis: { title: { text: "크기" } },
  legend: { show: false },
  colors: [
    "#6366F1", "#6366F1", "#6366F1", "#6366F1", "#EF4444",
    "#6366F1", "#6366F1", "#6366F1", "#6366F1", "#6366F1", "#6366F1",
  ],
  annotations: {
    xaxis: [
      {
        x: "40Hz",
        borderColor: "#EF4444",
        label: { text: "피크 40Hz", style: { color: "#fff", background: "#EF4444" } },
      },
    ],
  },
});

// ── 제어 공학 ────────────────────────────────────────────────────────────────

render("#pidChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "line", height: 340 },
  series: [
    { name: "목표값 (Setpoint)", data: pidResult.setpoint },
    { name: "실제 응답 (Actual)", data: pidResult.actual },
    { name: "제어 신호 (Control Signal)", data: pidResult.controlSignal },
  ],
  xaxis: {
    categories: pidResult.t,
    title: { text: "시간 (s)" },
  },
  yaxis: { min: -0.1, max: 1.3, title: { text: "값" } },
  // dashArray: setpoint(dashed) | actual | control signal
  stroke: { width: [2, 2, 1], curve: "smooth", dashArray: [4, 0, 0] },
  colors: ["#10B981", "#3B82F6", "#F59E0B"],
  annotations: {
    xaxis: [
      {
        x: "4.5",
        borderColor: "#6366F1",
        label: {
          text: "정착 시간 ≈ 4.5s",
          style: { color: "#fff", background: "#6366F1" },
        },
      },
    ],
  },
});

// ── 데이터 분석 & 머신러닝 ──────────────────────────────────────────────────

render("#scatterChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "scatter", height: 360 },
  series: [
    { name: "클래스 A", data: scatterResult.classA },
    { name: "클래스 B", data: scatterResult.classB },
    { name: "클래스 C", data: scatterResult.classC },
  ],
  xaxis: { title: { text: "특징 1 (Feature 1)" }, tickAmount: 8 },
  yaxis: { title: { text: "특징 2 (Feature 2)" } },
  markers: { size: 8 },
  colors: ["#3B82F6", "#EF4444", "#10B981"],
});

render("#heatmapChart", {
  ...sharedChart,
  chart: { ...sharedChart.chart, type: "heatmap", height: 320 },
  dataLabels: { enabled: true },
  series: heatmapData,
  colors: ["#3B82F6"],
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.5,
      colorScale: {
        ranges: [
          { from: 0, to: 40, color: "#EFF6FF", name: "낮음" },
          { from: 41, to: 70, color: "#93C5FD", name: "중간" },
          { from: 71, to: 100, color: "#1D4ED8", name: "높음" },
        ],
      },
    },
  },
  xaxis: { title: { text: "공정 변수" } },
});
