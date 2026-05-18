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
};

type IndexKey = "composite" | "k50" | "k200" | "large" | "mid";

type IndexView = {
  key: IndexKey;
  label: string;
  title: string;
  ticker: string;
  color: string;
  series: number[];
};

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app element not found");
}

app.innerHTML = `
  <main class="tv-page">
    <section class="state-card">
      <h1>KOSPI FE 모듈 준비 중</h1>
      <p>지수 데이터를 불러오는 중입니다.</p>
    </section>
  </main>
`;

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

const percentFormatter = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const deriveSeries = (base: number[], multiplier: number, waveScale: number) =>
  base.map((value, index) => {
    const wave = Math.sin(index * 0.9) * waveScale;
    return value * multiplier + wave;
  });

const createIndexViews = (data: StockAnalysisResponse): IndexView[] => {
  const benchmark = data.benchmarkSeries.benchmark;
  const latestBase = benchmark.at(-1) ?? 100;
  const kospiSeries = benchmark.map((value) => (data.summary.kospiLevel * value) / latestBase);

  return [
    {
      key: "composite",
      label: "코스피 종합",
      title: "KOSPI 종합",
      ticker: "KRX:KOSPI",
      color: "#0891B2",
      series: kospiSeries,
    },
    {
      key: "k50",
      label: "코스피 50",
      title: "KOSPI 50",
      ticker: "KRX:KOSPI50",
      color: "#0EA5E9",
      series: deriveSeries(kospiSeries, 0.43, 6),
    },
    {
      key: "k200",
      label: "코스피 200",
      title: "KOSPI 200",
      ticker: "KRX:KOSPI200",
      color: "#2563EB",
      series: deriveSeries(kospiSeries, 0.34, 5.2),
    },
    {
      key: "large",
      label: "코스피 대형주",
      title: "KOSPI 대형주",
      ticker: "KRX:KOSPI-L",
      color: "#7C3AED",
      series: deriveSeries(kospiSeries, 1.72, 8),
    },
    {
      key: "mid",
      label: "코스피 중형주",
      title: "KOSPI 중형주",
      ticker: "KRX:KOSPI-M",
      color: "#EA580C",
      series: deriveSeries(kospiSeries, 1.08, 7),
    },
  ];
};

const getChangePct = (series: number[], lookback = 1) => {
  const latest = series.at(-1);
  const compare = series.at(-(lookback + 1));
  if (latest === undefined || compare === undefined || compare === 0) {
    return 0;
  }
  return ((latest - compare) / compare) * 100;
};

const renderError = () => {
  app.innerHTML = `
    <main class="tv-page">
      <section class="state-card error">
        <h1>데이터를 불러오지 못했습니다.</h1>
        <p>백엔드 실행 상태를 확인 후 다시 시도해 주세요.</p>
        <code>${API_BASE}/api/stocks</code>
      </section>
    </main>
  `;
};

