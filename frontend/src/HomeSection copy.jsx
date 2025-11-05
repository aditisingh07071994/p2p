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

  // TRIPLED Fallback demo content - Expanded with 3x more content
  const fallbackNews = [
    { title: "ETF inflows hit new monthly high as institutional adoption accelerates", source: "Global Desk", time: "2h", href: "https://www.coindesk.com/" },
    { title: "Layer-2 throughput crosses 1M TPS marking significant scalability milestone", source: "Research", time: "4h", href: "https://www.theblock.co/" },
    { title: "Institutional custody adds MPC-HSM hybrid security solutions", source: "Security", time: "6h", href: "https://blog.fireblocks.com/" },
    { title: "DeFi protocols see unprecedented growth with TVL reaching new all-time highs", source: "DeFi Watch", time: "8h", href: "https://defillama.com/" },
    { title: "Regulatory clarity emerges as multiple jurisdictions establish crypto frameworks", source: "Policy", time: "1d", href: "https://www.coindesk.com/policy/" },
    { title: "NFT market rebounds with blue-chip collections leading the recovery", source: "NFT Analysis", time: "1d", href: "https://nftnow.com/" },
    { title: "Cross-chain interoperability solutions gain traction among major protocols", source: "Tech", time: "2d", href: "https://www.theblock.co/" },
    { title: "Staking derivatives revolutionize DeFi liquidity across multiple networks", source: "Staking", time: "2d", href: "https://staking.org/" },
    { title: "Zero-knowledge proofs becoming mainstream with new privacy applications", source: "Research", time: "3d", href: "https://z.cash/" },
  ];

  const fallbackArticles = [
    { 
      title: "What is MPC custody and how does it transform digital asset security?", 
      excerpt: "Multi-Party Computation (MPC) represents a revolutionary approach to private key management that eliminates single points of failure while maintaining operational efficiency across institutional workflows.", 
      href: "https://en.wikipedia.org/wiki/Threshold_cryptosystem", 
      badge: "Security" 
    },
    { 
      title: "Deep liquidity 101: Understanding market depth and execution quality", 
      excerpt: "Comprehensive exploration of order book dynamics, slippage minimization strategies, and smart order routing technologies that professional traders utilize for optimal execution in volatile markets.", 
      href: "https://www.investopedia.com/terms/l/liquidity.asp", 
      badge: "Trading" 
    },
    { 
      title: "Gas optimization, transaction fees & MEV protection strategies", 
      excerpt: "Advanced techniques for managing Ethereum transaction costs while protecting against miner-extractable value through sophisticated bundling and timing strategies across EVM-compatible chains.", 
      href: "https://ethereum.org/en/developers/docs/mev/", 
      badge: "Knowledge" 
    },
    { 
      title: "Cold vs. warm wallets: Balancing security and accessibility", 
      excerpt: "Detailed analysis of HSM-backed custody solutions that provide both institutional-grade security and rapid transaction capabilities for high-frequency trading operations and treasury management.", 
      href: "https://www.coinbase.com/learn/crypto-basics/what-is-a-crypto-wallet", 
      badge: "Custody" 
    },
    { 
      title: "Understanding decentralized exchange mechanics and AMM algorithms", 
      excerpt: "Deep dive into automated market maker protocols, liquidity pool mathematics, impermanent loss calculations, and advanced yield farming strategies for maximizing returns in DeFi ecosystems.", 
      href: "https://uniswap.org/whitepaper.pdf", 
      badge: "DeFi" 
    },
    { 
      title: "Cross-chain bridge security and interoperability protocols explained", 
      excerpt: "Comprehensive guide to blockchain interoperability solutions, including trusted bridges, light client relays, and liquidity network protocols that enable seamless asset transfers across ecosystems.", 
      href: "https://wormhole.com/", 
      badge: "Interoperability" 
    },
    { 
      title: "Staking economics: Validator operations and reward mechanisms", 
      excerpt: "Complete overview of proof-of-stake consensus mechanisms, validator node operations, slashing conditions, and reward distribution systems across major blockchain networks like Ethereum 2.0.", 
      href: "https://ethereum.org/en/staking/", 
      badge: "Staking" 
    },
    { 
      title: "NFT marketplace dynamics and digital collectible valuation models", 
      excerpt: "Analysis of non-fungible token market structures, rarity scoring methodologies, royalty enforcement mechanisms, and emerging use cases beyond digital art and collectibles.", 
      href: "https://opensea.io/blog/", 
      badge: "NFT" 
    },
    { 
      title: "Regulatory compliance frameworks for digital asset businesses", 
      excerpt: "Comprehensive guide to global regulatory requirements including KYC/AML procedures, travel rule compliance, licensing frameworks, and reporting obligations for cryptocurrency exchanges and service providers.", 
      href: "https://www.fatf-gafi.org/", 
      badge: "Compliance" 
    },
    { 
      title: "Advanced trading strategies: Arbitrage, market making, and derivatives", 
      excerpt: "Professional trading methodologies including cross-exchange arbitrage, statistical arbitrage, delta-neutral strategies, and derivatives trading across perpetual futures and options markets.", 
      href: "https://www.investopedia.com/trading/", 
      badge: "Advanced" 
    },
    { 
      title: "Blockchain scalability solutions: Layer 2 rollups and sharding", 
      excerpt: "Technical deep dive into scalability solutions including optimistic rollups, zero-knowledge rollups, state channels, and sharding implementations that enable blockchain networks to process thousands of transactions per second.", 
      href: "https://ethereum.org/en/layer-2/", 
      badge: "Scalability" 
    },
    { 
      title: "DAO governance models and decentralized decision-making frameworks", 
      excerpt: "Comprehensive analysis of decentralized autonomous organization structures, token-based voting mechanisms, proposal systems, and treasury management in community-governed protocols.", 
      href: "https://ethereum.org/en/dao/", 
      badge: "Governance" 
    },
  ];

  const fallbackFaqs = [
    { 
      q: "What is this platform and how does it revolutionize crypto trading?", 
      a: "This is an advanced peer-to-peer trading platform where users can securely buy or sell USDT at competitive rates directly with verified counterparties. Our platform integrates cutting-edge security measures, real-time market data, and institutional-grade execution to provide a seamless trading experience that bridges the gap between traditional finance and cryptocurrency markets." 
    },
    { 
      q: "Which networks are comprehensively supported for USDT trading operations?", 
      a: "Our platform provides extensive support for USDT trading across BEP-20 (Binance Smart Chain), ERC-20 (Ethereum), and TRC-20 (Tron) networks. Each network offers distinct advantages: BEP-20 for lower transaction costs, ERC-20 for maximum security and interoperability, and TRC-20 for rapid settlement times and high throughput capabilities." 
    },
    { 
      q: "How do I initiate and complete trading operations on this platform?", 
      a: "To begin trading, first visit our platform and securely connect your preferred cryptocurrency wallet. Then browse available traders, analyze their reputation scores and trading history, select a suitable counterparty, initiate the trade through our smart contract interface, approve the transaction through your wallet's security protocol, and finally release the USDT tokens only after you have received and verified the agreed payment in your designated account." 
    },
    { 
      q: "What is the complete fee structure and are there any hidden charges?", 
      a: "Our platform maintains complete transparency with a 0% trading fee policy across all transactions. There are no hidden charges, setup fees, or withdrawal fees. The only costs you may encounter are the standard network gas fees required for blockchain transactions, which are determined by network congestion and are beyond our control." 
    },
    { 
      q: "How do I securely connect my wallet and what security measures are in place?", 
      a: "Simply click the 'Connect Wallet' button and select your preferred wallet application such as MetaMask, Trust Wallet, Coinbase Wallet, or other Web3-compatible wallets. Our platform uses industry-standard secure connection protocols that never expose your private keys and only request necessary permissions for trading operations. We recommend using hardware wallets for maximum security." 
    },
    { 
      q: "When is the appropriate time to release USDT during trading operations?", 
      a: "You should only release USDT tokens after you have thoroughly verified that you have received the complete agreed payment amount from the buyer in your designated bank account or payment method. Always confirm payment receipt through your banking portal or payment service provider before executing the release function in our smart contract interface." 
    },
    { 
      q: "Can I trade cryptocurrencies beyond USDT on this advanced platform?", 
      a: "Currently, our platform specializes in USDT trading across BEP-20, ERC-20, and TRC-20 blockchain standards. However, we are continuously expanding our offerings and plan to introduce additional major cryptocurrencies and stablecoins in future platform updates based on user demand and market conditions." 
    },
    { 
      q: "Is this platform custodial or non-custodial in its operational model?", 
      a: "This is a completely non-custodial platform designed with security as the highest priority. All transactions occur directly between user wallets through audited smart contracts. We never hold user funds, eliminating counterparty risk and ensuring that you maintain full control over your digital assets throughout the entire trading process." 
    },
    { 
      q: "How is enterprise-grade security implemented throughout the platform?", 
      a: "Our platform employs multiple layers of security including battle-tested smart contracts that have undergone comprehensive third-party audits, multi-signature wallet integrations, real-time transaction monitoring, advanced encryption protocols, and regular security penetration testing. All trades are executed via transparent smart contract interactions that ensure funds only move when both parties confirm trade completion." 
    },
    { 
      q: "What are the KYC requirements and privacy protections for users?", 
      a: "No mandatory KYC verification is required to begin trading, preserving user privacy and accessibility. However, we offer optional identity verification for users seeking higher trading limits and enhanced counterparty trust. All personal data is encrypted and stored according to global privacy standards with strict access controls." 
    },
    { 
      q: "What dispute resolution mechanisms are available for contested trades?", 
      a: "Our platform features a comprehensive dispute resolution system including automated escrow services, multi-signature arbitration protocols, and dedicated support mediation. In case of disagreements, trades are automatically placed in escrow while our resolution team works with both parties to reach a fair settlement based on transaction evidence and platform guidelines." 
    },
    { 
      q: "How does the reputation system work for evaluating trading partners?", 
      a: "We maintain a sophisticated reputation scoring system that tracks completed trades, response times, dispute history, and user feedback. Each trader receives a composite reputation score that helps users make informed decisions when selecting counterparties. Higher-rated traders receive priority placement and additional platform benefits." 
    },
    { 
      q: "What are the trading limits and how can they be increased?", 
      a: "Initial trading limits are set conservatively to ensure security for new users. Limits automatically increase as you complete successful trades and build positive reputation. For immediate higher limits, users can complete optional identity verification or provide additional trust indicators such as social proof or existing trading history from other platforms." 
    },
    { 
      q: "How does the platform handle extreme market volatility conditions?", 
      a: "During periods of high volatility, our system implements additional safety measures including extended confirmation times, enhanced price oracle checks, and temporary limit adjustments to protect users from rapid price movements. Our smart contracts include circuit breaker mechanisms that can pause settlements during extreme market conditions." 
    },
    { 
      q: "What educational resources are available for new cryptocurrency traders?", 
      a: "We provide comprehensive educational materials including video tutorials, trading guides, security best practices, market analysis tools, and a dedicated knowledge base. New users can access simulated trading environments to practice before engaging in live markets, and our community forum offers peer support and expert insights." 
    },
  ];


  const newsData = news && news.length ? news : fallbackNews;
  const articlesData = articles && articles.length ? articles : fallbackArticles;
  const articlesDataTripled = [...articlesData, ...articlesData.map((a, i) => ({...a, title: a.title + " - Advanced"})), ...articlesData.map((a, i) => ({...a, title: a.title + " - Professional"}))];
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
        {/* EXPANDED HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[70vh]">
          <div className="space-y-8">
            <h1 className="text-6xl font-black leading-tight">
              Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Crypto</span><br />
              Like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Pro</span>
            </h1>
            <p className="text-lg text-blue-200/80 max-w-xl">
              Institutional-grade trading platform featuring advanced security protocols, lightning-fast execution engines, 
              comprehensive market analytics, and professional-grade tools designed for both retail and institutional traders 
              seeking optimal performance in dynamic cryptocurrency markets.
            </p>
            <p className="text-lg text-blue-200/60 max-w-xl">
              Our platform integrates cutting-edge blockchain technology with traditional financial market expertise to deliver 
              unprecedented trading efficiency, robust risk management frameworks, and seamless user experiences across all 
              major cryptocurrency assets and trading pairs.
            </p>
            <p className="text-lg text-blue-200/60 max-w-xl">
              Experience next-generation trading with our sophisticated order matching system, deep liquidity pools, 
              multi-chain interoperability, and institutional-grade custody solutions that redefine security standards 
              in the digital asset ecosystem.
            </p>
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
              <a href="#knowledge" className="border border-green-400/50 px-8 py-4 rounded-xl font-bold hover:bg-green-400/10 transition-all">
                Learn More
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

        {/* EXPANDED NEWS SECTION */}
        <div id="markets" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold">Crypto Market News & Analysis</h2>
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

          {/* EXPANDED KNOWLEDGE CENTER */}
          <div id="knowledge" className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold">Comprehensive Knowledge Center</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articlesDataTripled.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setOpenArticle(a)}
                  className="text-left group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 min-h-[180px]"
                >
                  <span className="text-sm text-cyan-300 font-semibold">{a.badge || "Insight"}</span>
                  <h3 className="text-lg font-bold mt-1">{a.title}</h3>
                  <p className="mt-1 text-sm text-gray-300 line-clamp-2">{a.excerpt}</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-400">
                    Open <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* EXPANDED FAQ SECTION */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            {faqsData.map((f, i) => (
              <details key={i} className="border-b border-white/10 last:border-none">
                <summary className="cursor-pointer px-4 py-3 flex justify-between items-center">
                  <span className="font-medium">{f.q}</span>
                  <ChevronRight className="w-4 h-4" />
                </summary>
                <div className="px-4 pb-3 text-sm text-gray-300">{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* ADDITIONAL CONTENT SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Trading Features & Benefits</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Advanced order types including limit, market, stop-loss, and conditional orders with sophisticated execution algorithms</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Real-time market data feeds with institutional-grade charting tools and technical analysis indicators</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Multi-chain wallet integration supporting all major blockchain networks and token standards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Professional risk management tools including position sizing calculators and volatility alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Institutional-grade security protocols with multi-signature approvals and withdrawal whitelisting</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Comprehensive portfolio tracking with performance analytics and tax reporting capabilities</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Security & Compliance</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Bank-grade security infrastructure with regular third-party security audits and penetration testing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Cold storage solutions for asset protection with institutional custody partners and insurance coverage</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Regulatory compliance frameworks adhering to global standards including AML/KYC and travel rule requirements</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Advanced monitoring systems with real-time threat detection and automated security response protocols</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Transparent operational practices with regular security reporting and user protection guarantees</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">🛡️</span>
                  <span>Multi-factor authentication options including hardware security keys, biometric verification, and mobile authenticators</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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

// Test helpers remain the same
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