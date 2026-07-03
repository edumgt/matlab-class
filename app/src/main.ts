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

type ManufacturingSnapshot = {
  meta: {
    title: string;
    subtitle: string;
    asOf: string;
  };
  kpi: {
    rmsLatest: number;
    maxAnomalyPct: number;
    normalRatioPct: number;
    modelAvgScore: number;
  };
  rmsTrend: { labels: string[]; values: number[] };
  spectrum: { bands: string[]; values: number[] };
  processAnomaly: { labels: string[]; values: number[] };
  qualityRatio: { labels: string[]; values: number[] };
  modelPerformance: { labels: string[]; actual: number[]; target: number[] };
};

type Screen = "kospi" | "manufacturing";

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
  <div class="auth-page">
    <section class="state-card">
      <h1>KOSPI FE 모듈 준비 중</h1>
      <p>지수 데이터를 불러오는 중입니다.</p>
    </section>
  </div>
`;

type TokenSet = {
  access_token: string;
  refresh_token: string;
};

const ACCESS_TOKEN_KEY = "kc_access_token";
const REFRESH_TOKEN_KEY = "kc_refresh_token";

const saveTokens = (tokens: TokenSet) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const tryRefreshSession = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    return false;
  }
  saveTokens((await response.json()) as TokenSet);
  return true;
};

const renderLogin = (errorMessage?: string) => {
  app.innerHTML = `
    <div class="auth-page">
      <form class="login-card" id="loginForm">
        <div class="login-mark" aria-hidden="true"></div>
        <h1>로그인</h1>
        <p>Keycloak 계정으로 로그인하세요.</p>
        ${errorMessage ? `<p class="login-error">${errorMessage}</p>` : ""}
        <label for="loginUsername">아이디</label>
        <input id="loginUsername" name="username" type="text" autocomplete="username" required />
        <label for="loginPassword">비밀번호</label>
        <input id="loginPassword" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">로그인</button>
      </form>
      ${footerHtml}
    </div>
  `;

  const form = document.querySelector<HTMLFormElement>("#loginForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = (document.querySelector<HTMLInputElement>("#loginUsername")?.value ?? "").trim();
    const password = document.querySelector<HTMLInputElement>("#loginPassword")?.value ?? "";
    const submitButton = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "로그인 중...";
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        renderLogin("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      saveTokens((await response.json()) as TokenSet);
      void bootstrap();
    } catch (error) {
      console.error("로그인 요청에 실패했습니다.", error);
      renderLogin("로그인 서버에 연결할 수 없습니다.");
    }
  });
};

const handleLogout = async () => {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error("로그아웃 요청에 실패했습니다.", error);
    }
  }
  renderLogin();
};

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

const percentFormatter = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const footerHtml = `
  <footer class="app-footer">
    <span>(주)에듀엠지티</span>
    <a href="https://www.edumgt.co.kr" target="_blank" rel="noopener noreferrer">www.edumgt.co.kr</a>
  </footer>
`;

const screenNavHtml = (active: Screen) => `
  <nav class="side-nav" aria-label="화면 전환">
    <button type="button" class="side-nav-item${active === "kospi" ? " active" : ""}" data-screen="kospi">KOSPI 대시보드</button>
    <button type="button" class="side-nav-item${active === "manufacturing" ? " active" : ""}" data-screen="manufacturing">제조 분석</button>
  </nav>
`;

/** Wires the offcanvas screen-switch nav shared by every dashboard screen. */
const bindScreenNav = (stocksData: StockAnalysisResponse, current: Screen) => {
  document.querySelectorAll<HTMLButtonElement>(".side-nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.screen as Screen;
      if (target === current) {
        return;
      }
      if (target === "kospi") {
        renderModule(stocksData);
      } else {
        void showManufacturing(stocksData);
      }
    });
  });
};

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
    <div class="auth-page">
      <section class="state-card error">
        <h1>데이터를 불러오지 못했습니다.</h1>
        <p>백엔드 실행 상태를 확인 후 다시 시도해 주세요.</p>
        <code>${API_BASE}/api/stocks</code>
      </section>
      ${footerHtml}
    </div>
  `;
};

