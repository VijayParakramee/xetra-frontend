import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "/api";
const USERS = { vijay: "Parakramee2026!", demo: "demo123" };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) => n != null ? Number(n).toFixed(d) : "—";
const recColor  = r => ({ "STRONG BUY": "#4ade80", BUY: "#86efac", HOLD: "#fbbf24", CAUTION: "#fb923c", AVOID: "#f87171" }[r] || "#94a3b8");
const recBg     = r => ({ "STRONG BUY": "#14532d33", BUY: "#16653133", HOLD: "#78350f33", CAUTION: "#7c2d1233", AVOID: "#7f1d1d33" }[r] || "#1e293b");
const sellColor = r => ({ "STRONG SELL": "#f87171", SELL: "#fb923c", WATCH: "#fbbf24", HOLD: "#4ade80" }[r] || "#94a3b8");
const sellBg    = r => ({ "STRONG SELL": "#7f1d1d33", SELL: "#7c2d1233", WATCH: "#78350f33", HOLD: "#14532d33" }[r] || "#1e293b");

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#4ade80", w = 110, h = 34 }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ─── PRICE LEVELS PANEL ───────────────────────────────────────────────────────
function PriceLevels({ analysis }) {
  const { price, stop_loss, target1, target2, target3, risk_reward, risk_pct, reward_pct, buy_zone_low, buy_zone_high } = analysis;
  if (!stop_loss) return null;

  const levels = [
    { label: "🎯 Target 3", value: target3, color: "#4ade80", desc: "Maximum target — 52W high zone" },
    { label: "🎯 Target 2", value: target2, color: "#86efac", desc: "Main target — Upper BB / SMA50" },
    { label: "🎯 Target 1", value: target1, color: "#bef264", desc: "First exit — sell 50% here" },
    { label: "📍 Current",  value: price,   color: "#e2e8f0", desc: "Current market price", current: true },
    { label: "🟡 Buy Zone", value: `€${fmt(buy_zone_low)} – €${fmt(buy_zone_high)}`, color: "#fbbf24", desc: "Ideal entry zone", isRange: true },
    { label: "🛑 Stop Loss", value: stop_loss, color: "#f87171", desc: `Cut loss here — ${risk_pct}% below entry` },
  ];

  const allPrices = [stop_loss, target1, target2, target3].filter(Boolean);
  const minP = Math.min(...allPrices) * 0.995;
  const maxP = Math.max(...allPrices) * 1.005;
  const range = maxP - minP || 1;
  const toY = v => ((maxP - v) / range) * 200;

  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em", marginBottom: 14 }}>
        📊 PRICE LEVELS & TARGETS
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {/* Visual price ladder */}
        <div style={{ position: "relative", height: 220 }}>
          <svg width="100%" height="220" viewBox="0 0 200 220">
            {/* Background lines */}
            {[target3, target2, target1, price, stop_loss].filter(Boolean).map((v, i) => (
              <line key={i} x1="40" y1={toY(v)} x2="180" y2={toY(v)}
                stroke={i === 3 ? "#ffffff15" : i === 4 ? "#f8717133" : "#4ade8022"}
                strokeWidth="1" strokeDasharray="3,2" />
            ))}
            {/* Price bar */}
            <rect x="85" y={toY(target3)} width="30"
              height={Math.max(2, toY(stop_loss) - toY(target3))}
              fill="url(#priceGrad)" rx="3" opacity="0.3" />
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
            {/* Labels */}
            {[
              { v: target3, label: `€${fmt(target3)}`, color: "#4ade80" },
              { v: target2, label: `€${fmt(target2)}`, color: "#86efac" },
              { v: target1, label: `€${fmt(target1)}`, color: "#bef264" },
              { v: price,   label: `€${fmt(price)} ◄`, color: "#e2e8f0" },
              { v: stop_loss, label: `€${fmt(stop_loss)}`, color: "#f87171" },
            ].map((item, i) => (
              <g key={i}>
                <circle cx="100" cy={toY(item.v)} r="3" fill={item.color} />
                <text x="108" y={toY(item.v) + 4} fill={item.color} fontSize="8">{item.label}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Level list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {levels.map((l, i) => (
            <div key={i} style={{
              background: l.current ? "#ffffff0a" : "#ffffff04",
              border: `1px solid ${l.current ? "#ffffff22" : "#ffffff08"}`,
              borderRadius: 8, padding: "7px 10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>{l.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>
                  {l.isRange ? l.value : `€${fmt(l.value)}`}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk/Reward */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { l: "Risk", v: `-${fmt(risk_pct)}%`, c: "#f87171" },
          { l: "Reward", v: `+${fmt(reward_pct)}%`, c: "#4ade80" },
          { l: "R:R Ratio", v: `1 : ${fmt(risk_reward)}`, c: risk_reward >= 2 ? "#4ade80" : risk_reward >= 1.5 ? "#fbbf24" : "#f87171" },
        ].map(m => (
          <div key={m.l} style={{ background: "#ffffff06", borderRadius: 8, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#475569" }}>{m.l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.c, marginTop: 2 }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#475569", marginTop: 10, padding: "8px", background: "#ffffff04", borderRadius: 6 }}>
        💡 <strong style={{ color: "#94a3b8" }}>Strategy:</strong> Buy in the yellow zone → Sell 50% at Target 1 → Move stop loss to entry price → Sell remaining at Target 2
      </div>
    </div>
  );
}

// ─── SELL SIGNALS PANEL ───────────────────────────────────────────────────────
function SellSignalsPanel({ sellSignals = [], sellRating }) {
  if (!sellSignals.length) return (
    <div style={{ background: "#14532d22", border: "1px solid #4ade8033", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ color: "#4ade80", fontSize: 12 }}>✅ No sell signals detected — stock can be held</div>
    </div>
  );

  return (
    <div style={{ background: "#7f1d1d22", border: "1px solid #f8717144", borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>🔴 SELL SIGNALS DETECTED</div>
        <div style={{
          background: sellBg(sellRating), border: `1px solid ${sellColor(sellRating)}44`,
          borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700,
          color: sellColor(sellRating)
        }}>{sellRating}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sellSignals.map((s, i) => (
          <div key={i} style={{
            background: s.urgency === "high" ? "#7f1d1d44" : "#7c2d1244",
            border: `1px solid ${s.urgency === "high" ? "#f8717144" : "#fb923c44"}`,
            borderRadius: 8, padding: "10px 12px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ color: s.urgency === "high" ? "#f87171" : "#fb923c", fontSize: 12, fontWeight: 700 }}>
                {s.urgency === "high" ? "🔴" : "🟠"} {s.type}
              </span>
              <span style={{
                background: s.strength === "strong" ? "#7f1d1d" : "#78350f",
                color: s.strength === "strong" ? "#f87171" : "#fbbf24",
                borderRadius: 4, padding: "2px 6px", fontSize: 9
              }}>{s.strength.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#f87171", marginTop: 10, padding: "8px", background: "#7f1d1d33", borderRadius: 6 }}>
        ⚠️ Multiple sell signals active. Consider taking profit or tightening stop loss.
      </div>
    </div>
  );
}

// ─── TRADE JOURNAL ────────────────────────────────────────────────────────────
function TradeJournal() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem("parakramee_trades") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ symbol: "", buyPrice: "", quantity: "", stopLoss: "", target1: "", target2: "", notes: "" });
  const [adding, setAdding] = useState(false);

  const save = (updated) => {
    setTrades(updated);
    localStorage.setItem("parakramee_trades", JSON.stringify(updated));
  };

  const addTrade = () => {
    if (!form.symbol || !form.buyPrice) return;
    const trade = { ...form, id: Date.now(), date: new Date().toISOString().split("T")[0], status: "OPEN" };
    save([trade, ...trades]);
    setForm({ symbol: "", buyPrice: "", quantity: "", stopLoss: "", target1: "", target2: "", notes: "" });
    setAdding(false);
  };

  const closeTrade = (id, closePrice) => {
    save(trades.map(t => t.id === id ? { ...t, status: "CLOSED", closePrice, closeDate: new Date().toISOString().split("T")[0] } : t));
  };

  const deleteTrade = (id) => save(trades.filter(t => t.id !== id));

  const inputStyle = {
    background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
    padding: "7px 10px", color: "#e2e8f0", fontSize: 11, width: "100%"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.08em" }}>
          YOUR TRADE JOURNAL — {trades.filter(t => t.status === "OPEN").length} open positions
        </div>
        <button onClick={() => setAdding(!adding)} style={{
          background: "linear-gradient(135deg,#4ade80,#22c55e)", color: "#000",
          border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 11, fontWeight: 700
        }}>+ Log New Trade</button>
      </div>

      {/* Add trade form */}
      {adding && (
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 14, fontWeight: 700 }}>📝 Log New Trade</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              ["Symbol", "symbol", "e.g. SAP.DE"],
              ["Buy Price (€)", "buyPrice", "e.g. 180.50"],
              ["Quantity", "quantity", "e.g. 10"],
              ["Stop Loss (€)", "stopLoss", "e.g. 167.00"],
              ["Target 1 (€)", "target1", "e.g. 187.00"],
              ["Target 2 (€)", "target2", "e.g. 194.00"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 9, color: "#475569", marginBottom: 4 }}>{label}</div>
                <input style={inputStyle} placeholder={ph} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#475569", marginBottom: 4 }}>Notes</div>
            <input style={{ ...inputStyle }} placeholder="Why did you enter this trade?" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addTrade} style={{
              background: "#4ade80", color: "#000", border: "none",
              borderRadius: 8, padding: "8px 20px", fontSize: 11, fontWeight: 700
            }}>Save Trade</button>
            <button onClick={() => setAdding(false)} style={{
              background: "transparent", color: "#64748b", border: "1px solid #334155",
              borderRadius: 8, padding: "8px 20px", fontSize: 11
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Trade list */}
      {trades.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#334155", fontSize: 12 }}>
          No trades logged yet. Click "+ Log New Trade" when you buy a stock.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {trades.map(t => {
            const pnlPct = t.closePrice
              ? ((t.closePrice - t.buyPrice) / t.buyPrice * 100).toFixed(2)
              : null;
            const isOpen = t.status === "OPEN";
            const daysOpen = Math.floor((new Date() - new Date(t.date)) / 86400000);
            return (
              <div key={t.id} style={{
                background: isOpen ? "#0f172a" : "#ffffff04",
                border: `1px solid ${isOpen ? "#334155" : "#1e293b"}`,
                borderRadius: 12, padding: "14px 16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{t.symbol}</span>
                      <span style={{
                        background: isOpen ? "#14532d33" : "#1e293b",
                        color: isOpen ? "#4ade80" : "#475569",
                        borderRadius: 4, padding: "2px 8px", fontSize: 9
                      }}>{t.status}</span>
                      {isOpen && daysOpen > 14 && (
                        <span style={{ background: "#78350f33", color: "#fbbf24", borderRadius: 4, padding: "2px 8px", fontSize: 9 }}>
                          ⏱ {daysOpen} days — consider exiting
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>Bought {t.date} · {t.quantity || "?"} shares</div>
                  </div>
                  {pnlPct && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: pnlPct >= 0 ? "#4ade80" : "#f87171" }}>
                        {pnlPct >= 0 ? "▲" : "▼"} {Math.abs(pnlPct)}%
                      </div>
                      <div style={{ fontSize: 9, color: "#475569" }}>P&L</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
                  {[
                    { l: "Buy Price", v: `€${fmt(t.buyPrice)}`, c: "#e2e8f0" },
                    { l: "Stop Loss", v: t.stopLoss ? `€${fmt(t.stopLoss)}` : "—", c: "#f87171" },
                    { l: "Target 1", v: t.target1 ? `€${fmt(t.target1)}` : "—", c: "#bef264" },
                    { l: "Target 2", v: t.target2 ? `€${fmt(t.target2)}` : "—", c: "#4ade80" },
                    { l: "Close Price", v: t.closePrice ? `€${fmt(t.closePrice)}` : "Open", c: "#94a3b8" },
                  ].map(m => (
                    <div key={m.l} style={{ background: "#ffffff06", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#475569" }}>{m.l}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: m.c }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {t.notes && (
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10, fontStyle: "italic" }}>"{t.notes}"</div>
                )}

                {isOpen && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Close price €" style={{ ...inputStyle, width: 120 }}
                      id={`close_${t.id}`} />
                    <button onClick={() => {
                      const el = document.getElementById(`close_${t.id}`);
                      if (el?.value) closeTrade(t.id, parseFloat(el.value));
                    }} style={{
                      background: "#f87171", color: "#000", border: "none",
                      borderRadius: 6, padding: "6px 12px", fontSize: 10, fontWeight: 700
                    }}>Close Trade</button>
                    <button onClick={() => deleteTrade(t.id)} style={{
                      background: "transparent", color: "#475569", border: "1px solid #1e293b",
                      borderRadius: 6, padding: "6px 12px", fontSize: 10
                    }}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TELEGRAM SETUP ───────────────────────────────────────────────────────────
function TelegramSetup() {
  const [chatId, setChatId] = useState("");
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const testAlert = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${API_BASE}/telegram/test`, { method: "POST" });
      const d = await r.json();
      setStatus(d.status === "sent" ? "success" : "error");
    } catch { setStatus("error"); }
    setTesting(false);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 20 }}>
        📱 Telegram Alerts Setup
      </div>

      {[
        ["Step 1 — Install Telegram", "Download the free Telegram app on your phone from the App Store or Google Play Store."],
        ["Step 2 — Find your Bot", `Open Telegram and search for your bot: @ParakrameeBot (or whatever name you set). Click 'Start'.`],
        ["Step 3 — Get your Chat ID", `Send any message to your bot. Then visit: https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getUpdates — you'll see your chat_id number.`],
        ["Step 4 — Add to Render", `Go to Render → your xetra-backend service → Environment → Add these two variables:\n• TELEGRAM_BOT_TOKEN = your bot token\n• TELEGRAM_CHAT_IDS = your chat id number`],
      ].map(([title, text]) => (
        <div key={title} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ color: "#a78bfa", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{text}</div>
        </div>
      ))}

      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ color: "#4ade80", fontWeight: 700, marginBottom: 10, fontSize: 13 }}>🔔 Create Your Bot (2 minutes)</div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 2 }}>
          1. Open Telegram → search <strong style={{ color: "#e2e8f0" }}>@BotFather</strong><br />
          2. Send: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3 }}>/newbot</code><br />
          3. Name it: <strong style={{ color: "#e2e8f0" }}>Parakramee Intelligence</strong><br />
          4. Username: <strong style={{ color: "#e2e8f0" }}>parakramee_alerts_bot</strong><br />
          5. BotFather gives you a token like: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3 }}>1234567890:ABCdef...</code><br />
          6. Copy it → add to Render as TELEGRAM_BOT_TOKEN
        </div>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 10, fontSize: 13 }}>⚡ Test Your Alerts</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
          Once you've added TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS to Render, click below to send a test message to your Telegram.
        </div>
        <button onClick={testAlert} disabled={testing} style={{
          background: testing ? "#334155" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "10px 24px", fontSize: 12, fontWeight: 700
        }}>
          {testing ? "Sending..." : "📱 Send Test Alert to Telegram"}
        </button>
        {status === "success" && (
          <div style={{ color: "#4ade80", fontSize: 11, marginTop: 10 }}>
            ✅ Test sent! Check your Telegram app.
          </div>
        )}
        {status === "error" && (
          <div style={{ color: "#f87171", fontSize: 11, marginTop: 10 }}>
            ❌ Failed. Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS are set in Render.
          </div>
        )}
      </div>

      <div style={{ background: "#14532d22", border: "1px solid #4ade8033", borderRadius: 12, padding: 14, fontSize: 11, color: "#86efac" }}>
        ✅ <strong>What alerts you'll receive automatically:</strong><br /><br />
        🟢 BUY signal detected → price, targets, stop loss sent instantly<br />
        🔴 SELL signal detected → reasons and exit levels sent instantly<br />
        📊 Alerts only sent when signal changes — no spam
      </div>
    </div>
  );
}

// ─── CANDLESTICK CHART ────────────────────────────────────────────────────────
function CandlestickChart({ ohlcv = [], indicators = {}, analysis = {}, width = 660, height = 280 }) {
  if (!ohlcv.length) return null;
  const visible = ohlcv.slice(-50);
  const n = visible.length;
  const pad = { t: 12, r: 10, b: 22, l: 58 };
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const colW = W / n;

  const prices = visible.flatMap(d => [d.high, d.low]);
  const bbU = (indicators.bb_upper || []).slice(-n);
  const bbL = (indicators.bb_lower || []).slice(-n);
  if (bbU.some(v => v)) prices.push(...bbU.filter(Boolean), ...bbL.filter(Boolean));

  // Add target/stop lines to scale
  if (analysis.target2) prices.push(analysis.target2);
  if (analysis.stop_loss) prices.push(analysis.stop_loss);

  const minP = Math.min(...prices) * 0.997;
  const maxP = Math.max(...prices) * 1.003;
  const range = maxP - minP || 1;
  const toY = v => H - ((v - minP) / range) * H;

  const sma20 = (indicators.sma20 || []).slice(-n);
  const sma50 = (indicators.sma50 || []).slice(-n);
  const linePath = (arr, color, dash = "") => {
    const pts = arr.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
    if (pts.length < 2) return null;
    return <polyline key={color} fill="none" stroke={color} strokeWidth="1.2" strokeDasharray={dash} points={pts.join(" ")} />;
  };

  const ticks = Array.from({ length: 5 }, (_, i) => minP + (range / 4) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={0} y1={toY(t)} x2={W} y2={toY(t)} stroke="#ffffff07" />
            <text x={-6} y={toY(t) + 4} fill="#475569" fontSize="9" textAnchor="end">{t.toFixed(0)}</text>
          </g>
        ))}

        {/* BB fill */}
        {bbU.length && bbL.length && (() => {
          const upper = bbU.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
          const lower = bbL.map((v, i) => v ? `${i * colW + colW / 2},${toY(v)}` : null).filter(Boolean);
          if (!upper.length || !lower.length) return null;
          return <polygon points={[...upper, ...[...lower].reverse()].join(" ")} fill="#7c3aed08" />;
        })()}

        {linePath(bbU, "#7c3aed55", "3,2")}
        {linePath(bbL, "#7c3aed55", "3,2")}
        {linePath(sma50, "#f59e0b", "4,3")}
        {linePath(sma20, "#38bdf8", "3,2")}

        {/* Target lines */}
        {analysis.target1 && toY(analysis.target1) > 0 && toY(analysis.target1) < H && (
          <g>
            <line x1={0} y1={toY(analysis.target1)} x2={W} y2={toY(analysis.target1)} stroke="#bef26444" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W + 2} y={toY(analysis.target1) + 3} fill="#bef264" fontSize="7">T1</text>
          </g>
        )}
        {analysis.target2 && toY(analysis.target2) > 0 && toY(analysis.target2) < H && (
          <g>
            <line x1={0} y1={toY(analysis.target2)} x2={W} y2={toY(analysis.target2)} stroke="#4ade8044" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W + 2} y={toY(analysis.target2) + 3} fill="#4ade80" fontSize="7">T2</text>
          </g>
        )}
        {analysis.stop_loss && toY(analysis.stop_loss) > 0 && toY(analysis.stop_loss) < H && (
          <g>
            <line x1={0} y1={toY(analysis.stop_loss)} x2={W} y2={toY(analysis.stop_loss)} stroke="#f8717144" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W + 2} y={toY(analysis.stop_loss) + 3} fill="#f87171" fontSize="7">SL</text>
          </g>
        )}

        {/* Candles */}
        {visible.map((d, i) => {
          const x = i * colW + colW / 2;
          const isUp = d.close >= d.open;
          const col = isUp ? "#4ade80" : "#f87171";
          const bodyTop = toY(Math.max(d.open, d.close));
          const bodyH = Math.max(1, Math.abs(toY(d.open) - toY(d.close)));
          return (
            <g key={i}>
              <line x1={x} y1={toY(d.high)} x2={x} y2={toY(d.low)} stroke={col} strokeWidth="1" />
              <rect x={x - colW * 0.35} y={bodyTop} width={colW * 0.7} height={bodyH} fill={col} opacity={0.9} rx={0.5} />
            </g>
          );
        })}

        {visible.filter((_, i) => i % 10 === 0).map(d => {
          const i = visible.indexOf(d);
          return <text key={d.date} x={i * colW + colW / 2} y={H + 14} fill="#475569" fontSize="8" textAnchor="middle">{d.date?.slice(5)}</text>;
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
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const toY = v => H - (v / 100) * H;
  const pts = visible.map((v, i) => `${(i / (visible.length - 1)) * W},${toY(v)}`).join(" ");
  const last = visible[visible.length - 1];
  const col = last > 70 ? "#f87171" : last < 30 ? "#4ade80" : "#a78bfa";
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {[70, 50, 30].map(v => (
          <g key={v}>
            <line x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke={v === 70 ? "#f8717120" : v === 30 ? "#4ade8020" : "#ffffff08"} strokeWidth="1" strokeDasharray="3,2" />
            <text x={-4} y={toY(v) + 3} fill={v === 70 ? "#f87171" : v === 30 ? "#4ade80" : "#475569"} fontSize="7" textAnchor="end">{v}</text>
          </g>
        ))}
        <polyline fill="none" stroke={col} strokeWidth="1.5" points={pts} />
        <text x={4} y={8} fill="#475569" fontSize="7">RSI (14) — {last.toFixed(1)}</text>
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `You are an expert German stock market analyst for Parakramee Intelligence dashboard. Analyse ${stock.name} (${stock.symbol}) on XETRA.

REAL LIVE DATA:
Price: €${analysis.price} | RSI: ${analysis.rsi} | MACD: ${analysis.macd} vs Signal: ${analysis.macd_signal}
Score: ${analysis.score}/100 | Recommendation: ${analysis.recommendation} | Sell Rating: ${analysis.sell_rating}
BB: €${analysis.bb_lower} / €${analysis.bb_mid} / €${analysis.bb_upper}
SMA20: €${analysis.sma20} | SMA50: €${analysis.sma50} | ATR: €${analysis.atr}
Stop Loss: €${analysis.stop_loss} | Target 1: €${analysis.target1} | Target 2: €${analysis.target2} | Target 3: €${analysis.target3}
Risk/Reward: 1:${analysis.risk_reward} | Pattern: ${analysis.pattern?.name || "None"}
Sell Signals: ${analysis.sell_signals?.map(s => s.type).join(", ") || "None"}
${info?.trailingPE ? `P/E: ${info.trailingPE?.toFixed(1)} | Beta: ${info.beta?.toFixed(2)}` : ""}

Give analysis in these sections:
**🟢 BUY/HOLD/SELL VERDICT** — Direct recommendation with specific reasoning from the real data above
**🎯 ENTRY & EXIT STRATEGY** — Exact euro prices for entry, targets and stop loss with percentages
**⚠️ KEY RISKS** — Top 2 specific risks for this stock right now
**📊 ONE-LINE SUMMARY** — Perfect for a swing trader on Trading212

Be specific with euro amounts. Reference the real numbers above.` }]
        })
      });
      const data = await res.json();
      setResult(data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "No result.");
    } catch { setResult("⚠️ AI analysis unavailable."); }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 14 }}>
      {!result && !loading && (
        <button onClick={run} style={{
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
          border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 12, letterSpacing: "0.05em"
        }}>✦ Run AI Analysis</button>
      )}
      {loading && <div style={{ color: "#a78bfa", fontSize: 12 }}>⟳ Analysing real market data...</div>}
      {result && (
        <div style={{ background: "#1e1b4b22", border: "1px solid #7c3aed44", borderRadius: 12, padding: 16, fontSize: 12, lineHeight: 1.8, color: "#c4b5fd", whiteSpace: "pre-wrap" }}>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", marginBottom: 10 }}>✦ CLAUDE AI ANALYSIS — LIVE DATA</div>
          {result}
          <button onClick={run} style={{ marginTop: 10, background: "transparent", color: "#7c3aed", border: "1px solid #7c3aed44", borderRadius: 6, padding: "4px 12px", fontSize: 10 }}>↻ Refresh</button>
        </div>
      )}
    </div>
  );
}

