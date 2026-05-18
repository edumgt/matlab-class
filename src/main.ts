import ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import "./style.css";

type Stock = {
  name: string;
  symbol: string;
  sector: string;
  close: number[];
  volume: number[];
  changePct: number;
  volatilityPct: number;
  weightPct: number;
};

type NamedValue = {
  name: string;
  weightPct: number;
};

type HeatmapRow = {
  name: string;
  data: { x: string; y: number }[];
};

type RiskPoint = {
  name: string;
  risk: number;
  return: number;
  weightPct: number;
};

type StockAnalysisResponse = {
  meta: {
    title: string;
    asOf: string;
    currency: string;
    focusSymbol: string;
    benchmarkName: string;
    portfolioName: string;
  };
  summary: {
    kospiLevel: number;
    kospiChangePct: number;
    portfolioValue: number;
    portfolioChangePct: number;
    cashRatio: number;
    topMover: {
      name: string;
      symbol: string;
      changePct: number;
    };
  };
  dates: string[];
  stocks: Stock[];
  benchmarkSeries: {
    portfolio: number[];
    benchmark: number[];
  };
  sectorPerformance: { sector: string; changePct: number }[];
  portfolioAllocation: NamedValue[];
  returnHeatmap: HeatmapRow[];
  riskReturnScatter: RiskPoint[];
};

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app element not found");
}

app.innerHTML = `
  <main class="page">
    <section class="state-card">
      <h1>Python 주가 분석 대시보드 준비 중</h1>
      <p>백엔드에서 종목 데이터를 불러오는 중입니다.</p>
    </section>
  </main>
`;

const currencyFormatter = new Intl.NumberFormat("ko-KR");
const compactNumberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
  legend: { position: "top" },
};

const renderChart = (
  selector: string,
  options: ApexOptions & {
    series?: ApexOptions["series"];
  },
) => {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`${selector} element not found`);
  }
  new ApexCharts(el, options).render();
};

const formatPrice = (value: number) => `${currencyFormatter.format(value)}원`;
const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatVolume = (value: number) => `${compactNumberFormatter.format(value)}주`;