const renderModule = (data: StockAnalysisResponse) => {
  const indexViews = createIndexViews(data);
  let active = indexViews[0];
  let chart: ApexCharts | null = null;

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <button type="button" class="icon-button" id="sidebarToggle" aria-label="메뉴 열기" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
        <span class="topbar-title">${data.meta.title}</span>
        <button type="button" class="ghost-button" id="logoutButton">로그아웃</button>
      </header>

      <div class="offcanvas-backdrop" id="offcanvasBackdrop"></div>

      <aside class="offcanvas" id="offcanvas" aria-hidden="true">
        <div class="offcanvas-header">
          <span>메뉴</span>
          <button type="button" class="icon-button" id="offcanvasClose" aria-label="메뉴 닫기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        ${screenNavHtml("kospi")}
        <p class="offcanvas-subheading">Watchlist</p>
        <ul id="watchlist" class="watchlist"></ul>
        <section class="insight-box">
          <h3>오늘의 포인트</h3>
          <p>상승 종목 <strong>${data.summary.topMover.name}</strong> (${percentFormatter(
            data.summary.topMover.changePct,
          )})</p>
          <p>포트폴리오 변화율 <strong>${percentFormatter(data.summary.portfolioChangePct)}</strong></p>
          <p>현금 비중 <strong>${data.summary.cashRatio}%</strong></p>
        </section>
      </aside>

      <main class="content">
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
        ${footerHtml}
      </main>
    </div>
  `;

  document.querySelector<HTMLButtonElement>("#logoutButton")?.addEventListener("click", () => {
    void handleLogout();
  });

  bindScreenNav(data, "kospi");

  const offcanvas = document.querySelector<HTMLElement>("#offcanvas");
  const offcanvasBackdrop = document.querySelector<HTMLElement>("#offcanvasBackdrop");
  const sidebarToggle = document.querySelector<HTMLButtonElement>("#sidebarToggle");

  const setOffcanvasOpen = (open: boolean) => {
    offcanvas?.classList.toggle("open", open);
    offcanvasBackdrop?.classList.toggle("open", open);
    offcanvas?.setAttribute("aria-hidden", open ? "false" : "true");
    sidebarToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  };

  sidebarToggle?.addEventListener("click", () => setOffcanvasOpen(true));
  document.querySelector<HTMLButtonElement>("#offcanvasClose")?.addEventListener("click", () => setOffcanvasOpen(false));
  offcanvasBackdrop?.addEventListener("click", () => setOffcanvasOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOffcanvasOpen(false);
    }
  });

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
        setOffcanvasOpen(false);
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

const scoreFormatter = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const renderManufacturing = (stocksData: StockAnalysisResponse, data: ManufacturingSnapshot) => {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <button type="button" class="icon-button" id="sidebarToggle" aria-label="메뉴 열기" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
        <span class="topbar-title">${data.meta.title}</span>
        <button type="button" class="ghost-button" id="logoutButton">로그아웃</button>
      </header>

      <div class="offcanvas-backdrop" id="offcanvasBackdrop"></div>

      <aside class="offcanvas" id="offcanvas" aria-hidden="true">
        <div class="offcanvas-header">
          <span>메뉴</span>
          <button type="button" class="icon-button" id="offcanvasClose" aria-label="메뉴 닫기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        ${screenNavHtml("manufacturing")}
        <p class="offcanvas-subheading">공정별 이상 확률</p>
        <ul class="watchlist">
          ${data.processAnomaly.labels
            .map(
              (label, i) => `<li>
                <button type="button">
                  <div><strong>${label}</strong></div>
                  <div><strong>${data.processAnomaly.values[i]}%</strong><span>이상 확률</span></div>
                </button>
              </li>`,
            )
            .join("")}
        </ul>
      </aside>

      <main class="content">
        <div class="quote-panel">
          <p class="breadcrumbs">${data.meta.subtitle}</p>
          <h1>${data.meta.title}</h1>
          <div class="quote-meta">
            <span class="meta-chip">numpy</span>
            <span class="meta-chip">scipy.signal</span>
            <span class="meta-chip">기준 시각 ${data.meta.asOf}</span>
          </div>
        </div>

        <div class="mf-kpi-grid">
          <article><span>최근 RMS</span><strong>${data.kpi.rmsLatest} g</strong></article>
          <article><span>최대 이상 확률</span><strong>${data.kpi.maxAnomalyPct}%</strong></article>
          <article><span>정상품 비중</span><strong>${data.kpi.normalRatioPct}%</strong></article>
          <article><span>모델 평균 점수</span><strong>${scoreFormatter.format(data.kpi.modelAvgScore)}</strong></article>
        </div>

        <div class="mf-chart-grid">
          <article class="chart-card">
            <h3>진동 RMS 추세</h3>
            <div id="mfRmsChart"></div>
          </article>
          <article class="chart-card">
            <h3>주파수 대역 스펙트럼</h3>
            <div id="mfSpectrumChart"></div>
          </article>
          <article class="chart-card">
            <h3>공정별 이상 확률</h3>
            <div id="mfRadarChart"></div>
          </article>
          <article class="chart-card">
            <h3>품질 분류 비율</h3>
            <div id="mfDonutChart"></div>
          </article>
        </div>

        <article class="chart-card mf-full">
          <h3>모델 성능 vs 목표치</h3>
          <div id="mfPerfChart"></div>
        </article>

        ${footerHtml}
      </main>
    </div>
  `;

  document.querySelector<HTMLButtonElement>("#logoutButton")?.addEventListener("click", () => {
    void handleLogout();
  });

  bindScreenNav(stocksData, "manufacturing");

  const offcanvas = document.querySelector<HTMLElement>("#offcanvas");
  const offcanvasBackdrop = document.querySelector<HTMLElement>("#offcanvasBackdrop");
  const sidebarToggle = document.querySelector<HTMLButtonElement>("#sidebarToggle");

  const setOffcanvasOpen = (open: boolean) => {
    offcanvas?.classList.toggle("open", open);
    offcanvasBackdrop?.classList.toggle("open", open);
    offcanvas?.setAttribute("aria-hidden", open ? "false" : "true");
    sidebarToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  };

  sidebarToggle?.addEventListener("click", () => setOffcanvasOpen(true));
  document.querySelector<HTMLButtonElement>("#offcanvasClose")?.addEventListener("click", () => setOffcanvasOpen(false));
  offcanvasBackdrop?.addEventListener("click", () => setOffcanvasOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOffcanvasOpen(false);
    }
  });

  new ApexCharts(document.querySelector("#mfRmsChart"), {
    chart: { type: "line", height: 300, toolbar: { show: false }, fontFamily: "Pretendard, system-ui, sans-serif" },
    series: [{ name: "RMS (g)", data: data.rmsTrend.values }],
    colors: ["#6366F1"],
    stroke: { curve: "smooth", width: 2.5 },
    xaxis: { categories: data.rmsTrend.labels },
    yaxis: { title: { text: "RMS(g)" } },
    grid: { borderColor: "#E2E8F0" },
    dataLabels: { enabled: false },
  } satisfies ApexOptions).render();

  new ApexCharts(document.querySelector("#mfSpectrumChart"), {
    chart: { type: "bar", height: 300, toolbar: { show: false }, fontFamily: "Pretendard, system-ui, sans-serif" },
    series: [{ name: "PSD 에너지", data: data.spectrum.values }],
    colors: ["#6366F1"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    xaxis: { categories: data.spectrum.bands },
    grid: { borderColor: "#E2E8F0" },
    dataLabels: { enabled: false },
  } satisfies ApexOptions).render();

  new ApexCharts(document.querySelector("#mfRadarChart"), {
    chart: { type: "radar", height: 300, toolbar: { show: false }, fontFamily: "Pretendard, system-ui, sans-serif" },
    series: [{ name: "이상 확률(%)", data: data.processAnomaly.values }],
    colors: ["#6366F1"],
    xaxis: { categories: data.processAnomaly.labels },
    yaxis: { max: Math.max(40, ...data.processAnomaly.values) },
  } satisfies ApexOptions).render();

  new ApexCharts(document.querySelector("#mfDonutChart"), {
    chart: { type: "donut", height: 300, fontFamily: "Pretendard, system-ui, sans-serif" },
    series: data.qualityRatio.values,
    labels: data.qualityRatio.labels,
    colors: ["#2563EB", "#38BDF8", "#F97316"],
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (value: number) => `${value.toFixed(1)}%` } },
  } satisfies ApexOptions).render();

  new ApexCharts(document.querySelector("#mfPerfChart"), {
    chart: { type: "line", height: 260, toolbar: { show: false }, fontFamily: "Pretendard, system-ui, sans-serif" },
    series: [
      { name: "실측", data: data.modelPerformance.actual },
      { name: "목표", data: data.modelPerformance.target },
    ],
    colors: ["#6366F1", "#38BDF8"],
    stroke: { curve: "smooth", width: 2.5 },
    xaxis: { categories: data.modelPerformance.labels },
    yaxis: { labels: { formatter: (value) => value.toFixed(2) } },
    grid: { borderColor: "#E2E8F0" },
    dataLabels: { enabled: false },
  } satisfies ApexOptions).render();
};