// ─── STOCK MODAL ──────────────────────────────────────────────────────────────
function StockModal({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/stock/${symbol}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, [symbol]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "28px 16px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", border: "1px solid #7c3aed44", borderRadius: 20, padding: 28, width: "100%", maxWidth: 760, boxShadow: "0 0 60px #7c3aed22" }}>
        {loading && <div style={{ textAlign: "center", padding: 60, color: "#a78bfa" }}>⟳ Fetching real XETRA data...</div>}
        {error && <div style={{ color: "#f87171", padding: 40, textAlign: "center" }}>⚠️ {error}</div>}
        {data && (() => {
          const { ohlcv, indicators, analysis, info } = data;
          const stock = { symbol, name: info?.longName || symbol, sector: info?.sector || "" };
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{info?.longName || symbol}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{symbol} · {info?.sector} · XETRA</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0" }}>€{fmt(analysis.price)}</div>
                  <div style={{ fontSize: 12, color: analysis.change1d >= 0 ? "#4ade80" : "#f87171" }}>
                    {analysis.change1d >= 0 ? "▲" : "▼"} {Math.abs(analysis.change1d).toFixed(2)}% today
                  </div>
                </div>
              </div>

              {/* Buy + Sell rating row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: recBg(analysis.recommendation), border: `1px solid ${recColor(analysis.recommendation)}44`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: recColor(analysis.recommendation), fontFamily: "'Syne',sans-serif" }}>{analysis.recommendation}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Score: {analysis.score}/100</div>
                </div>
                <div style={{ background: sellBg(analysis.sell_rating), border: `1px solid ${sellColor(analysis.sell_rating)}44`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: sellColor(analysis.sell_rating), fontFamily: "'Syne',sans-serif" }}>{analysis.sell_rating}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Exit signal</div>
                </div>
              </div>

              {/* Chart */}
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "10px 8px", marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#475569", paddingLeft: 8, marginBottom: 4 }}>
                  CHART · <span style={{ color: "#38bdf8" }}>SMA20</span> · <span style={{ color: "#f59e0b" }}>SMA50</span> · <span style={{ color: "#7c3aed" }}>Bollinger</span> · <span style={{ color: "#4ade80" }}>T1/T2</span> · <span style={{ color: "#f87171" }}>SL</span>
                </div>
                <CandlestickChart ohlcv={ohlcv} indicators={indicators} analysis={analysis} />
              </div>
              <div style={{ background: "#ffffff03", borderRadius: 12, padding: "6px 8px", marginBottom: 4 }}>
                <RSIChart rsiValues={indicators.rsi || []} />
              </div>

              {/* Price levels */}
              <PriceLevels analysis={analysis} />

              {/* Sell signals */}
              <SellSignalsPanel sellSignals={analysis.sell_signals || []} sellRating={analysis.sell_rating} />

              {/* Technical signals */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>TECHNICAL SIGNALS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(analysis.signals || []).map((s, i) => (
                    <div key={i} style={{ background: s.type === "buy" ? "#14532d44" : s.type === "sell" ? "#7f1d1d44" : "#1e293b", border: `1px solid ${s.type === "buy" ? "#4ade8044" : s.type === "sell" ? "#f8717144" : "#334155"}`, borderRadius: 8, padding: "5px 10px", fontSize: 10 }}>
                      <span style={{ color: s.type === "buy" ? "#4ade80" : s.type === "sell" ? "#f87171" : "#64748b" }}>{s.type === "buy" ? "▲" : s.type === "sell" ? "▼" : "●"} </span>
                      <span style={{ color: "#cbd5e1" }}>{s.label}</span>
                      <span style={{ color: "#64748b" }}> · {s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <AIAnalysis stock={stock} analysis={analysis} info={info} />

              <button onClick={onClose} style={{ marginTop: 18, background: "transparent", color: "#64748b", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 22px", fontSize: 12 }}>✕ Close</button>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser]         = useState("");
  const [pass, setPass]         = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [stocks, setStocks]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab]           = useState("scanner");
  const [filterSec, setFSec]    = useState("All");
  const [filterRec, setFRec]    = useState("All");
  const [sortBy, setSortBy]     = useState("score");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [backendOK, setBackendOK]   = useState(null);
  const timerRef = useRef(null);

  const loadStocks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/stocks`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      setStocks(await r.json());
      setLastUpdate(new Date());
      setBackendOK(true);
    } catch (e) { setError(String(e)); setBackendOK(false); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    loadStocks();
    timerRef.current = setInterval(loadStocks, 60000);
    return () => clearInterval(timerRef.current);
  }, [loggedIn]);

  const handleLogin = () => {
    if (USERS[user] === pass) { setLoggedIn(true); setLoginErr(""); }
    else setLoginErr("Invalid credentials");
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#030712" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:#030712;font-family:'JetBrains Mono',monospace}
        input:focus{outline:none;border-color:#7c3aed!important} button{cursor:pointer;transition:opacity .15s}button:hover{opacity:.85}
        @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease forwards} .stock-row:hover{background:#ffffff0a!important;cursor:pointer}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
      `}</style>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", border: "1px solid #7c3aed44", borderRadius: 20, padding: "52px 46px", width: 400, textAlign: "center", boxShadow: "0 0 80px #7c3aed18" }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>📊</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: "#e2e8f0" }}>PARAKRAMEE</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.2em", marginBottom: 4 }}>INTELLIGENCE</div>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 36 }}>GERMAN MARKET AI DASHBOARD</div>
        {[["USERNAME", user, setUser, "text", "vijay"], ["PASSWORD", pass, setPass, "password", "••••••••"]].map(([label, val, setter, type, ph]) => (
          <div key={label} style={{ marginBottom: 16, textAlign: "left" }}>
            <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.14em", marginBottom: 6 }}>{label}</div>
            <input type={type} value={val} onChange={e => setter(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder={ph}
              style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "11px 14px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
          </div>
        ))}
        {loginErr && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 10 }}>{loginErr}</div>}
        <button onClick={handleLogin} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Syne',sans-serif" }}>
          ACCESS DASHBOARD →
        </button>
        <div style={{ fontSize: 10, color: "#334155", marginTop: 16 }}>Trade with Courage. Win with Intelligence.</div>
      </div>
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const sectors  = ["All", ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  const displayed = stocks
    .filter(s => filterSec === "All" || s.sector === filterSec)
    .filter(s => filterRec === "All" || s.recommendation === filterRec)
    .sort((a, b) =>
      sortBy === "score"  ? (b.score || 0) - (a.score || 0) :
      sortBy === "change" ? (b.change1d || 0) - (a.change1d || 0) :
      sortBy === "rsi"    ? (a.rsi || 50) - (b.rsi || 50) :
      sortBy === "sell"   ? (b.sell_signals?.length || 0) - (a.sell_signals?.length || 0) : 0
    );

  const tabs = [
    ["scanner", "📡 SCANNER"],
    ["sells", "🔴 SELL SIGNALS"],
    ["journal", "📓 TRADE JOURNAL"],
    ["telegram", "📱 TELEGRAM"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:#030712;font-family:'JetBrains Mono',monospace}
        input,select,button{font-family:inherit} input:focus{outline:none;border-color:#7c3aed!important}
        @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease forwards} .stock-row:hover{background:#ffffff0a!important;cursor:pointer}
        button{cursor:pointer;transition:opacity .15s}button:hover{opacity:.85}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg,#0f172a,#1e1b4b)", borderBottom: "1px solid #1e293b", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800 }}>
              <span style={{ color: "#7c3aed" }}>PARAKRAMEE </span>
              <span style={{ color: "#e2e8f0" }}>INTELLIGENCE</span>
            </div>
            <div style={{ fontSize: 8, color: "#334155", letterSpacing: "0.15em" }}>TRADE WITH COURAGE. WIN WITH INTELLIGENCE.</div>
          </div>
          <div style={{ background: backendOK ? "#4ade8022" : "#f8717122", border: `1px solid ${backendOK ? "#4ade8044" : "#f8717144"}`, borderRadius: 100, padding: "2px 10px", fontSize: 9, color: backendOK ? "#4ade80" : "#f87171", animation: backendOK ? "pulse 2s infinite" : "none" }}>
            {backendOK === null ? "○ CONNECTING" : backendOK ? "● LIVE" : "● OFFLINE"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdate && <div style={{ fontSize: 9, color: "#475569" }}>Updated {lastUpdate.toLocaleTimeString("de-DE")} CET</div>}
          <button onClick={loadStocks} disabled={loading} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "5px 12px", fontSize: 10 }}>
            {loading ? "⟳" : "↻"} Refresh
          </button>
          <button onClick={() => setLoggedIn(false)} style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", borderRadius: 6, padding: "5px 12px", fontSize: 10 }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 4 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? "#7c3aed" : "#0f172a", border: `1px solid ${tab === k ? "#7c3aed" : "#1e293b"}`, color: tab === k ? "#fff" : "#64748b", borderRadius: "8px 8px 0 0", padding: "8px 18px", fontSize: 11, letterSpacing: "0.05em" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: "0 12px 12px 12px", padding: 20 }}>

          {/* ── SCANNER ── */}
          {tab === "scanner" && (
            <>
              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
                {[["STRONG BUY","#4ade80"],["BUY","#86efac"],["HOLD","#fbbf24"],["CAUTION","#fb923c"],["AVOID","#f87171"]].map(([r, col]) => (
                  <div key={r} style={{ background: recBg(r), border: `1px solid ${col}22`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", opacity: filterRec === r ? 1 : 0.75 }} onClick={() => setFRec(filterRec === r ? "All" : r)}>
                    <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>{r}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: col, fontFamily: "'Syne',sans-serif" }}>{loading ? "…" : stocks.filter(s => s.recommendation === r).length}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <select value={filterSec} onChange={e => setFSec(e.target.value)} style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "5px 10px", fontSize: 10 }}>
                  {sectors.map(s => <option key={s}>{s}</option>)}
                </select>
                {[["score","Score"],["change","1D %"],["rsi","RSI"],["sell","Sell Signals"]].map(([k,l]) => (
                  <button key={k} onClick={() => setSortBy(k)} style={{ background: sortBy === k ? "#1e293b" : "transparent", border: `1px solid ${sortBy === k ? "#7c3aed" : "#1e293b"}`, color: sortBy === k ? "#a78bfa" : "#475569", borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>{l}</button>
                ))}
                {filterRec !== "All" && (
                  <button onClick={() => setFRec("All")} style={{ background: "#7f1d1d33", border: "1px solid #f8717144", color: "#f87171", borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>✕ {filterRec}</button>
                )}
              </div>

              {/* Table */}
              {loading && !stocks.length ? (
                <div style={{ textAlign: "center", padding: 60, color: "#7c3aed", fontSize: 13 }}>
                  <div style={{ fontSize: 28, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
                  <div style={{ marginTop: 12 }}>Fetching real XETRA data...</div>
                </div>
              ) : error ? (
                <div style={{ color: "#f87171", padding: 40, textAlign: "center" }}>⚠️ Backend offline. {error}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                    <thead>
                      <tr style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>
                        {["STOCK","PRICE","1D","RSI","SCORE","TARGETS","STOP LOSS","SELL","BUY SIGNAL"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(s => (
                        <tr key={s.symbol} className="stock-row" onClick={() => setSelected(s.symbol)} style={{ background: "#ffffff03", transition: "background 0.15s" }}>
                          <td style={{ padding: "10px 10px", borderRadius: "8px 0 0 8px" }}>
                            <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>{s.symbol?.replace(".DE","")}</div>
                            <div style={{ fontSize: 9, color: "#475569" }}>{s.name?.slice(0, 16)}</div>
                          </td>
                          <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>€{fmt(s.price)}</td>
                          <td style={{ padding: "10px 10px", fontSize: 12, color: s.change1d >= 0 ? "#4ade80" : "#f87171" }}>
                            {s.change1d != null ? `${s.change1d >= 0 ? "▲" : "▼"}${Math.abs(s.change1d).toFixed(2)}%` : "—"}
                          </td>
                          <td style={{ padding: "10px 10px", fontSize: 12, color: s.rsi < 30 ? "#4ade80" : s.rsi > 70 ? "#f87171" : "#94a3b8" }}>{s.rsi ? fmt(s.rsi, 1) : "—"}</td>
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ background: "#ffffff0a", borderRadius: 3, height: 4, width: 60 }}>
                              <div style={{ width: `${Math.min(100, Math.max(0, s.score + 50))}%`, height: "100%", background: s.score >= 25 ? "#4ade80" : s.score >= 0 ? "#fbbf24" : "#f87171", borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{s.score}</div>
                          </td>
                          <td style={{ padding: "10px 10px", fontSize: 10 }}>
                            {s.target1 ? (
                              <div>
                                <div style={{ color: "#bef264" }}>T1: €{fmt(s.target1)}</div>
                                <div style={{ color: "#4ade80" }}>T2: €{fmt(s.target2)}</div>
                              </div>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "10px 10px", fontSize: 11, color: "#f87171", fontWeight: 600 }}>
                            {s.stop_loss ? `€${fmt(s.stop_loss)}` : "—"}
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {s.sell_signals?.length > 0 ? (
                              <div style={{ background: sellBg(s.sell_rating), border: `1px solid ${sellColor(s.sell_rating)}44`, borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: sellColor(s.sell_rating), display: "inline-block" }}>
                                {s.sell_rating} ({s.sell_signals.length})
                              </div>
                            ) : <span style={{ color: "#4ade80", fontSize: 9 }}>✓ Hold</span>}
                          </td>
                          <td style={{ padding: "10px 10px", borderRadius: "0 8px 8px 0" }}>
                            <div style={{ background: recBg(s.recommendation), border: `1px solid ${recColor(s.recommendation)}44`, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: recColor(s.recommendation), display: "inline-block" }}>
                              {s.recommendation || "—"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── SELL SIGNALS TAB ── */}
          {tab === "sells" && (
            <div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 18 }}>
                Stocks currently showing sell/exit signals — click any to see full details
              </div>
              {stocks.filter(s => s.sell_signals?.length > 0)
                .sort((a, b) => (b.sell_signals?.length || 0) - (a.sell_signals?.length || 0))
                .map(s => (
                  <div key={s.symbol} onClick={() => setSelected(s.symbol)} style={{ background: "#0f172a", border: "1px solid #f8717122", borderRadius: 14, padding: "16px", marginBottom: 12, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{s.symbol} · €{fmt(s.price)}</div>
                      </div>
                      <div style={{ background: sellBg(s.sell_rating), border: `1px solid ${sellColor(s.sell_rating)}44`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: sellColor(s.sell_rating) }}>
                        {s.sell_rating}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {s.sell_signals.map((sig, i) => (
                        <div key={i} style={{ background: "#7f1d1d33", border: "1px solid #f8717133", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#f87171" }}>
                          {sig.urgency === "high" ? "🔴" : "🟠"} {sig.type}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {stocks.filter(s => s.sell_signals?.length > 0).length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "#4ade80", fontSize: 13 }}>
                  ✅ No sell signals detected across all stocks right now
                </div>
              )}
            </div>
          )}

          {/* ── TRADE JOURNAL ── */}
          {tab === "journal" && <TradeJournal />}

          {/* ── TELEGRAM ── */}
          {tab === "telegram" && <TelegramSetup />}

        </div>
      </div>

      {selected && <StockModal symbol={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
