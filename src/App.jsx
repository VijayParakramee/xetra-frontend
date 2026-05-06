import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// After deploying backend, replace this with your Railway/Render URL:
// e.g. "https://xetra-backend.railway.app"
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Login credentials (change before deploying!)
const USERS = {
  admin: "xetra2026",
  demo:  "demo123",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const recColor = r => ({
  "STRONG BUY": "#4ade80", BUY: "#86efac", HOLD: "#fbbf24",
  CAUTION: "#fb923c", AVOID: "#f87171",
}[r] || "#94a3b8");

const recBg = r => ({
  "STRONG BUY": "#14532d33", BUY: "#16653133", HOLD: "#78350f33",
  CAUTION: "#7c2d1233", AVOID: "#7f1d1d33",
}[r] || "#1e293b");

function fmt(n, d = 2) { return n != null ? Number(n).toFixed(d) : "—"; }

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#4ade80", w = 110, h = 34 }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ─── CANDLESTICK CHART ────────────────────────────────────────────────────────
function CandlestickChart({ ohlcv = [], indicators = {}, width = 660, height = 280 }) {
  if (!ohlcv.length) return null;
  const visible = ohlcv.slice(-50);
  const n = visible.length;
  const pad = { t: 12, r: 10, b: 22, l: 58 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const colW = W / n;

  const prices = visible.flatMap(d => [d.high, d.low]);
  const bbU = (indicators.bb_upper || []).slice(-n);
  const bbL = (indicators.bb_lower || []).slice(-n);
  if (bbU.some(v => v)) prices.push(...bbU.filter(Boolean), ...bbL.filter(Boolean));

  const minP = Math.min(...prices) * 0.997;
  const maxP = Math.max(...prices) * 1.003;
  const range = maxP - minP || 1;
  const toY = v => H - ((v - minP) / range) * H;

  const sma20 = (indicators.sma20 || []).slice(-n);
  const sma50 = (indicators.sma50 || []).slice(-n);
  const ema9  = (indicators.ema9  || []).slice(-n);

  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, i) => minP + (range / (ticks - 1)) * i);

  const linePath = (arr, color, dash = "") => {
    const pts = arr.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
    if (pts.length < 2) return null;
    return <polyline key={color} fill="none" stroke={color} strokeWidth="1.2"
      strokeDasharray={dash} points={pts.join(" ")} />;
  };

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={0} y1={toY(t)} x2={W} y2={toY(t)} stroke="#ffffff07" />
            <text x={-6} y={toY(t) + 4} fill="#475569" fontSize="9" textAnchor="end">
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Bollinger Band fill */}
        {bbU.length && bbL.length && (() => {
          const upper = bbU.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
          const lower = bbL.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
          if (!upper.length || !lower.length) return null;
          const poly = [...upper, ...[...lower].reverse()].join(" ");
          return <polygon points={poly} fill="#7c3aed08" stroke="none" />;
        })()}

        {linePath(bbU,  "#7c3aed55", "3,2")}
        {linePath(bbL,  "#7c3aed55", "3,2")}
        {linePath(sma50, "#f59e0b", "4,3")}
        {linePath(sma20, "#38bdf8", "3,2")}
        {linePath(ema9,  "#e879f9")}

        {visible.map((d, i) => {
          const x = i * colW + colW / 2;
          const isUp = d.close >= d.open;
          const col = isUp ? "#4ade80" : "#f87171";
          const bodyTop = toY(Math.max(d.open, d.close));
          const bodyH = Math.max(1, Math.abs(toY(d.open) - toY(d.close)));
          return (
            <g key={i}>
              <line x1={x} y1={toY(d.high)} x2={x} y2={toY(d.low)} stroke={col} strokeWidth="1" />
              <rect x={x - colW * 0.35} y={bodyTop} width={colW * 0.7} height={bodyH}
                fill={col} opacity={0.9} rx={0.5} />
            </g>
          );
        })}

        {visible.filter((_, i) => i % 10 === 0).map((d, _, arr) => {
          const i = visible.indexOf(d);
          return (
            <text key={d.date} x={i * colW + colW / 2} y={H + 14}
              fill="#475569" fontSize="8" textAnchor="middle">{d.date?.slice(5)}</text>
          );
        })}
      </g>
    </svg>
  );
}

// ─── RSI CHART ────────────────────────────────────────────────────────────────
function RSIChart({ rsiValues = [], width = 660, height = 80 }) {
  const visible = rsiValues.slice(-50).filter(v => v !== null);
  if (visible.length < 2) return null;
  const pad = { t: 6, r: 10, b: 14, l: 58 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const toY = v => H - (v / 100) * H;
  const pts = visible.map((v, i) => `${(i / (visible.length - 1)) * W},${toY(v)}`).join(" ");
  const last = visible[visible.length - 1];
  const col = last > 70 ? "#f87171" : last < 30 ? "#4ade80" : "#a78bfa";

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {[70, 50, 30].map(v => (
          <g key={v}>
            <line x1={0} y1={toY(v)} x2={W} y2={toY(v)}
              stroke={v === 50 ? "#ffffff0a" : v === 70 ? "#f8717120" : "#4ade8020"}
              strokeWidth="1" strokeDasharray="3,2" />
            <text x={-4} y={toY(v) + 3} fill={v === 70 ? "#f87171" : v === 30 ? "#4ade80" : "#475569"}
              fontSize="7" textAnchor="end">{v}</text>
          </g>
        ))}
        <polyline fill="none" stroke={col} strokeWidth="1.5" points={pts} />
        <text x={-4} y={toY(last) + 3} fill={col} fontSize="7" textAnchor="end" fontWeight="700">
          {last.toFixed(1)}
        </text>
        <text x={4} y={8} fill="#475569" fontSize="7">RSI (14)</text>
      </g>
    </svg>
  );
}