const fetchWithAuth = async (path: string): Promise<Response> =>
  fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });

/** Fetches `path` with the current access token, transparently refreshing
 * once on 401. Returns null (and has already shown the login screen) if the
 * session could not be recovered. */
const fetchAuthed = async (path: string): Promise<Response | null> => {
  let response = await fetchWithAuth(path);
  if (response.status === 401) {
    const refreshed = await tryRefreshSession();
    if (!refreshed) {
      clearTokens();
      renderLogin("세션이 만료되었습니다. 다시 로그인해 주세요.");
      return null;
    }
    response = await fetchWithAuth(path);
  }
  return response;
};

let manufacturingCache: ManufacturingSnapshot | null = null;

const showManufacturing = async (stocksData: StockAnalysisResponse) => {
  if (manufacturingCache) {
    renderManufacturing(stocksData, manufacturingCache);
    return;
  }

  try {
    const response = await fetchAuthed("/api/manufacturing");
    if (!response) {
      return;
    }
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    manufacturingCache = (await response.json()) as ManufacturingSnapshot;
    renderManufacturing(stocksData, manufacturingCache);
  } catch (error) {
    console.error("제조 분석 데이터를 불러오지 못했습니다.", error);
    renderError();
  }
};

const bootstrap = async () => {
  if (!getAccessToken()) {
    renderLogin();
    return;
  }

  try {
    const response = await fetchAuthed("/api/stocks");
    if (!response) {
      return;
    }
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
