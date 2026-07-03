import numpy as np
from scipy.signal import welch

_SEED = 42
_FS = 1000  # Hz, synthetic vibration sampling rate
_WINDOW_SECONDS = 2

TIME_LABELS = [f"{9 + i // 6:02d}:{(i % 6) * 10:02d}" for i in range(12)]  # 09:00 .. 10:50
PROCESS_LABELS = ["프레스", "용접", "도장", "조립", "검사"]
_BAND_EDGES = [0, 100, 200, 300, 400, 500]
BAND_LABELS = [f"{_BAND_EDGES[i]}~{_BAND_EDGES[i + 1]}Hz" for i in range(len(_BAND_EDGES) - 1)]
METRIC_LABELS = ["F1", "Precision", "Recall", "AUC"]


def _vibration_window(rng: np.random.Generator, amplitude: float) -> np.ndarray:
    t = np.arange(0, _WINDOW_SECONDS, 1 / _FS)
    signal = (
        0.60 * np.sin(2 * np.pi * 60 * t)
        + 0.50 * np.sin(2 * np.pi * 150 * t)
        + 0.40 * np.sin(2 * np.pi * 250 * t)
        + 0.15 * np.sin(2 * np.pi * 350 * t)
        + 0.05 * rng.standard_normal(t.size)
    )
    return amplitude * signal


def _rms(signal: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(signal))))


def build_manufacturing_snapshot() -> dict:
    """Simulate a shift's vibration/quality telemetry and derive the same
    panels the original MATLAB-style demo showed, using real numpy/scipy
    signal processing (RMS, Welch PSD band energy) instead of static JSON.
    """
    rng = np.random.default_rng(_SEED)

    # RMS trend: warm-up -> peak -> cool-down envelope across the shift, each
    # point backed by an actually-generated vibration window.
    n = len(TIME_LABELS)
    envelope = np.exp(-((np.arange(n) - n / 2.6) ** 2) / (2 * (n / 3.2) ** 2))
    amplitudes = 1.6 + envelope * 1.1 + rng.normal(0, 0.03, n)

    rms_values: list[float] = []
    peak_window = None
    peak_amplitude = -np.inf
    for amplitude in amplitudes:
        window = _vibration_window(rng, float(amplitude))
        rms_values.append(round(_rms(window), 2))
        if amplitude > peak_amplitude:
            peak_amplitude = amplitude
            peak_window = window

    # Frequency-band spectrum via Welch PSD on the peak-amplitude window.
    freqs, psd = welch(peak_window, fs=_FS, nperseg=512)
    band_values = []
    for lo, hi in zip(_BAND_EDGES[:-1], _BAND_EDGES[1:]):
        mask = (freqs >= lo) & (freqs < hi)
        band_energy = float(np.trapezoid(psd[mask], freqs[mask])) if mask.any() else 0.0
        band_values.append(round(band_energy, 3))

    # Process anomaly radar: logistic transform of simulated deviation scores.
    deviations = rng.normal(0.4, 0.6, len(PROCESS_LABELS))
    anomaly_pct = 1 / (1 + np.exp(-deviations))
    anomaly_pct = np.clip(anomaly_pct * 45, 3, 40)

    # Quality classification: threshold simulated per-unit inspection scores.
    inspection_scores = rng.normal(0.15, 0.12, 500)
    normal_pct = float(np.mean(inspection_scores < 0.20)) * 100
    rework_pct = float(np.mean((inspection_scores >= 0.20) & (inspection_scores < 0.35))) * 100
    scrap_pct = 100 - normal_pct - rework_pct

    # Model performance vs target.
    target = np.array([0.85, 0.85, 0.85, 0.85])
    actual = target + rng.normal(0.01, 0.015, len(METRIC_LABELS))

    return {
        "meta": {
            "title": "MATLAB 스타일 제조 분석 대시보드",
            "subtitle": "numpy/scipy로 계산한 신호 처리·이상 탐지 결과",
            "asOf": TIME_LABELS[-1],
        },
        "kpi": {
            "rmsLatest": rms_values[-1],
            "maxAnomalyPct": round(float(np.max(anomaly_pct)), 1),
            "normalRatioPct": round(normal_pct, 1),
            "modelAvgScore": round(float(np.mean(actual)), 2),
        },
        "rmsTrend": {"labels": TIME_LABELS, "values": rms_values},
        "spectrum": {"bands": BAND_LABELS, "values": band_values},
        "processAnomaly": {
            "labels": PROCESS_LABELS,
            "values": [round(float(v), 1) for v in anomaly_pct],
        },
        "qualityRatio": {
            "labels": ["정상", "재작업", "폐기"],
            "values": [round(normal_pct, 1), round(rework_pct, 1), round(scrap_pct, 1)],
        },
        "modelPerformance": {
            "labels": METRIC_LABELS,
            "actual": [round(float(v), 3) for v in actual],
            "target": [round(float(v), 3) for v in target],
        },
    }