// ─── MACD CHART ───────────────────────────────────────────────────────────────
function MACDChart({ macd = [], signal = [], hist = [], width = 660, height = 70 }) {
  const n = 50;
  const vm = macd.slice(-n).filter(Boolean);
  const vs = signal.slice(-n).filter(Boolean);
  const vh = hist.slice(-n);
  if (vm.length < 2) return null;

  const all = [...vm, ...vs].filter(Boolean);
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const range = maxV - minV || 0.01;
  const pad = { t: 4, r: 10, b: 14, l: 58 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const toY = v => H - ((v - minV) / range) * H;
  const colW = W / n;

  const macdPts = vm.map((v, i) => `${i * colW + colW / 2},${toY(v)}`).join(" ");
  const sigPts  = vs.map((v, i) => `${i * colW + colW / 2},${toY(v)}`).join(" ");
  const zeroY = toY(0);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="#ffffff0a" strokeWidth="1" />
        <text x={4} y={8} fill="#475569" fontSize="7">MACD</text>
        {vh.slice(-n).map((v, i) => v != null ? (
          <rect key={i} x={i * colW + 1} y={v >= 0 ? toY(v) : zeroY}
            width={Math.max(1, colW - 2)}
            height={Math.abs(toY(v) - zeroY)}
            fill={v >= 0 ? "#4ade8033" : "#f8717133"} />
        ) : null)}
        <polyline fill="none" stroke="#f59e0b" strokeWidth="1.2" points={macdPts} />
        <polyline fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="2,2" points={sigPts} />
      </g>
    </svg>
  );
}

// ─── VOLUME CHART ─────────────────────────────────────────────────────────────
function VolumeChart({ ohlcv = [], width = 660, height = 55 }) {
  const visible = ohlcv.slice(-50);
  if (!visible.length) return null;
  const maxV = Math.max(...visible.map(d => d.volume));
  const pad = { t: 4, r: 10, b: 14, l: 58 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const colW = W / visible.length;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        <text x={4} y={8} fill="#475569" fontSize="7">Volume</text>
        {visible.map((d, i) => {
          const barH = (d.volume / maxV) * H;
          const isUp = d.close >= d.open;
          return (
            <rect key={i} x={i * colW + 1} y={H - barH}
              width={Math.max(1, colW - 2)} height={barH}
              fill={isUp ? "#4ade8033" : "#f8717133"} />
          );
        })}
      </g>
    </svg>
  );
}