const renderDashboard = (data: StockAnalysisResponse) => {
  const focusStock = data.stocks.find((stock) => stock.symbol === data.meta.focusSymbol) ?? data.stocks[0];
  const avgVolatility =
    data.stocks.reduce((sum, stock) => sum + stock.volatilityPct, 0) / data.stocks.length;
  const sectorOutperformers = data.sectorPerformance.filter((sector) => sector.changePct >= 4).length;

  app.innerHTML = `
    <main class="page">
      <header class="hero">
        <span class="eyebrow">Python Backend · Stock Analytics</span>
        <h1>${data.meta.title}</h1>
        <p>
          Python 백엔드가 제공하는 주가/거래량/섹터 데이터를 기반으로 포트폴리오 흐름과 종목 리스크를 한 화면에서 확인합니다.
        </p>
        <p class="hero-meta">기준일 ${data.meta.asOf} · 기준지수 ${data.meta.benchmarkName}</p>
      </header>

      <section class="kpi-grid">
        <article class="kpi-card">
          <span>${data.meta.benchmarkName}</span>
          <strong>${data.summary.kospiLevel.toFixed(2)}</strong>
          <small>${formatPercent(data.summary.kospiChangePct)}</small>
        </article>
        <article class="kpi-card">
          <span>포트폴리오 평가금액</span>
          <strong>${formatPrice(data.summary.portfolioValue)}</strong>
          <small>${formatPercent(data.summary.portfolioChangePct)}</small>
        </article>
        <article class="kpi-card">
          <span>관심 종목 종가</span>
          <strong>${focusStock.name} ${formatPrice(focusStock.close.at(-1) ?? 0)}</strong>
          <small>${focusStock.symbol}</small>
        </article>
        <article class="kpi-card">
          <span>최고 상승 종목</span>
          <strong>${data.summary.topMover.name}</strong>
          <small>${formatPercent(data.summary.topMover.changePct)}</small>
        </article>
        <article class="kpi-card">
          <span>현금 비중</span>
          <strong>${data.summary.cashRatio}%</strong>
          <small>리밸런싱 대기 자금</small>
        </article>
        <article class="kpi-card">
          <span>평균 변동성</span>
          <strong>${avgVolatility.toFixed(1)}%</strong>
          <small>보유 종목 평균</small>
        </article>
        <article class="kpi-card">
          <span>${focusStock.name} 거래량</span>
          <strong>${formatVolume(focusStock.volume.at(-1) ?? 0)}</strong>
          <small>최근 거래일 기준</small>
        </article>
        <article class="kpi-card">
          <span>강세 섹터 수</span>
          <strong>${sectorOutperformers}개</strong>
          <small>주간 수익률 4% 이상</small>
        </article>
      </section>

      <section class="section-label">📈 시장 흐름 &amp; 포트폴리오 성과</section>
      <section class="chart-grid">
        <article class="chart-card full"><h2>포트폴리오 vs ${data.meta.benchmarkName}</h2><div id="benchmarkChart"></div></article>
        <article class="chart-card"><h2>종목별 종가 추이</h2><div id="priceChart"></div></article>
        <article class="chart-card"><h2>섹터 주간 수익률</h2><div id="sectorChart"></div></article>
      </section>

      <section class="section-label">💼 포트폴리오 구성 &amp; 수급</section>
      <section class="chart-grid">
        <article class="chart-card"><h2>보유 비중</h2><div id="allocationChart"></div></article>
        <article class="chart-card"><h2>${focusStock.name} 거래량 추이</h2><div id="volumeChart"></div></article>
        <article class="chart-card full"><h2>변동성 비교</h2><div id="volatilityChart"></div></article>
      </section>

      <section class="section-label">📊 수익률 분석</section>
      <section class="chart-grid">
        <article class="chart-card"><h2>리스크-리턴 포지셔닝</h2><div id="riskReturnChart"></div></article>
        <article class="chart-card"><h2>일별 수익률 히트맵</h2><div id="returnHeatmapChart"></div></article>
      </section>
    </main>
  `;

  renderChart("#benchmarkChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "line", height: 320 },
    series: [
      { name: data.meta.portfolioName, data: data.benchmarkSeries.portfolio },
      { name: data.meta.benchmarkName, data: data.benchmarkSeries.benchmark },
    ],
    xaxis: { categories: data.dates },
    yaxis: {
      title: { text: "누적 지수" },
      labels: { formatter: (value) => value.toFixed(1) },
    },
    colors: ["#2563EB", "#F97316"],
  });

  renderChart("#priceChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "line", height: 300 },
    series: data.stocks.map((stock) => ({
      name: stock.name,
      data: stock.close,
    })),
    xaxis: { categories: data.dates },
    yaxis: {
      labels: {
        formatter: (value) => `${Math.round(value / 1000)}k`,
      },
      title: { text: "종가" },
    },
  });

  renderChart("#sectorChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "bar", height: 300 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
    series: [
      {
        name: "주간 수익률",
        data: data.sectorPerformance.map((sector) => sector.changePct),
      },
    ],
    xaxis: { categories: data.sectorPerformance.map((sector) => sector.sector) },
    yaxis: {
      title: { text: "수익률 (%)" },
      labels: { formatter: (value) => `${value.toFixed(1)}%` },
    },
    colors: ["#10B981"],
  });

  renderChart("#allocationChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "donut", height: 300 },
    labels: data.portfolioAllocation.map((item) => item.name),
    series: data.portfolioAllocation.map((item) => item.weightPct),
    legend: { position: "bottom" },
  });

  renderChart("#volumeChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "bar", height: 300 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    series: [{ name: "거래량", data: focusStock.volume }],
    xaxis: { categories: data.dates },
    yaxis: {
      title: { text: "거래량" },
      labels: {
        formatter: (value) => compactNumberFormatter.format(value),
      },
    },
    colors: ["#6366F1"],
  });

  renderChart("#volatilityChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "radar", height: 320 },
    series: [{ name: "변동성(%)", data: data.stocks.map((stock) => stock.volatilityPct) }],
    xaxis: { categories: data.stocks.map((stock) => stock.name) },
    yaxis: { max: 40 },
    colors: ["#EF4444"],
  });

  renderChart("#riskReturnChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "scatter", height: 320 },
    series: [
      {
        name: "종목",
        data: data.riskReturnScatter.map((point) => ({
          x: point.risk,
          y: point.return,
          z: point.weightPct,
        })),
      },
    ],
    xaxis: { title: { text: "변동성 (%)" }, tickAmount: 6 },
    yaxis: { title: { text: "기간 수익률 (%)" } },
    markers: { size: 10 },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const point = data.riskReturnScatter[dataPointIndex];
        return `
          <div class="chart-tooltip">
            <strong>${point.name}</strong><br />
            변동성 ${point.risk.toFixed(1)}%<br />
            수익률 ${point.return.toFixed(2)}%<br />
            비중 ${point.weightPct}%
          </div>
        `;
      },
    },
    colors: ["#3B82F6"],
  });

  renderChart("#returnHeatmapChart", {
    ...sharedChart,
    chart: { ...sharedChart.chart, type: "heatmap", height: 320 },
    dataLabels: { enabled: true },
    series: data.returnHeatmap,
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.45,
        colorScale: {
          ranges: [
            { from: -2, to: -0.01, color: "#FCA5A5", name: "하락" },
            { from: 0, to: 0.7, color: "#DBEAFE", name: "보합" },
            { from: 0.71, to: 2.5, color: "#2563EB", name: "상승" },
          ],
        },
      },
    },
    xaxis: { title: { text: "거래일" } },
  });
};

const renderError = () => {
  app.innerHTML = `
    <main class="page">
      <section class="state-card error">
        <h1>데이터를 불러오지 못했습니다.</h1>
        <p>Python 백엔드가 실행 중인지 확인한 뒤 다시 시도해 주세요.</p>
        <code>${API_BASE}/api/stocks</code>
      </section>
    </main>
  `;
};

const bootstrap = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/stocks`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = (await response.json()) as StockAnalysisResponse;
    renderDashboard(data);
  } catch (error) {
    console.error("주가 데이터를 불러오지 못했습니다.", error);
    renderError();
  }
};

void bootstrap();
