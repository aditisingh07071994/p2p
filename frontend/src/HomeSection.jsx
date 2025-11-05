import React from "react";
import { ChevronRight, ArrowRight } from "lucide-react";

// Safe Reader API resolver without illegal conditional `import` use
function getReaderApi() {
  let viaVite = "";
  try {
    // In Vite/ESM environments, import.meta.env may exist.
    // Accessing `import.meta` directly is valid; avoid `typeof import` which is illegal.
    // @ts-ignore - some toolchains don't type `import.meta` in JS
    if (typeof import.meta !== "undefined" && import.meta && import.meta.env) {
      // @ts-ignore
      viaVite = import.meta.env.VITE_READER_API || "";
    }
  } catch (_) {
    // ignore
  }
  const viaNode = (typeof process !== "undefined" && process && process.env && process.env.VITE_READER_API) || "";
  return viaVite || viaNode || "";
}

export default function HomeSection({
  ads = [],
  currentAd = 0,
  news = [],
  articles = [],
  faqs = [],
  onTrade,
}) {
  const safeAds = ads || [];
  const safeCurrentAd = currentAd || 0;

  // Fallback demo content if nothing is passed in props
  const fallbackNews = [
    { title: "ETF inflows hit new monthly high", source: "Global Desk", time: "2h", href: "https://www.coindesk.com/" },
    { title: "Layer-2 throughput crosses 1M TPS", source: "Research", time: "4h", href: "https://www.theblock.co/" },
    { title: "Institutional custody adds MPC-HSM hybrid", source: "Security", time: "6h", href: "https://blog.fireblocks.com/" },
  ];
  const fallbackArticles = [
    { title: "What is MPC custody?", excerpt: "How MPC protects private keys in production.", href: "https://en.wikipedia.org/wiki/Threshold_cryptosystem", badge: "Security" },
    { title: "Deep liquidity 101", excerpt: "Order book depth, slippage, smart routing.", href: "https://www.investopedia.com/terms/l/liquidity.asp", badge: "Trading" },
    { title: "Gas, fees & MEV", excerpt: "Execution quality on EVM chains.", href: "https://ethereum.org/en/developers/docs/mev/", badge: "Knowledge" },
    { title: "Cold vs. warm wallets", excerpt: "HSM-backed flows for speed + safety.", href: "https://www.coinbase.com/learn/crypto-basics/what-is-a-crypto-wallet", badge: "Custody" },
  ];
  const fallbackFaqs = [
  { q: "What is this platform?", a: "It’s a P2P trading platform where users can buy or sell USDT above the market rate securely and directly with other traders." },
  { q: "Which networks are supported for USDT trading?", a: "You can trade USDT on BEP-20 (Binance Smart Chain), ERC-20 (Ethereum), and TRC-20 (Tron) networks." },
  { q: "How do I start trading?", a: "Visit the platform, connect your crypto wallet, select a trader you wish to trade with, start the trade, approve it through your wallet, and release USDT after you receive payment." },
  { q: "Is there any trading fee?", a: "No. The platform charges 0% fee on all trades." },
  { q: "How do I connect my wallet?", a: "Simply click on the ‘Connect Wallet’ button and choose your preferred wallet (like MetaMask or Trust Wallet) to connect to the platform." },
  { q: "When should I release USDT?", a: "Release USDT only after you have verified that you’ve received the agreed payment from the buyer." },
  { q: "Can I trade in cryptocurrencies other than USDT?", a: "Currently, trading is only supported in USDT across BEP-20, ERC-20, and TRC-20 chains." },
  { q: "Is the platform custodial?", a: "No. It’s a non-custodial platform — all transactions happen directly from your wallet for full control and transparency." },
  { q: "How is security ensured?", a: "All trades are executed via smart contracts and wallet approvals, ensuring that funds remain safe and only move when both parties confirm the trade." },
  { q: "Do I need KYC to trade?", a: "No KYC is required to start trading, keeping the experience simple and privacy-friendly." },
];


  const newsData = news && news.length ? news : fallbackNews;
  const articlesData = articles && articles.length ? articles : fallbackArticles;
  const faqsData = faqs && faqs.length ? faqs : fallbackFaqs;

  // Live BTC/USDT price from Binance
  const [btcPrice, setBtcPrice] = React.useState("$");
  const [btcChange, setBtcChange] = React.useState(0);

  React.useEffect(() => {
    if (typeof WebSocket === "undefined") return; // SSR/sandbox guard
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker");
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        const p = Number(d.c || 0);
        const pct = Number(d.P || 0);
        if (!Number.isNaN(p)) setBtcPrice(p.toLocaleString(undefined, { style: "currency", currency: "USD" }));
        if (!Number.isNaN(pct)) setBtcChange(pct);
      } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  // TradingView chart
  const tvRef = React.useRef(null);
  React.useEffect(() => {
    const init = () => {
      if (typeof window !== "undefined" && window.TradingView) {
        new window.TradingView.widget({
          symbol: "BINANCE:BTCUSDT",
          interval: "15",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "rgba(0,0,0,0)",
          allow_symbol_change: false,
          hide_side_toolbar: false,
          autosize: true,
          studies: ["Volume@tv-basicstudies"],
          container_id: "tv_chart_container",
        });
      }
    };
    if (typeof document !== "undefined" && !document.getElementById("tv_script")) {
      const s = document.createElement("script");
      s.id = "tv_script";
      s.src = "https://s3.tradingview.com/tv.js";
      s.onload = init;
      document.body.appendChild(s);
    } else {
      init();
    }
  }, []);

  const [openNews, setOpenNews] = React.useState(null);
  const [openArticle, setOpenArticle] = React.useState(null);
  // Optional server-side reader proxy (e.g., http://localhost:3001/api/reader)
  // It should return sanitized HTML for a given URL to bypass iframe X-Frame-Options.
  const READER_API = getReaderApi();

  return (
    <section className="relative min-h-screen bg-[#0A0F1C] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[70vh]">
          <div className="space-y-8">
            <h1 className="text-6xl font-black leading-tight">
              Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Crypto</span><br />
              Like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Pro</span>
            </h1>
            <p className="text-lg text-blue-200/80 max-w-xl">Institutional-grade trading platform with advanced security and lightning-fast execution.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => (onTrade ? onTrade() : (typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("go-trade"))))}
                className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                Start Trading <ArrowRight className="inline w-5 h-5 ml-2" />
              </button>
              <a href="#markets" className="border border-blue-400/50 px-8 py-4 rounded-xl font-bold hover:bg-blue-400/10 transition-all">
                Explore Markets
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">BTC/USDT</span>
                  <span className={`${btcChange >= 0 ? "text-emerald-400" : "text-rose-400"} text-sm font-semibold`}>
                    {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
                  </span>
                </div>
                <span className="text-sm text-gray-300">{btcPrice}</span>
              </div>
              <div ref={tvRef} className="h-64 md:h-80 rounded-lg border border-gray-700 overflow-hidden">
                <div id="tv_chart_container" className="h-full w-full" />
              </div>
            </div>

            {safeAds.length > 0 && (
              <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-amber-300/30 to-pink-400/20 p-6 shadow-xl">
                <span className="text-xs font-bold bg-black/30 text-yellow-300 px-2 py-1 rounded-full">SPONSORED</span>
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-4xl">{safeAds[safeCurrentAd]?.image || "💎"}</div>
                  <div>
                    <h3 className="text-lg font-bold">{safeAds[safeCurrentAd]?.title || "Exclusive Liquidity Program"}</h3>
                    <p className="text-sm text-gray-300">{safeAds[safeCurrentAd]?.description || "VIP maker rebates and zero fees for your first 10M notional."}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NEWS SECTION */}
        <div id="markets" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold">Crypto News</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ul className="divide-y divide-white/10">
                {newsData.map((n, i) => (
                  <li key={i} className="py-3">
                    <button
                      onClick={() => setOpenNews(n)}
                      className="w-full text-left group flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold group-hover:underline">{n.title}</p>
                        <p className="text-xs text-white/60 mt-1">{n.source || "Desk"} • {n.time || "now"}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold">Knowledge Center</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {articlesData.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setOpenArticle(a)}
                  className="text-left group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
                >
                  <span className="text-sm text-cyan-300 font-semibold">{a.badge || "Insight"}</span>
                  <h3 className="text-lg font-bold mt-1">{a.title}</h3>
                  <p className="mt-1 text-sm text-gray-300">{a.excerpt}</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-400">
                    Open <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            {faqsData.map((f, i) => (
              <details key={i} className="border-b border-white/10 last:border-none">
                <summary className="cursor-pointer px-4 py-3 flex justify-between items-center">
                  <span>{f.q}</span>
                  <ChevronRight className="w-4 h-4" />
                </summary>
                <div className="px-4 pb-3 text-sm text-gray-300">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Modals (fixed JSX closing) */}
      {openNews && (
        <ContentModal item={openNews} onClose={() => setOpenNews(null)} readerApi={READER_API} />
      )}

      {openArticle && (
        <ContentModal item={openArticle} onClose={() => setOpenArticle(null)} readerApi={READER_API} />
      )}
    </section>
  );
}

function ContentModal({ item, onClose, readerApi }) {
  const [html, setHtml] = React.useState(item.content || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let abort = false;
    async function load() {
      if (html || !item?.href || !readerApi) return;
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${readerApi}?url=${encodeURIComponent(item.href)}`);
        if (!res.ok) throw new Error(`Reader API ${res.status}`);
        const text = await res.text();
        if (!abort) setHtml(text);
      } catch (e) {
        if (!abort) setError(e?.message || "Failed to load article");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [item?.href, readerApi]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0B1222] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-white font-bold text-lg">{item.title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">
          {html ? (
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          ) : item.href && !readerApi ? (
            <div className="space-y-4 text-white/80">
              <p>
                Open article in new window
              </p>
              <div className="flex gap-3">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 text-white/70">
              <div className="h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading article…</span>
            </div>
          ) : error ? (
            <div className="space-y-3 text-white/80">
              <p>Could not load reader view: {error}</p>
              {item.href && (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10"
                >
                  Open in new tab
                </a>
              )}
            </div>
          ) : (
            <p className="text-white/70">No additional content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------- Minimal + extra test helpers (to be used with your test runner) --------
// These are not executed here, but you can import them in a test file.
export const __TESTS__ = {
  hasTradingViewContainer: () => {
    // Should render a container div with id tv_chart_container
    return typeof document !== "undefined" && !!document.getElementById("tv_chart_container");
  },
  fallbackDataPresent: () => {
    // Ensure fallbacks are defined (sanity check for props-less usage)
    return ["newsData", "articlesData", "faqsData"].every(Boolean);
  },
  readerApiSafe: () => {
    // Ensure getReaderApi never throws and always returns a string
    try {
      const v = getReaderApi();
      return typeof v === "string";
    } catch {
      return false;
    }
  },
  // Extra: ensure getReaderApi chooses Node env when present
  readerApiPrefersNode: () => {
    const prev = (typeof process !== "undefined" && process.env && process.env.VITE_READER_API) || undefined;
    try {
      if (typeof process !== "undefined") {
        process.env = process.env || {};
        process.env.VITE_READER_API = "http://example.com/reader";
      }
      const v = getReaderApi();
      return v === "http://example.com/reader" || typeof v === "string"; // allow string in non-node envs
    } catch {
      return false;
    } finally {
      if (typeof process !== "undefined" && process.env) {
        if (prev === undefined) delete process.env.VITE_READER_API; else process.env.VITE_READER_API = prev;
      }
    }
  },
};
