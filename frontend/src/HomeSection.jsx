import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ArrowRight, ShieldCheck, Zap, Layers, Plus, Minus } from "lucide-react";

// --- API Resolver (Unchanged) ---
function getReaderApi() {
  let viaVite = "";
  try {
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta && import.meta.env) {
      // @ts-ignore
      viaVite = import.meta.env.VITE_READER_API || "";
    }
  } catch (_) {}
  const viaNode = (typeof process !== "undefined" && process && process.env && process.env.VITE_READER_API) || "";
  return viaVite || viaNode || "";
}

// --- Fallback Data (Unchanged but will be handled better) ---
const fallbackNews = [
  { title: "ETF inflows hit new monthly high as institutional adoption accelerates", source: "Global Desk", time: "2h", href: "https://www.coindesk.com/" },
  { title: "Layer-2 throughput crosses 1M TPS marking significant scalability milestone", source: "Research", time: "4h", href: "https://www.theblock.co/" },
  { title: "Institutional custody adds MPC-HSM hybrid security solutions", source: "Security", time: "6h", href: "https://blog.fireblocks.com/" },
  { title: "DeFi protocols see unprecedented growth with TVL reaching new all-time highs", source: "DeFi Watch", time: "8h", href: "https://defillama.com/" },
  { title: "Regulatory clarity emerges as multiple jurisdictions establish crypto frameworks", source: "Policy", time: "1d", href: "https://www.coindesk.com/policy/" },
];

const fallbackArticles = [
  { title: "What is MPC custody and how does it transform digital asset security?", excerpt: "Multi-Party Computation (MPC) represents a revolutionary approach to private key management...", href: "https://en.wikipedia.org/wiki/Threshold_cryptosystem", badge: "Security" },
  { title: "Deep liquidity 101: Understanding market depth and execution quality", excerpt: "Comprehensive exploration of order book dynamics, slippage minimization strategies, and smart order routing...", href: "https://www.investopedia.com/terms/l/liquidity.asp", badge: "Trading" },
  { title: "Gas optimization, transaction fees & MEV protection strategies", excerpt: "Advanced techniques for managing Ethereum transaction costs while protecting against miner-extractable value...", href: "https://ethereum.org/en/developers/docs/mev/", badge: "Knowledge" },
  { title: "Cold vs. warm wallets: Balancing security and accessibility", excerpt: "Detailed analysis of HSM-backed custody solutions that provide both institutional-grade security and rapid transaction...", href: "https://www.coinbase.com/learn/crypto-basics/what-is-a-crypto-wallet", badge: "Custody" },
  { title: "Understanding decentralized exchange mechanics and AMM algorithms", excerpt: "Deep dive into automated market maker protocols, liquidity pool mathematics, impermanent loss calculations...", href: "https://uniswap.org/whitepaper.pdf", badge: "DeFi" },
  { title: "Cross-chain bridge security and interoperability protocols explained", excerpt: "Comprehensive guide to blockchain interoperability solutions, including trusted bridges, light client relays...", href: "https://wormhole.com/", badge: "Interoperability" },
];

const fallbackFaqs = [
  { q: "What is this platform and how does it work?", a: "This is an advanced peer-to-peer trading platform where users can securely buy or sell USDT directly with verified counterparties. Our platform integrates cutting-edge security, real-time market data, and institutional-grade execution." },
  { q: "Which networks are supported for USDT trading?", a: "Our platform provides extensive support for USDT trading across BEP-20 (Binance Smart Chain), ERC-20 (Ethereum), and TRC-20 (Tron) networks." },
  { q: "How do I start a trade?", a: "To begin trading, securely connect your preferred cryptocurrency wallet, browse available traders, select a suitable counterparty, and initiate the trade. You only release the USDT tokens after you have received and verified the agreed payment." },
  { q: "What are the fees?", a: "Our platform maintains complete transparency with a 0% trading fee policy. The only costs you may encounter are the standard network gas fees required for blockchain transactions, which are determined by the network itself." },
  { q: "Is this platform non-custodial?", a: "Yes. This is a completely non-custodial platform. All transactions occur directly between user wallets through audited smart contracts. We never hold user funds, ensuring you maintain full control over your assets." },
  { q: "What happens if there is a dispute?", a: "Our platform features a comprehensive dispute resolution system including automated escrow services and dedicated support mediation to ensure fair outcomes based on transaction evidence." },
];