const renderModule = (data: StockAnalysisResponse) => {
  const indexViews = createIndexViews(data);
  let active = indexViews[0];
  let chart: ApexCharts | null = null;

  app.innerHTML = `
    <main class="tv-page">
      <section class="market-shell">
        <div class="quote-panel">
          <p class="breadcrumbs">마켓 / 대한민국 / 지수 / <span id="breadcrumbSymbol">${active.title}</span></p>
          <h1 id="indexTitle">${active.title}</h1>
          <div class="quote-meta">
            <span class="meta-chip" id="indexTicker">${active.ticker}</span>
            <span class="meta-chip">Korea Exchange</span>
            <span class="meta-chip">${data.meta.asOf}</span>
          </div>

          <div class="price-row">
            <strong id="indexPrice">${numberFormatter.format(active.series.at(-1) ?? 0)}</strong>
            <span class="currency">${data.meta.currency}</span>
            <span id="indexDelta" class="delta"></span>
          </div>

          <nav class="index-tabs" aria-label="KOSPI index switch">
            ${indexViews
              .map(
                (index) =>
                  `<button class="index-tab${index.key === active.key ? " active" : ""}" data-key="${index.key}">${index.label}</button>`,
              )
              .join("")}
          </nav>

          <article class="chart-card">
            <div id="mainIndexChart"></div>
          </article>

          <div class="performance-grid">
            <article><span>1D</span><strong id="perf1d"></strong></article>
            <article><span>1W</span><strong id="perf1w"></strong></article>
            <article><span>1M</span><strong id="perf1m"></strong></article>
            <article><span>YTD</span><strong id="perfYtd"></strong></article>
          </div>
        </div>

        <aside class="watch-panel">
          <h2>Watchlist</h2>
          <ul id="watchlist"></ul>
          <section class="insight-box">
            <h3>오늘의 포인트</h3>
            <p>상승 종목 <strong>${data.summary.topMover.name}</strong> (${percentFormatter(
              data.summary.topMover.changePct,
            )})</p>
            <p>포트폴리오 변화율 <strong>${percentFormatter(data.summary.portfolioChangePct)}</strong></p>
            <p>현금 비중 <strong>${data.summary.cashRatio}%</strong></p>
          </section>
        </aside>
      </section>
    </main>
  `;

  const updateTexts = () => {
    const latest = active.series.at(-1) ?? 0;
    const daily = getChangePct(active.series, 1);

    const titleEl = document.querySelector<HTMLElement>("#indexTitle");
    const breadcrumbEl = document.querySelector<HTMLElement>("#breadcrumbSymbol");
    const tickerEl = document.querySelector<HTMLElement>("#indexTicker");
    const priceEl = document.querySelector<HTMLElement>("#indexPrice");
    const deltaEl = document.querySelector<HTMLElement>("#indexDelta");
    const perf1d = document.querySelector<HTMLElement>("#perf1d");
    const perf1w = document.querySelector<HTMLElement>("#perf1w");
    const perf1m = document.querySelector<HTMLElement>("#perf1m");
    const perfYtd = document.querySelector<HTMLElement>("#perfYtd");

    if (
      !titleEl ||
      !breadcrumbEl ||
      !tickerEl ||
      !priceEl ||
      !deltaEl ||
      !perf1d ||
      !perf1w ||
      !perf1m ||
      !perfYtd
    ) {
      return;
    }

    titleEl.textContent = active.title;
    breadcrumbEl.textContent = active.title;
    tickerEl.textContent = active.ticker;
    priceEl.textContent = numberFormatter.format(latest);

    deltaEl.textContent = percentFormatter(daily);
    deltaEl.className = `delta ${daily >= 0 ? "up" : "down"}`;

    perf1d.textContent = percentFormatter(getChangePct(active.series, 1));
    perf1w.textContent = percentFormatter(getChangePct(active.series, Math.min(5, active.series.length - 1)));
    perf1m.textContent = percentFormatter(getChangePct(active.series, Math.min(10, active.series.length - 1)));
    perfYtd.textContent = percentFormatter(getChangePct(active.series, active.series.length - 1));

    [perf1d, perf1w, perf1m, perfYtd].forEach((el) => {
      const value = Number(el.textContent?.replace("%", ""));
      el.classList.toggle("up", value >= 0);
      el.classList.toggle("down", value < 0);
    });
  };

  const renderWatchlist = () => {
    const watchlistEl = document.querySelector<HTMLUListElement>("#watchlist");
    if (!watchlistEl) {
      return;
    }

    watchlistEl.innerHTML = indexViews
      .map((index) => {
        const latest = index.series.at(-1) ?? 0;
        const change = getChangePct(index.series, 1);
        const stateClass = change >= 0 ? "up" : "down";
        const activeClass = index.key === active.key ? "active" : "";
        return `<li class="${activeClass}">
          <button data-key="${index.key}">
            <div>
              <strong>${index.title}</strong>
              <span>${index.ticker}</span>
            </div>
            <div>
              <strong>${numberFormatter.format(latest)}</strong>
              <span class="${stateClass}">${percentFormatter(change)}</span>
            </div>
          </button>
        </li>`;
      })
      .join("");

    watchlistEl.querySelectorAll<HTMLButtonElement>("button[data-key]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = indexViews.find((item) => item.key === button.dataset.key);
        if (!next) {
          return;
        }
        active = next;
        updateTexts();
        renderWatchlist();
        updateChart();
        syncTabs();
      });
    });
  };

  const chartOptions = (): ApexOptions => {
    const dailyChange = getChangePct(active.series, 1);
    const rising = dailyChange >= 0;
    const color = rising ? "#10B981" : "#EF4444";

    return {
      chart: {
        type: "area",
        height: 430,
        toolbar: { show: false },
        fontFamily: "Pretendard, system-ui, sans-serif",
      },
      series: [
        {
          name: active.title,
          data: active.series,
        },
      ],
      colors: [color],
      stroke: {
        curve: "smooth",
        width: 2.5,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.3,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      xaxis: {
        categories: data.dates,
      },
      yaxis: {
        labels: {
          formatter: (value) => numberFormatter.format(value),
        },
      },
      grid: {
        borderColor: "#E2E8F0",
      },
      tooltip: {
        y: {
          formatter: (value) => `${numberFormatter.format(value)} ${data.meta.currency}`,
        },
      },
      dataLabels: { enabled: false },
    };
  };

  const updateChart = () => {
    if (!chart) {
      return;
    }
    chart.updateOptions(chartOptions());
  };

  const syncTabs = () => {
    document.querySelectorAll<HTMLButtonElement>(".index-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.key === active.key);
    });
  };

  const chartContainer = document.querySelector("#mainIndexChart");
  if (!chartContainer) {
    throw new Error("#mainIndexChart element not found");
  }

  chart = new ApexCharts(chartContainer, chartOptions());
  chart.render();

  document.querySelectorAll<HTMLButtonElement>(".index-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = indexViews.find((item) => item.key === tab.dataset.key);
      if (!selected) {
        return;
      }
      active = selected;
      updateTexts();
      updateChart();
      renderWatchlist();
      syncTabs();
    });
  });

  updateTexts();
  renderWatchlist();
};

const bootstrap = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/stocks`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = (await response.json()) as StockAnalysisResponse;
    renderModule(data);
  } catch (error) {
    console.error("주가 데이터를 불러오지 못했습니다.", error);
    renderError();
  }
};

void bootstrap();