// ─── AI ANALYSIS ──────────────────────────────────────────────────────────────
function AIAnalysis({ stock, analysis, info }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const prompt = `You are an expert German stock market analyst for XETRA/Frankfurt Stock Exchange, advising Trading212 users.

Stock: ${stock.name} (${stock.symbol})
Sector: ${stock.sector}
${info?.industry ? `Industry: ${info.industry}` : ""}

REAL LIVE TECHNICAL DATA:
- Current Price: €${analysis.price}
- 1-Day Change: ${analysis.change1d}%
- 5-Day Change: ${analysis.change5d}%
- RSI (14): ${analysis.rsi}
- MACD: ${analysis.macd} vs Signal: ${analysis.macd_signal}
- Bollinger Bands: Upper €${analysis.bb_upper} / Mid €${analysis.bb_mid} / Lower €${analysis.bb_lower}
- SMA20: €${analysis.sma20} | SMA50: €${analysis.sma50} | EMA9: €${analysis.ema9}
- Volume: ${analysis.volume?.toLocaleString()} (Avg: ${analysis.avg_volume?.toLocaleString()})
- Composite Score: ${analysis.score}/100
- Recommendation: ${analysis.recommendation}
- Candlestick Pattern: ${analysis.pattern ? analysis.pattern.name + " — " + analysis.pattern.desc : "None detected"}

${info?.trailingPE ? `P/E Ratio: ${info.trailingPE?.toFixed(1)} | Forward P/E: ${info.forwardPE?.toFixed(1)}` : ""}
${info?.dividendYield ? `Dividend Yield: ${(info.dividendYield * 100).toFixed(2)}%` : ""}
${info?.["52wHigh"] ? `52-Week Range: €${info["52wLow"]?.toFixed(2)} – €${info["52wHigh"]?.toFixed(2)}` : ""}
${info?.beta ? `Beta: ${info.beta?.toFixed(2)}` : ""}

Provide a professional analysis in exactly these sections:

**🟢 BUY SIGNAL**
Should a Trading212 user buy this stock right now on XETRA? Give specific reasons using the real data above. Be direct.

**🎯 SELL TARGET & EXIT STRATEGY**
Based on the candlestick pattern, Bollinger Bands and resistance levels, at what price should they take profit? When should they cut losses? Give specific euro price levels.

**⚠️ RISK FACTORS**
Top 2-3 risks specific to this stock and current German market conditions.

**📊 SUMMARY**
One sentence verdict for a swing trader (1-4 week horizon) on Trading212.

Keep it specific to real numbers. No vague generic advice.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      setResult(data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "No result.");
    } catch (e) {
      setResult("⚠️ AI analysis unavailable. Check API connection.");
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 14 }}>
      {!result && !loading && (
        <button onClick={run} style={{
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "9px 20px", fontSize: 12, letterSpacing: "0.05em",
        }}>✦ Run AI Analysis (Real Data)</button>
      )}
      {loading && (
        <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
          Claude is analysing real market data...
        </div>
      )}
      {result && (
        <div style={{
          background: "#1e1b4b22", border: "1px solid #7c3aed44",
          borderRadius: 12, padding: "16px", fontSize: 12,
          lineHeight: 1.8, color: "#c4b5fd", whiteSpace: "pre-wrap"
        }} className="fade-in">
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", marginBottom: 10 }}>
            ✦ CLAUDE AI ANALYSIS — LIVE DATA
          </div>
          {result}
          <button onClick={run} style={{
            marginTop: 12, background: "transparent", color: "#7c3aed",
            border: "1px solid #7c3aed44", borderRadius: 6, padding: "4px 12px", fontSize: 10
          }}>↻ Refresh</button>
        </div>
      )}
    </div>
  );
}

// ─── LIVE NEWS ────────────────────────────────────────────────────────────────
function LiveNews({ stock }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for the very latest news (last 7 days) about ${stock.name} (ticker: ${stock.symbol}, traded on Frankfurt Stock Exchange XETRA). Find:
1. Any recent earnings reports or revenue surprises
2. Major corporate announcements, M&A, management changes
3. Analyst rating changes or price target updates
4. Any regulatory or geopolitical news affecting this stock
5. Overall market sentiment for this German stock

Summarise in 5 bullet points max. End with: OVERALL SENTIMENT: [Bullish/Neutral/Bearish] and a one-line reason why.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n");
      setResult(text || "No news found.");
    } catch (e) {
      setResult("⚠️ News fetch failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!result && !loading && (
        <button onClick={fetch_} style={{
          background: "linear-gradient(135deg,#065f46,#047857)",
          color: "#d1fae5", border: "none", borderRadius: 8,
          padding: "8px 18px", fontSize: 11
        }}>📰 Fetch Live News & Sentiment</button>
      )}
      {loading && <div style={{ color: "#34d399", fontSize: 11 }}>⟳ Searching live news...</div>}
      {result && (
        <div style={{
          background: "#052e1622", border: "1px solid #34d39944",
          borderRadius: 12, padding: "14px", fontSize: 11,
          lineHeight: 1.8, color: "#a7f3d0", whiteSpace: "pre-wrap"
        }} className="fade-in">
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", marginBottom: 8 }}>
            📰 LIVE NEWS SENTIMENT
          </div>
          {result}
          <button onClick={fetch_} style={{
            marginTop: 8, background: "transparent", color: "#34d399",
            border: "1px solid #34d39944", borderRadius: 6, padding: "3px 10px", fontSize: 10
          }}>↻ Refresh news</button>
        </div>
      )}
    </div>
  );
}

// ─── STOCK DETAIL MODAL ───────────────────────────────────────────────────────
function StockModal({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${API_BASE}/stock/${symbol}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [symbol]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      overflowY: "auto", padding: "28px 16px"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
        border: "1px solid #7c3aed44", borderRadius: 20,
        padding: "28px", width: "100%", maxWidth: 740,
        boxShadow: "0 0 60px #7c3aed22"
      }} className="fade-in">

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#a78bfa" }}>
            <div style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
            <div style={{ marginTop: 12, fontSize: 12 }}>Fetching real XETRA data...</div>
          </div>
        )}

        {error && (
          <div style={{ color: "#f87171", padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
            <div>Backend not reachable: {error}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
              Make sure the backend is running (see deployment guide).
            </div>
          </div>
        )}

        {data && (() => {
          const { ohlcv, indicators, analysis, info } = data;
          const stock = { symbol, name: info?.longName || symbol, sector: info?.sector || "" };
          return (
            <>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>
                    {info?.longName || symbol}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {symbol} · {info?.sector || ""} · {info?.industry || ""} · XETRA
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#e2e8f0" }}>€{fmt(analysis.price)}</div>
                  <div style={{ fontSize: 13, color: analysis.change1d >= 0 ? "#4ade80" : "#f87171" }}>
                    {analysis.change1d >= 0 ? "▲" : "▼"} {Math.abs(analysis.change1d).toFixed(2)}% today
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { l: "Score",    v: `${analysis.score}/100`, c: analysis.score >= 50 ? "#4ade80" : analysis.score >= 0 ? "#fbbf24" : "#f87171" },
                  { l: "RSI (14)", v: fmt(analysis.rsi, 1),    c: analysis.rsi < 30 ? "#4ade80" : analysis.rsi > 70 ? "#f87171" : "#94a3b8" },
                  { l: "5D",       v: `${analysis.change5d >= 0 ? "+" : ""}${fmt(analysis.change5d)}%`, c: analysis.change5d >= 0 ? "#4ade80" : "#f87171" },
                  { l: "Pattern",  v: analysis.pattern?.name || "—", c: analysis.pattern?.signal === "bullish" ? "#4ade80" : analysis.pattern?.signal === "bearish" ? "#f87171" : "#94a3b8" },
                ].map(m => (
                  <div key={m.l} style={{ background: "#ffffff06", border: "1px solid #ffffff08", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 4 }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>

              {/* Fundamental data */}
              {(info?.trailingPE || info?.marketCap || info?.dividendYield) && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  {[
                    info?.marketCap && { l: "Mkt Cap", v: `€${(info.marketCap / 1e9).toFixed(1)}B` },
                    info?.trailingPE && { l: "P/E", v: fmt(info.trailingPE, 1) },
                    info?.forwardPE && { l: "Fwd P/E", v: fmt(info.forwardPE, 1) },
                    info?.dividendYield && { l: "Div Yield", v: `${(info.dividendYield * 100).toFixed(2)}%` },
                    info?.beta && { l: "Beta", v: fmt(info.beta, 2) },
                    info?.["52wHigh"] && { l: "52W High", v: `€${fmt(info["52wHigh"])}` },
                    info?.["52wLow"] && { l: "52W Low", v: `€${fmt(info["52wLow"])}` },
                  ].filter(Boolean).map(m => (
                    <div key={m.l} style={{ background: "#ffffff04", border: "1px solid #ffffff08", borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>
                      <span style={{ color: "#475569" }}>{m.l}: </span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{m.v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Charts */}
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "10px 8px", marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 4, paddingLeft: 8 }}>
                  CANDLESTICK CHART · <span style={{ color: "#38bdf8" }}>SMA20</span> · <span style={{ color: "#f59e0b" }}>SMA50</span> · <span style={{ color: "#e879f9" }}>EMA9</span> · <span style={{ color: "#7c3aed" }}>Bollinger Bands</span>
                </div>
                <CandlestickChart ohlcv={ohlcv} indicators={indicators} />
              </div>
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "6px 8px", marginBottom: 4 }}>
                <RSIChart rsiValues={indicators.rsi || []} />
              </div>
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "6px 8px", marginBottom: 4 }}>
                <MACDChart macd={indicators.macd} signal={indicators.macd_signal} hist={indicators.macd_hist} />
              </div>
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "6px 8px", marginBottom: 14 }}>
                <VolumeChart ohlcv={ohlcv} />
              </div>

              {/* Signals */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>TECHNICAL SIGNALS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(analysis.signals || []).map((s, i) => (
                    <div key={i} style={{
                      background: s.type === "buy" ? "#14532d44" : s.type === "sell" ? "#7f1d1d44" : "#1e293b",
                      border: `1px solid ${s.type === "buy" ? "#4ade8044" : s.type === "sell" ? "#f8717144" : "#334155"}`,
                      borderRadius: 8, padding: "5px 10px", fontSize: 10
                    }}>
                      <span style={{ color: s.type === "buy" ? "#4ade80" : s.type === "sell" ? "#f87171" : "#64748b" }}>
                        {s.type === "buy" ? "▲" : s.type === "sell" ? "▼" : "●"}{" "}
                      </span>
                      <span style={{ color: "#cbd5e1" }}>{s.label}</span>
                      <span style={{ color: "#64748b" }}> · {s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div style={{
                background: recBg(analysis.recommendation),
                border: `1px solid ${recColor(analysis.recommendation)}44`,
                borderRadius: 12, padding: "14px 18px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 18
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: recColor(analysis.recommendation), fontFamily: "'Syne',sans-serif" }}>
                  {analysis.recommendation}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Composite score: <strong style={{ color: recColor(analysis.recommendation) }}>{analysis.score}</strong>/100
                  based on RSI, MACD, Bollinger Bands, SMA cross, EMA9, candlestick pattern & volume
                </div>
              </div>

              <AIAnalysis stock={stock} analysis={analysis} info={info} />
              <LiveNews stock={stock} />

              <button onClick={onClose} style={{
                marginTop: 18, background: "transparent", color: "#64748b",
                border: "1px solid #1e293b", borderRadius: 8, padding: "8px 22px", fontSize: 12
              }}>✕ Close</button>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn]   = useState(false);
  const [user, setUser]           = useState("");
  const [pass, setPass]           = useState("");
  const [loginErr, setLoginErr]   = useState("");
  const [stocks, setStocks]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [tab, setTab]             = useState("scanner");
  const [filterSector, setFSec]   = useState("All");
  const [filterRec, setFRec]      = useState("All");
  const [sortBy, setSortBy]       = useState("score");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [backendOK, setBackendOK] = useState(null);
  const timerRef = useRef(null);

  // Check backend health
  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      setBackendOK(r.ok);
    } catch { setBackendOK(false); }
  }, []);

  const loadStocks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/stocks`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const data = await r.json();
      setStocks(data);
      setLastUpdate(new Date());
      setBackendOK(true);
    } catch (e) {
      setError(String(e));
      setBackendOK(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    checkBackend();
    loadStocks();
    timerRef.current = setInterval(loadStocks, 60000); // refresh every 60s
    return () => clearInterval(timerRef.current);
  }, [loggedIn]);

  const handleLogin = () => {
    if (USERS[user] === pass) { setLoggedIn(true); setLoginErr(""); }
    else setLoginErr("Invalid credentials");
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#030712"
    }}>
      <div style={{
        background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
        border: "1px solid #7c3aed44", borderRadius: 20,
        padding: "52px 46px", width: 380, textAlign: "center",
        boxShadow: "0 0 80px #7c3aed18"
      }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>📊</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: "#e2e8f0" }}>
          XETRA INTELLIGENCE
        </div>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.18em", marginBottom: 36, marginTop: 4 }}>
          GERMAN MARKET AI DASHBOARD v2
        </div>
        {[["USERNAME", user, setUser, "text", "admin"],
          ["PASSWORD", pass, setPass, "password", "••••••••"]].map(([label, val, setter, type, ph]) => (
          <div key={label} style={{ marginBottom: 16, textAlign: "left" }}>
            <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.14em", marginBottom: 6 }}>{label}</div>
            <input type={type} value={val}
              onChange={e => setter(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder={ph}
              style={{
                width: "100%", background: "#0f172a",
                border: "1px solid #334155", borderRadius: 8,
                padding: "11px 14px", color: "#e2e8f0", fontSize: 13
              }} />
          </div>
        ))}
        {loginErr && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 10 }}>{loginErr}</div>}
        <button onClick={handleLogin} style={{
          width: "100%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          color: "#fff", border: "none", borderRadius: 10, padding: 13,
          fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Syne',sans-serif"
        }}>ACCESS DASHBOARD →</button>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 18 }}>
          admin / xetra2026 &nbsp;·&nbsp; demo / demo123
        </div>
      </div>
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const sectors = ["All", ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  const recs    = ["All", "STRONG BUY", "BUY", "HOLD", "CAUTION", "AVOID"];

  const displayed = stocks
    .filter(s => filterSector === "All" || s.sector === filterSector)
    .filter(s => filterRec === "All" || s.recommendation === filterRec)
    .sort((a, b) =>
      sortBy === "score"  ? (b.score || 0) - (a.score || 0)  :
      sortBy === "change" ? (b.change1d || 0) - (a.change1d || 0) :
      sortBy === "rsi"    ? (a.rsi || 50) - (b.rsi || 50) :
      sortBy === "price"  ? (b.price || 0) - (a.price || 0) : 0
    );

  const topPicks = displayed.filter(s => ["STRONG BUY", "BUY"].includes(s.recommendation));

  const countByRec = r => stocks.filter(s => s.recommendation === r).length;

  return (
    <div style={{ minHeight: "100vh", background: "#030712" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(90deg,#0f172a,#1e1b4b)",
        borderBottom: "1px solid #1e293b",
        padding: "13px 24px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: "#7c3aed" }}>XETRA</span>
            <span style={{ color: "#e2e8f0" }}> INTELLIGENCE</span>
            <span style={{ color: "#334155", fontSize: 11, marginLeft: 8 }}>v2 · Real Data</span>
          </div>
          <div style={{
            background: backendOK ? "#4ade8022" : "#f8717122",
            border: `1px solid ${backendOK ? "#4ade8044" : "#f8717144"}`,
            borderRadius: 100, padding: "2px 10px", fontSize: 9,
            color: backendOK ? "#4ade80" : "#f87171", letterSpacing: "0.1em",
            animation: backendOK ? "pulse 2s infinite" : "none"
          }}>
            {backendOK === null ? "○ CONNECTING" : backendOK ? "● LIVE" : "● BACKEND OFFLINE"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdate && (
            <div style={{ fontSize: 9, color: "#475569" }}>
              Updated {lastUpdate.toLocaleTimeString("de-DE")} CET
            </div>
          )}
          <button onClick={loadStocks} disabled={loading} style={{
            background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
            borderRadius: 6, padding: "5px 12px", fontSize: 10
          }}>
            {loading ? "⟳ Loading..." : "↻ Refresh"}
          </button>
          <button onClick={() => setLoggedIn(false)} style={{
            background: "transparent", border: "1px solid #334155",
            color: "#64748b", borderRadius: 6, padding: "5px 12px", fontSize: 10
          }}>⬡ Logout</button>
        </div>
      </div>

      {/* Backend offline warning */}
      {backendOK === false && (
        <div style={{
          background: "#7f1d1d44", border: "1px solid #f8717144",
          padding: "12px 24px", fontSize: 11, color: "#fca5a5"
        }}>
          ⚠️ <strong>Backend offline.</strong> Deploy the Python backend to Railway/Render and set{" "}
          <code style={{ background: "#0f172a", padding: "1px 6px", borderRadius: 4 }}>VITE_API_URL</code> in your frontend env.
          See the deployment guide. The dashboard requires the backend for real XETRA data.
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 4 }}>
        {[["scanner","📡 SCANNER"],["picks","⭐ TOP PICKS"],["guide","📖 GUIDE"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: tab === k ? "#7c3aed" : "#0f172a",
            border: `1px solid ${tab === k ? "#7c3aed" : "#1e293b"}`,
            color: tab === k ? "#fff" : "#64748b",
            borderRadius: "8px 8px 0 0", padding: "8px 20px",
            fontSize: 11, letterSpacing: "0.06em"
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <div style={{
          background: "#0a0f1e", border: "1px solid #1e293b",
          borderRadius: "0 12px 12px 12px", padding: "20px"
        }}>

          {/* ── SCANNER TAB ── */}
          {tab === "scanner" && (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  ["STRONG BUY", "#4ade80"], ["BUY","#86efac"],
                  ["HOLD","#fbbf24"], ["CAUTION","#fb923c"], ["AVOID","#f87171"]
                ].map(([r, col]) => (
                  <div key={r} style={{
                    background: recBg(r), border: `1px solid ${col}22`,
                    borderRadius: 12, padding: "12px 14px", cursor: "pointer",
                    opacity: filterRec === r ? 1 : 0.75, transition: "opacity 0.15s"
                  }} onClick={() => setFRec(filterRec === r ? "All" : r)}>
                    <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>{r}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>
                      {loading ? "…" : countByRec(r)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#475569" }}>SECTOR:</span>
                <select value={filterSector} onChange={e => setFSec(e.target.value)} style={{
                  background: "#0f172a", border: "1px solid #334155", color: "#94a3b8",
                  borderRadius: 6, padding: "5px 10px", fontSize: 10
                }}>
                  {sectors.map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 9, color: "#475569", marginLeft: 8 }}>SORT:</span>
                {[["score","Score"],["change","1D %"],["rsi","RSI"],["price","Price"]].map(([k,l]) => (
                  <button key={k} onClick={() => setSortBy(k)} style={{
                    background: sortBy === k ? "#1e293b" : "transparent",
                    border: `1px solid ${sortBy === k ? "#7c3aed" : "#1e293b"}`,
                    color: sortBy === k ? "#a78bfa" : "#475569",
                    borderRadius: 6, padding: "4px 10px", fontSize: 10
                  }}>{l}</button>
                ))}
                {filterRec !== "All" && (
                  <button onClick={() => setFRec("All")} style={{
                    background: "#7f1d1d33", border: "1px solid #f8717144",
                    color: "#f87171", borderRadius: 6, padding: "4px 10px", fontSize: 10
                  }}>✕ {filterRec}</button>
                )}
                <span style={{ fontSize: 9, color: "#475569", marginLeft: "auto" }}>
                  {displayed.length} stocks
                </span>
              </div>

              {/* Table */}
              {loading && !stocks.length ? (
                <div style={{ textAlign: "center", padding: 60, color: "#7c3aed", fontSize: 13 }}>
                  <div style={{ fontSize: 28, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
                  <div style={{ marginTop: 12 }}>Fetching real XETRA data from Yahoo Finance...</div>
                </div>
              ) : error ? (
                <div style={{ color: "#f87171", padding: 40, textAlign: "center" }}>
                  ⚠️ {error}<br />
                  <span style={{ fontSize: 11, color: "#64748b" }}>Backend must be running. See deployment guide tab.</span>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                    <thead>
                      <tr style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>
                        {["STOCK","PRICE","1D %","5D %","RSI","BB POS","SCORE","TREND","CANDLE","RECOMMENDATION"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(s => {
                        const bbPos = s.bb_lower && s.bb_upper
                          ? ((s.price - s.bb_lower) / (s.bb_upper - s.bb_lower) * 100).toFixed(0)
                          : null;
                        return (
                          <tr key={s.symbol} className="stock-row"
                            onClick={() => setSelected(s.symbol)}
                            style={{ background: "#ffffff03", transition: "background 0.15s" }}>
                            <td style={{ padding: "10px 10px", borderRadius: "8px 0 0 8px" }}>
                              <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>
                                {s.symbol.replace(".DE", "")}
                              </div>
                              <div style={{ fontSize: 9, color: "#475569" }}>{s.name?.slice(0, 18)}</div>
                            </td>
                            <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                              {s.price ? `€${fmt(s.price)}` : "—"}
                            </td>
                            <td style={{ padding: "10px 10px", fontSize: 12, color: s.change1d >= 0 ? "#4ade80" : "#f87171" }}>
                              {s.change1d != null ? `${s.change1d >= 0 ? "▲" : "▼"}${Math.abs(s.change1d).toFixed(2)}%` : "—"}
                            </td>
                            <td style={{ padding: "10px 10px", fontSize: 12, color: s.change5d >= 0 ? "#4ade80" : "#f87171" }}>
                              {s.change5d != null ? `${s.change5d >= 0 ? "▲" : "▼"}${Math.abs(s.change5d).toFixed(2)}%` : "—"}
                            </td>
                            <td style={{ padding: "10px 10px", fontSize: 12, color: s.rsi < 30 ? "#4ade80" : s.rsi > 70 ? "#f87171" : "#94a3b8" }}>
                              {s.rsi ? fmt(s.rsi, 1) : "—"}
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              {bbPos != null ? (
                                <div>
                                  <div style={{ background: "#ffffff0a", borderRadius: 3, height: 4, width: 60, overflow: "hidden" }}>
                                    <div style={{
                                      width: `${Math.min(100, Math.max(0, bbPos))}%`, height: "100%",
                                      background: bbPos < 20 ? "#4ade80" : bbPos > 80 ? "#f87171" : "#7c3aed"
                                    }} />
                                  </div>
                                  <div style={{ fontSize: 8, color: "#475569", marginTop: 1 }}>{bbPos}%</div>
                                </div>
                              ) : "—"}
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              <div style={{ background: "#ffffff0a", borderRadius: 3, height: 4, width: 60, overflow: "hidden" }}>
                                <div style={{
                                  width: `${Math.min(100, Math.max(0, s.score + 50))}%`, height: "100%",
                                  background: s.score >= 25 ? "#4ade80" : s.score >= 0 ? "#fbbf24" : "#f87171",
                                  transition: "width 0.3s"
                                }} />
                              </div>
                              <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{s.score}</div>
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              {s.sma20 && s.sma50 ? (
                                <span style={{ fontSize: 10, color: s.sma20 > s.sma50 ? "#4ade80" : "#f87171" }}>
                                  {s.sma20 > s.sma50 ? "▲ UP" : "▼ DOWN"}
                                </span>
                              ) : "—"}
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              {s.pattern ? (
                                <div style={{
                                  background: s.pattern.signal === "bullish" ? "#14532d44" : s.pattern.signal === "bearish" ? "#7f1d1d44" : "#1e293b",
                                  border: `1px solid ${s.pattern.signal === "bullish" ? "#4ade8044" : s.pattern.signal === "bearish" ? "#f8717144" : "#334155"}`,
                                  borderRadius: 6, padding: "2px 7px", fontSize: 9,
                                  color: s.pattern.signal === "bullish" ? "#4ade80" : s.pattern.signal === "bearish" ? "#f87171" : "#64748b"
                                }}>
                                  {s.pattern.name}
                                </div>
                              ) : <span style={{ color: "#1e293b", fontSize: 9 }}>—</span>}
                            </td>
                            <td style={{ padding: "10px 10px", borderRadius: "0 8px 8px 0" }}>
                              <div style={{
                                background: recBg(s.recommendation),
                                border: `1px solid ${recColor(s.recommendation)}44`,
                                borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700,
                                color: recColor(s.recommendation), display: "inline-block"
                              }}>
                                {s.recommendation || "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── TOP PICKS TAB ── */}
          {tab === "picks" && (
            <div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 18, letterSpacing: "0.08em" }}>
                BUY & STRONG BUY — based on real XETRA data · Click any card for full analysis
              </div>
              {loading ? (
                <div style={{ color: "#7c3aed", textAlign: "center", padding: 40 }}>
                  <span style={{ fontSize: 24, display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  <div style={{ marginTop: 10, fontSize: 12 }}>Loading real market data...</div>
                </div>
              ) : topPicks.length === 0 ? (
                <div style={{ color: "#475569", padding: 40, textAlign: "center" }}>
                  No buy signals detected in current market conditions.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
                  {topPicks.map(s => (
                    <div key={s.symbol} onClick={() => setSelected(s.symbol)} style={{
                      background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
                      border: `1px solid ${recColor(s.recommendation)}33`,
                      borderRadius: 16, padding: "18px", cursor: "pointer",
                      boxShadow: `0 0 20px ${recColor(s.recommendation)}0a`,
                      transition: "transform 0.15s, box-shadow 0.15s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>
                            {s.symbol.replace(".DE", "")}
                          </div>
                          <div style={{ fontSize: 10, color: "#475569" }}>{s.name}</div>
                          <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>{s.sector}</div>
                        </div>
                        <div style={{
                          background: recBg(s.recommendation),
                          border: `1px solid ${recColor(s.recommendation)}44`,
                          borderRadius: 8, padding: "5px 10px", fontSize: 10,
                          fontWeight: 700, color: recColor(s.recommendation), height: "fit-content"
                        }}>{s.recommendation}</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {[
                          { l: "Price",  v: `€${fmt(s.price)}` },
                          { l: "RSI",    v: fmt(s.rsi, 1) },
                          { l: "Score",  v: s.score },
                          { l: "1D",     v: `${s.change1d >= 0 ? "+" : ""}${fmt(s.change1d)}%`, c: s.change1d >= 0 ? "#4ade80" : "#f87171" },
                          { l: "5D",     v: `${s.change5d >= 0 ? "+" : ""}${fmt(s.change5d)}%`, c: s.change5d >= 0 ? "#4ade80" : "#f87171" },
                          { l: "MACD",   v: s.macd >= 0 ? "▲" : "▼", c: s.macd >= 0 ? "#4ade80" : "#f87171" },
                        ].map(m => (
                          <div key={m.l} style={{ background: "#ffffff06", borderRadius: 8, padding: "7px 8px" }}>
                            <div style={{ fontSize: 8, color: "#475569" }}>{m.l}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: m.c || "#e2e8f0" }}>{m.v}</div>
                          </div>
                        ))}
                      </div>

                      {s.pattern && (
                        <div style={{
                          fontSize: 10, marginBottom: 10,
                          color: s.pattern.signal === "bullish" ? "#4ade80" : "#f87171"
                        }}>
                          ✦ {s.pattern.name} — {s.pattern.desc}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: "#475569", borderTop: "1px solid #1e293b", paddingTop: 8 }}>
                        BB: {s.bb_lower ? `€${fmt(s.bb_lower)} — €${fmt(s.bb_upper)}` : "—"} &nbsp;|&nbsp;
                        SMA50: {s.sma50 ? `€${fmt(s.sma50)}` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GUIDE TAB ── */}
          {tab === "guide" && (
            <div style={{ maxWidth: 680, fontSize: 12, lineHeight: 1.85, color: "#94a3b8" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 24 }}>
                Deployment & Usage Guide
              </div>

              <div style={{ background: "#4ade8011", border: "1px solid #4ade8044", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 11 }}>
                <strong style={{ color: "#4ade80" }}>✅ Real Data Architecture:</strong>
                <div style={{ color: "#86efac", marginTop: 6 }}>
                  Frontend (Vercel) → Python Backend (Railway) → Yahoo Finance (yfinance) → Real XETRA prices
                </div>
              </div>

              {[
                ["🖥 Step 1: Deploy Backend to Railway (Free)",
                  `1. Go to railway.app → New Project → Deploy from GitHub
2. Upload the /backend folder as a new repo
3. Railway auto-detects Python + requirements.txt
4. Set env var: PORT=8000
5. Your backend URL will be: https://xetra-backend-xxx.railway.app`],
                ["🌐 Step 2: Deploy Frontend to Vercel (Free)",
                  `1. Go to vercel.com → New Project → Import /frontend repo
2. Add Environment Variable: VITE_API_URL = https://your-railway-url.railway.app
3. Deploy — you get: https://xetra-dashboard.vercel.app`],
                ["🔐 Step 3: Change Your Password",
                  `Edit src/App.jsx → find USERS object → change to your credentials:
const USERS = { yourname: "YourSecurePassword!" };
Then git push to auto-redeploy.`],
                ["📊 Reading the Scanner",
                  `Score > 50 = Strong buy zone. Score 25-50 = Buy. 0-25 = Hold. Below 0 = Avoid.
RSI < 30 = oversold (buy opportunity). RSI > 70 = overbought (sell signal).
Bollinger Band % < 20 = price near lower band (buy zone).
All data is real XETRA prices from Yahoo Finance, refreshed every 60 seconds.`],
                ["🕯 Candlestick Patterns Explained",
                  `Hammer: Bullish reversal at support — strong buy signal
Bullish Engulfing: Bulls overwhelm bears — momentum buy
Morning Star: 3-candle reversal — high conviction buy
Shooting Star: Bearish reversal at resistance — consider selling
Bearish Engulfing: Bears take control — avoid or sell
Doji: Indecision — wait for confirmation`],
                ["⏰ Best XETRA Trading Times (CET)",
                  `09:00–09:30: Opening auction (volatile, wait)
09:30–10:30: Best entry window — momentum established
12:00–14:00: Lower volume (lunch dip — can be good entry)
14:30–15:30: US pre-market impact — watch for direction change
17:00–17:30: Closing auction — increased volatility
Avoid: Last 5 minutes before 17:30 close`],
                ["📱 Mobile Access",
                  `Once deployed on Vercel, open the URL on any device, log in, and use it as a mobile web app. Add it to your iPhone/Android home screen for app-like access.`],
              ].map(([title, text]) => (
                <div key={title} style={{ background: "#ffffff04", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <div style={{ color: "#a78bfa", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{title}</div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#94a3b8", fontFamily: "inherit" }}>{text}</pre>
                </div>
              ))}

              <div style={{ background: "#7f1d1d22", border: "1px solid #f8717144", borderRadius: 12, padding: 14, fontSize: 11, color: "#fca5a5" }}>
                ⚠️ <strong>Disclaimer:</strong> This tool uses real market data for educational analysis. Always do your own research. Trading involves risk of loss. Past signals do not guarantee future results.
              </div>
            </div>
          )}

        </div>
      </div>

      {selected && <StockModal symbol={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