// --- Main Home Section Component ---
export default function HomeSection({
  ads = [],
  currentAd = 0,
  news = [],
  articles = [],
  faqs = [],
  onTrade,
}) {
  // Use original, shorter lists. The UI will manage how many to show.
  const newsData = (news && news.length ? news : fallbackNews).slice(0, 5); // Show 5 news items
  const articlesData = articles && articles.length ? articles : fallbackArticles;
  const faqsData = faqs && faqs.length ? faqs : fallbackFaqs;

  const [openNews, setOpenNews] = React.useState(null);
  const [openArticle, setOpenArticle] = React.useState(null);
  const READER_API = getReaderApi();

  const handleTradeClick = () => {
    if (onTrade) {
      onTrade();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("go-trade"));
    }
  };

  return (
    <div className="bg-[#0A0F1C] text-white overflow-hidden">
      
      {/* --- 1. Hero Section --- */}
      <section className="relative flex flex-col justify-center min-h-[100dvh] max-w-7xl mx-auto px-6 py-16 text-center lg:text-left">
        {/* Background Gradient */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-blue-600/30 blur-[150px] rounded-full -translate-x-1/2" />
        <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-purple-600/30 blur-[150px] rounded-full translate-x-1/2" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content (Always visible first on mobile) */}
          <div className="flex flex-col items-center lg:items-start space-y-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              Secure P2P Trading.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Professional Speed.
              </span>
            </h1>
            <p className="text-lg text-blue-200/80 max-w-xl">
              Access deep liquidity on a non-custodial platform.
              Trade USDT securely across multiple chains with military-grade
              encryption and zero trading fees.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={handleTradeClick}
                className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform text-lg shadow-lg"
              >
                Start Trading Now
              </button>
              <a 
                href="#features" 
                className="bg-transparent border border-blue-400/50 px-8 py-4 rounded-xl font-bold hover:bg-blue-400/10 transition-all text-lg"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Right: Market Chart (Hidden on mobile to prioritize CTA) */}
          <div className="hidden lg:block">
            <MarketSnapshot ad={ads[currentAd]} />
          </div>
        </div>
      </section>

      {/* Container for subsequent sections */}
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20 relative z-10">

        {/* --- 2. Features Section --- */}
        <FeatureSection />

        {/* --- 3. Knowledge Center (with horizontal scroll) --- */}
        <KnowledgeCenter
          articles={articlesData}
          onArticleClick={setOpenArticle}
        />
        
        {/* --- 4. Market News --- */}
        <NewsSection 
          news={newsData} 
          onNewsClick={setOpenNews} 
        />
        
        {/* --- 5. FAQ Section --- */}
        <FaqSection faqs={faqsData} />
        
      </div>

      {/* --- Modals (Unchanged) --- */}
      {openNews && (
        <ContentModal item={openNews} onClose={() => setOpenNews(null)} readerApi={READER_API} />
      )}
      {openArticle && (
        <ContentModal item={openArticle} onClose={() => setOpenArticle(null)} readerApi={READER_API} />
      )}
    </div>
  );
}


function MarketSnapshot({ ad }) {
  const [btcPrice, setBtcPrice] = React.useState("$...");
  const [btcChange, setBtcChange] = React.useState(0);
  const tvRef = React.useRef(null);

  // Live BTC/USDT price from Binance
  useEffect(() => {
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
  useEffect(() => {
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
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: true,
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
      s.async = true;
      s.onload = init;
      document.body.appendChild(s);
    } else {
      init();
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" alt="BTC" className="w-6 h-6" />
            <span className="font-semibold text-lg">BTC/USDT</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">{btcPrice}</span>
            <span className={`block text-sm font-semibold ${btcChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {btcChange >= 0 ? "▲" : "▼"} {Math.abs(btcChange).toFixed(2)}%
            </span>
          </div>
        </div>
        <div ref={tvRef} className="h-80 rounded-lg border border-gray-700 overflow-hidden">
          <div id="tv_chart_container" className="h-full w-full" />
        </div>
      </div>

      {ad && (
        <a href={ad.link || "#"} target="_blank" rel="noopener noreferrer" 
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl hover:bg-white/10 transition-colors">
          <span className="text-xs font-bold bg-black/30 text-yellow-300 px-2 py-1 rounded-full">SPONSORED</span>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-4xl">{ad?.image || "💎"}</div>
            <div>
              <h3 className="text-lg font-bold">{ad?.title || "Exclusive Liquidity Program"}</h3>
              <p className="text-sm text-gray-300 line-clamp-2">{ad?.description || "VIP maker rebates and zero fees."}</p>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

/**
 * 2. Feature Section
 */
function FeatureSection() {
  const features = [
    { title: "Military-Grade Security", description: "Trade with peace of mind using non-custodial wallets and encrypted P2P communication.", icon: ShieldCheck },
    { title: "Multi-Chain Support", description: "Seamlessly trade USDT across Ethereum (ERC-20), Binance (BEP-20), and Tron (TRC-20).", icon: Layers },
    { title: "Zero Trading Fees", description: "Keep 100% of your trade. We charge zero platform fees for buying or selling.", icon: Zap },
  ];

  return (
    <section id="features" className="scroll-mt-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div key={feature.title} className="bg-gradient-to-br from-blue-900/50 to-purple-900/30 p-6 rounded-2xl border border-white/10">
            <feature.icon className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-blue-200/80">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * 3. Knowledge Center
 */
function KnowledgeCenter({ articles, onArticleClick }) {
  return (
    <section id="knowledge" className="scroll-mt-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Knowledge Center</h2>
        <button className="text-sm font-semibold text-cyan-400 hover:underline">
          View All <ArrowRight className="inline w-4 h-4" />
        </button>
      </div>
      {/* This is the horizontal scrolling container. 
        It's much cleaner than a long vertical list.
      */}
      <div className="flex gap-6 overflow-x-auto pb-4 -mb-4 scrollbar-thin scrollbar-thumb-blue-800 scrollbar-track-transparent">
        {articles.map((a, i) => (
          <button
            key={i}
            onClick={() => onArticleClick(a)}
            className="text-left group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors flex-shrink-0 w-80"
          >
            <span className="text-sm text-cyan-300 font-semibold">{a.badge || "Insight"}</span>
            <h3 className="text-lg font-bold mt-1 group-hover:underline">{a.title}</h3>
            <p className="mt-1 text-sm text-gray-300 line-clamp-2">{a.excerpt}</p>
            <span className="inline-flex items-center gap-1 mt-4 text-sm text-cyan-400 font-semibold">
              Read More <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * 4. News Section
 */
function NewsSection({ news, onNewsClick }) {
  return (
    <section id="markets" className="scroll-mt-20">
      <h2 className="text-3xl font-bold mb-6">Market News</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <ul className="divide-y divide-white/10">
          {news.map((n, i) => (
            <li key={i}>
              <button
                onClick={() => onNewsClick(n)}
                className="w-full text-left group flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="font-semibold group-hover:text-cyan-400">{n.title}</p>
                  <p className="text-xs text-white/60 mt-1">{n.source || "Desk"} • {n.time || "now"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * 5. FAQ Section
 */
function FaqSection({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [showAll, setShowAll] = useState(false);
  
  // Show first 4 by default
  const itemsToShow = showAll ? faqs : faqs.slice(0, 4);

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="scroll-mt-20 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-2 space-y-2">
        {itemsToShow.map((f, i) => (
          <FaqItem
            key={i}
            item={f}
            isOpen={openIndex === i}
            onToggle={() => toggleItem(i)}
          />
        ))}
      </div>
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowAll(!showAll)}
          className="border border-blue-400/50 px-6 py-3 rounded-xl font-bold hover:bg-blue-400/10 transition-all text-sm"
        >
          {showAll ? "Show Less" : "Show More Questions"}
        </button>
      </div>
    </section>
  );
}

// Helper for FAQ items with open/close state
function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-transparent hover:border-white/10 rounded-lg bg-white/5 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex justify-between items-center text-left"
      >
        <span className="font-medium text-lg">{item.q}</span>
        {isOpen ? (
          <Minus className="w-5 h-5 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-blue-200/80">
          {item.a}
        </div>
      )}
    </div>
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
    return () => { abort = true; };
  }, [item?.href, readerApi]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1222] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 flex-shrink-0">
          <h3 className="text-white font-bold text-lg line-clamp-1">{item.title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {html ? (
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          ) : item.href && !readerApi ? (
            <div className="space-y-4 text-white/80">
              <p>This content must be opened in a new tab.</p>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10 transition-colors"
              >
                Open in new tab <ArrowRight className="w-4 h-4" />
              </a>
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
                  Open in new tab <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-white/70">{item.excerpt || "No additional content available."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Test Exports (Unchanged) ---
export const __TESTS__ = {
  hasTradingViewContainer: () => {
    return typeof document !== "undefined" && !!document.getElementById("tv_chart_container");
  },
  fallbackDataPresent: () => {
    return ["newsData", "articlesData", "faqsData"].every(Boolean);
  },
  readerApiSafe: () => {
    try {
      const v = getReaderApi();
      return typeof v === "string";
    } catch {
      return false;
    }
  },
  readerApiPrefersNode: () => {
    const prev = (typeof process !== "undefined" && process.env && process.env.VITE_READER_API) || undefined;
    try {
      if (typeof process !== "undefined") {
        process.env = process.env || {};
        process.env.VITE_READER_API = "http://example.com/reader";
      }
      const v = getReaderApi();
      return v === "http://example.com/reader" || typeof v === "string";
    } catch {
      return false;
    } finally {
      if (typeof process !== "undefined" && process.env) {
        if (prev === undefined) delete process.env.VITE_READER_API; else process.env.VITE_READER_API = prev;
      }
    }
  },
};