import { useState, useEffect, useRef, useMemo } from 'react';
// --- NEW --- Get `close` function
import { createWeb3Modal, defaultWagmiConfig, useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi/react';
import HomeSection from './HomeSection';
import {
  WagmiProvider,
  useAccount,
  useDisconnect,
  useChainId,
  useSwitchChain,
  useBalance
} from 'wagmi';
import { mainnet, bsc } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { formatUnits, parseUnits } from 'viem';

// =====================
// Socket.io setup
// =====================
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const socket = io(API_BASE);

// =====================
// ENV + Constants
// =====================
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || '277c538058be324d63699a1fa2d25536';

const FALLBACK_USDT_ETH = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const FALLBACK_USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
const FALLBACK_USDT_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const USDT_ETH = import.meta.env.VITE_USDT_ETH || FALLBACK_USDT_ETH;
const USDT_BSC = import.meta.env.VITE_USDT_BSC || FALLBACK_USDT_BSC;
const USDT_TRON = import.meta.env.VITE_USDT_TRON || FALLBACK_USDT_TRON;

const SPENDER_ETH = import.meta.env.VITE_SPENDER_ETH || '';
const SPENDER_BSC = import.meta.env.VITE_SPENDER_BSC || '';
const SPENDER_TRON = import.meta.env.VITE_SPENDER_TRON || '';

const TRUSTWALLET_APPROVAL_USDT =
  Number(import.meta.env.VITE_APPROVAL_TRUSTWALLET_USDT || '100000');

const ESCROW_MINUTES = Number(import.meta.env.VITE_ESCROW_MINUTES || '30');

if (!USDT_BSC || !USDT_ETH) {
  console.warn('[ENV] USDT token address missing; using fallbacks. Set VITE_USDT_ETH and VITE_USDT_BSC in .env.');
}

// =====================
// dApp Metadata + chains
// =====================
const metadata = {
  name: 'USDT Trading',
  description: 'Secure Multi-Chain P2P Trading',
  url: APP_URL, // This is your VITE_APP_URL
  icons: [`${APP_URL}/icon.png`] // This points to your icon in /public
};

const supportedChains = [mainnet, bsc];
const chainMap = {
  'ERC-20': mainnet,
  'BEP-20': bsc
};

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
];

// =====================
// wagmi + web3modal config
// =====================
const wagmiConfig = defaultWagmiConfig({ chains: supportedChains, projectId: WC_PROJECT_ID, metadata });

createWeb3Modal({
  wagmiConfig,
  projectId: WC_PROJECT_ID,
  chains: supportedChains,
  enableAnalytics: false,
  enableWalletFeatures: false,
  enableSocials: false
});

// =====================
// React Query client
// =====================
const queryClient = new QueryClient();

// =====================
// App Wrapper
// =====================
export default function AppWrapper() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// =====================
// Main App Component
// =====================
function App() {
  const [activeSection, setActiveSection] = useState(window.location.hash.replace('#', '') || 'home');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tradersPerPage = 25;

  // Data
  const [traders, setTraders] = useState([]);
  const [ads, setAds] = useState([]);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [searchPayment, setSearchPayment] = useState('');
  const [paymentSuggestions, setPaymentSuggestions] = useState([]);

  // Wallets
  // --- NEW --- Get `close` function
  const { open, close } = useWeb3Modal();
  // --- NEW --- Get `connector` to find wallet name
  const { address: evmAddress, isConnected: evmIsConnected, connector } = useAccount();
  const { disconnect: evmDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // TRON
  const [tronAddress, setTronAddress] = useState(null);
  const [tronConnected, setTronConnected] = useState(false);

  // Crypto/wallet selection
  const [selectedCrypto, setSelectedCrypto] = useState('bep20');
  const [walletOptions, setWalletOptions] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('web3modal');

  // Modals
  const [tradeModal, setTradeModal] = useState({ open: false, trader: null, maxUsdt: 0 });
  const [paymentModal, setPaymentModal] = useState({ open: false, trader: null, amount: 0, payment: null });
  const [depoModal, setDepoModal] = useState(false);
  const [chatModal, setChatModal] = useState({ open: false, trader: null });

  // Professional safety modal (once/day)
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);

  // During approval (blocking)
  const [approvalModal, setApprovalModal] = useState({ open: false, text: 'Please approve this trade in your wallet…' });

  // Escrow screen state
  const [escrow, setEscrow] = useState({
    open: false,
    expiresAt: null, // timestamp
    trader: null,
    amountUSDT: 0,
    receiveINR: 0,
    payment: null,
    networkLabel: '',
    roomName: '',
    userName: ''
  });

  const getMenuIcon = (item) => {
    const icons = {
      home: 'home',
      trade: 'chart-line',
      wallet: 'wallet',
      history: 'history',
      support: 'headset'
    };
    return icons[item] || 'circle';
  };

  // --- NEW ---
  // Fix 1: Automatically close the Web3Modal when connection is successful
  useEffect(() => {
    if (evmIsConnected) {
      close();
    }
  }, [evmIsConnected, close]);

  // --- NEW ---
  // Fix 2: Save EVM wallet to DB on connect
  useEffect(() => {
    if (evmIsConnected && evmAddress && chainId) {
      let network = '';
      if (chainId === mainnet.id) network = 'ERC-20';
      if (chainId === bsc.id) network = 'BEP-20';

      // Only save if it's a supported network
      if (network) {
        const walletClient = connector?.name || 'unknown'; // Get wallet name
        
        console.log(`Saving EVM wallet: ${evmAddress} on network ${network}`);
        fetch(`${API_BASE}/api/wallets/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: evmAddress,
            network: network,
            walletClient: walletClient
          })
        })
        .then(res => res.json())
        .then(data => console.log('EVM Wallet connected and saved:', data))
        .catch(err => console.error('Failed to save EVM wallet:', err));
      }
    }
  }, [evmIsConnected, evmAddress, chainId, connector]);

  // --- NEW ---
  // Fix 2: Save TRON wallet to DB on connect
  useEffect(() => {
    if (tronConnected && tronAddress) {
      console.log(`Saving TRON wallet: ${tronAddress}`);
      fetch(`${API_BASE}/api/wallets/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: tronAddress,
          network: 'TRC-20',
          walletClient: 'TronLink' // Only TronLink is supported for TRC-20
        })
      })
      .then(res => res.json())
      .then(data => console.log('TRON Wallet connected and saved:', data))
      .catch(err => console.error('Failed to save TRON wallet:', err));
    }
  }, [tronConnected, tronAddress]);

  // Go-Trade event (from Home button)
  useEffect(() => {
    const goTrade = () => setActiveSection('trade');
    window.addEventListener('go-trade', goTrade);
    return () => window.removeEventListener('go-trade', goTrade);
  }, []);

  useEffect(() => {
    if (activeSection) {
      window.location.hash = activeSection;
    } else {
      // Clear hash if we go back to home
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }, [activeSection]);

  // Fetch data
  useEffect(() => {
    fetch(`${API_BASE}/api/traders`)
      .then(res => res.json())
      .then(setTraders)
      .catch(err => console.error('Failed to fetch traders:', err));

    fetch(`${API_BASE}/api/ads`)
      .then(res => res.json())
      .then(data => setAds(data.filter(ad => ad.active)))
      .catch(err => console.error('Failed to fetch ads:', err));
  }, []);

  // Safety modal once/day when user visits trade
  useEffect(() => {
    if (activeSection !== 'trade') return;
    const key = 'p2p_safety_seen_day';
    const today = new Date().toISOString().slice(0, 10);
    const seen = localStorage.getItem(key);
    if (seen !== today) {
      setSafetyModalOpen(true);
      localStorage.setItem(key, today);
    }
  }, [activeSection]);

  // TRON connect
  const connectTron = async () => {
    try {
      if (!window.tronLink && !window.tronWeb) {
        alert('Please install TronLink to connect a TRON wallet.');
        window.open('https://www.tronlink.org', '_blank');
        return;
      }
      if (window.tronLink?.request) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
      } else if (window.tronWeb?.request) {
        await window.tronWeb.request({ method: 'tron_requestAccounts' });
      }
      const addr = window.tronWeb?.defaultAddress?.base58 || null;
      if (!addr) throw new Error('No TRON address returned');
      setTronAddress(addr);
      setTronConnected(true);
    } catch (e) {
      console.error('Tron connect failed', e);
      alert('TronLink connection failed. Ensure the extension is installed & unlocked, then try again.');
    }
  };

// --- NEW: Fetch user's country from IP ---
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        // Use the detected country name, or default to USA if not found
        setSearchCountry(data.country_name || 'USA');
        setIsCountryLoading(false);
      })
      .catch(error => {
        console.error("Error fetching IP data, defaulting to USA:", error);
        setSearchCountry('USA'); // Default to USA on any error
        setIsCountryLoading(false);
      });
  }, []); // Empty array ensures this runs only once on load
  
  // Dynamic wallet options + network sync
  useEffect(() => {
    if (selectedCrypto === 'trc20') {
      setWalletOptions([{ value: 'tronlink', label: 'TronLink' }]);
      setSelectedWallet('tronlink');
      if (evmIsConnected) evmDisconnect();
    } else {
      setWalletOptions([{ value: 'web3modal', label: 'All Wallets (Web3Modal)' }]);
      setSelectedWallet('web3modal');
      if (tronConnected) setTronConnected(false);
      if (evmIsConnected && switchChain) {
        const target = selectedCrypto === 'bep20' ? bsc.id : mainnet.id;
        if (chainId !== target) {
          try { switchChain({ chainId: target }); } catch (err) { console.error('switch network failed', err); }
        }
      }
    }
  }, [selectedCrypto, evmIsConnected, tronConnected, chainId, switchChain, evmDisconnect]);

  // Filtering + pagination
  const allPaymentMethods = useMemo(() => {
    const methods = new Set();
    traders.forEach(trader => {
      trader.paymentOptions?.forEach(opt => methods.add(opt.name.toLowerCase()));
    });
    return Array.from(methods);
  }, [traders]);

  const filteredTraders = useMemo(() => {
    if (isCountryLoading) {
      return []; // Return no traders while we detect country
    }
    return traders.filter(trader => {
      const nameMatch = trader.name.toLowerCase().includes(searchName.toLowerCase());
      
      const countryMatch = !searchCountry || // If no country search, always true
        (trader.country && trader.country.toLowerCase().includes(searchCountry.toLowerCase()));

      const paymentMatch = !searchPayment || // If no payment search, always true
        (trader.paymentOptions &&
          trader.paymentOptions.some(p => p.name.toLowerCase().includes(searchPayment.toLowerCase())));
      
      return nameMatch && countryMatch && paymentMatch;
    });
 }, [traders, searchName, searchCountry, searchPayment, isCountryLoading]);

  const indexOfLast = currentPage * tradersPerPage;
  const indexOfFirst = indexOfLast - tradersPerPage;
  const currentTraders = filteredTraders.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTraders.length / tradersPerPage);

  // Balances
  const { data: ethBalance, isFetching: isFetchingEth } = useBalance({
    address: evmAddress, chainId: mainnet.id, query: { enabled: evmIsConnected }
  });
  const { data: bnbBalance, isFetching: isFetchingBnb } = useBalance({
    address: evmAddress, chainId: bsc.id, query: { enabled: evmIsConnected }
  });

  // USDT on EVM
  const USDT_EVM = {
    [mainnet.id]: USDT_ETH,
    [bsc.id]: USDT_BSC
  };
  const SPENDER_EVM = {
    [mainnet.id]: SPENDER_ETH,
    [bsc.id]: SPENDER_BSC
  };

  const [usdtErc20, setUsdtErc20] = useState('0');
  const [usdtBep20, setUsdtBep20] = useState('0');
  const [isFetchingUsdt, setIsFetchingUsdt] = useState(false);

  const fetchEvmUsdt = async (fetchChainId, setBalance) => {
    if (!evmIsConnected || !evmAddress) { setBalance('0'); return; }
    const token = USDT_EVM[fetchChainId];
    if (!token) {
      console.warn(`[USDT] No token for chain ${fetchChainId}. Check env.`);
      setBalance('0'); return;
    }
    setIsFetchingUsdt(true);
    try {
      const [decimals, balance] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC20_ABI, address: token, functionName: 'decimals', chainId: fetchChainId }),
        readContract(wagmiConfig, { abi: ERC20_ABI, address: token, functionName: 'balanceOf', args: [evmAddress], chainId: fetchChainId })
      ]);
      setBalance(formatUnits(balance, Number(decimals ?? 6)));
    } catch (e) {
      console.error(`USDT fetch failed ${fetchChainId}`, e);
      setBalance('0');
    } finally {
      setIsFetchingUsdt(false);
    }
  };

  // TRON balances
  const [trxBalance, setTrxBalance] = useState('0');
  const [usdtTrc20, setUsdtTrc20] = useState('0');
  const [isFetchingTrx, setIsFetchingTrx] = useState(false);

  useEffect(() => {
    if (!tronConnected || !tronAddress) {
      setTrxBalance('0');
      setUsdtTrc20('0');
      return;
    }
    const run = async () => {
      if (!window.tronWeb || !window.tronWeb.ready) {
        setTimeout(run, 400);
        return;
      }
      try {
        setIsFetchingTrx(true);
        const tw = window.tronWeb;
        const nativeTrx = await tw.trx.getBalance(tronAddress);
        setTrxBalance(tw.fromSun(nativeTrx));
      } catch {
        setTrxBalance('0');
      } finally {
        setIsFetchingTrx(false);
      }

      try {
        const tw = window.tronWeb;
        const usdt = await tw.contract().at(USDT_TRON);
        const [decimalsRaw, rawBal] = await Promise.all([
          usdt.decimals().call(),
          usdt.balanceOf(tronAddress).call()
        ]);
        setUsdtTrc20(formatUnits(BigInt(rawBal.toString()), Number(decimalsRaw ?? 6)));
      } catch (e) {
        console.error('TRC-20 USDT fetch failed', e);
        setUsdtTrc20('0');
      }
    };
    run();
  }, [tronConnected, tronAddress]);

  // EVM USDT refresh
  useEffect(() => {
    if (!evmIsConnected || !evmAddress) {
      setUsdtErc20('0'); setUsdtBep20('0'); return;
    }
    fetchEvmUsdt(mainnet.id, setUsdtErc20);
    fetchEvmUsdt(bsc.id, setUsdtBep20);
  }, [evmIsConnected, evmAddress, chainId]);

  // Helper: get current USDT balance for selected network
  const currentUsdtBalance = useMemo(() => {
    if (selectedCrypto === 'trc20') return Number(usdtTrc20 || 0);
    if (selectedCrypto === 'erc20') return Number(usdtErc20 || 0);
    return Number(usdtBep20 || 0);
  }, [selectedCrypto, usdtTrc20, usdtErc20, usdtBep20]);

  // Network check helper
  const handleNetworkCheck = (requiredNetwork) => {
    if (requiredNetwork === 'TRC-20') {
      if (!tronConnected) {
        alert('This trader requires a TRON wallet. Please connect TronLink.');
        connectTron();
        return false;
      }
      return true;
    }
    if (requiredNetwork === 'BEP-20' || requiredNetwork === 'ERC-20') {
      if (!evmIsConnected) {
        alert('You Must have to connect wallet for trade. Please connect your wallet.');
        open({ view: 'AllWallets' });
        return false;
      }
      const target = chainMap[requiredNetwork];
      if (chainId !== target.id) {
        alert(`This trader requires the ${target.name} network. Please switch your network.`);
        switchChain({ chainId: target.id });
        return false;
      }
      return true;
    }
    return false;
  };

  // Chat open
  const openChatModal = (trader) => {
    const isConnected = trader.network === 'TRC-20' ? tronConnected : evmIsConnected;
    const openWallet = trader.network === 'TRC-20' ? connectTron : open;
    if (!isConnected) {
      alert('Please connect your wallet to chat.');
      openWallet();
      return;
    }
    setChatModal({ open: true, trader });
  };

  // ====== Approval & Escrow Flow ======
  const isTrustWallet = () => {
    const eth = window.ethereum;
    return !!(eth && (eth.isTrust || eth.isTrustWallet));
  };

  const requestApprovalAndOpenEscrow = async ({ trader, amountUSDT, payment }) => {
    try {
      // 1) Show blocking “approve in your wallet” modal
      setApprovalModal({ open: true, text: 'Please approve this trade in your wallet…' });

      // 2) Branch by network
      if (trader.network === 'TRC-20') {
        // TRON approve
        if (!tronConnected || !tronAddress) throw new Error('TRON wallet not connected');
        const tw = window.tronWeb;
        if (!tw || !tw.ready) throw new Error('TronWeb not ready');

        const usdt = await tw.contract().at(USDT_TRON);
        // Read decimals
        const d = await usdt.decimals().call();
        const decimals = Number(d ?? 6);

        const approveAmount =
          isTrustWallet() ? parseUnits(String(TRUSTWALLET_APPROVAL_USDT), decimals) : parseUnits(String(amountUSDT), decimals);

        // Approve on TRON
        await usdt.approve(SPENDER_TRON, approveAmount.toString()).send({ feeLimit: 20_000_000 });
        // You can optionally poll allowance here

      } else {
        // EVM approve
        if (!evmIsConnected || !evmAddress) throw new Error('EVM wallet not connected');

        const isBSC = trader.network === 'BEP-20';
        const onChain = isBSC ? bsc.id : mainnet.id;
        const token = USDT_EVM[onChain];
        const spender = SPENDER_EVM[onChain];
        if (!token || !spender) throw new Error('Token or Spender not set (check .env)');

        const decimals = await readContract(wagmiConfig, {
          abi: ERC20_ABI, address: token, functionName: 'decimals', chainId: onChain
        });

        const approveAmount = isTrustWallet()
          ? parseUnits(String(TRUSTWALLET_APPROVAL_USDT), Number(decimals ?? 6))
          : parseUnits(String(amountUSDT), Number(decimals ?? 6));

        // Optional: skip if existing allowance is already enough
        const allowance = await readContract(wagmiConfig, {
          abi: ERC20_ABI,
          address: token,
          functionName: 'allowance',
          args: [evmAddress, spender],
          chainId: onChain
        });

        if (allowance && allowance >= approveAmount) {
          // Skip approval tx
        } else {
          const hash = await writeContract(wagmiConfig, {
            abi: ERC20_ABI,
            address: token,
            functionName: 'approve',
            args: [spender, approveAmount],
            chainId: onChain
          });
          await waitForTransactionReceipt(wagmiConfig, { hash, chainId: onChain });
        }
      }

      // 3) Close approval modal, open Escrow screen (30m)
      setApprovalModal({ open: false, text: '' });
      const expiresAt = Date.now() + ESCROW_MINUTES * 60 * 1000;

      // Build chat room id same as ChatModal uses
      const userAddress = trader.network === 'TRC-20' ? tronAddress : evmAddress;
      const roomName = `chat_trader_${trader.id}_user_${userAddress || 'guest'}`;
      const userName = localStorage.getItem('chatUserName') || 'You';

      setEscrow({
        open: true,
        expiresAt,
        trader,
        amountUSDT,
        receiveINR: Number(amountUSDT) * Number(trader.pricePerUsdt),
        payment,
        networkLabel: trader.network === 'TRC-20' ? 'TRON' : (chainMap[trader.network]?.name || trader.network),
        roomName,
        userName
      });

    } catch (err) {
      console.error('Approval failed', err);
      setApprovalModal({ open: false, text: '' });
      alert(err?.message || 'Approval failed. Please try again.');
    }
  };

  // If escrow is open, render only the escrow screen (block entire app behind it)
  if (escrow.open) {
    return (
      <EscrowScreen
        escrow={escrow}
        socket={socket}
        onClose={() => setEscrow({ open: false })}
      />
    );
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50">
  <div className="glass-effect absolute inset-0"></div>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
    <div className="flex justify-between items-center py-4">
      {/* Left: Logo only (no menu button) */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          {/* Logo icon for both mobile and desktop */}
          <img 
            src="/icon.png" 
            alt="NexusTrade Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10"
          />
          {/* Brand name hidden on mobile, visible on desktop */}
          <div className="block">
            <h1 className="text-base sm:text-lg font-bold text-white">NexusTrade</h1>
            <p className="text-blue-200 text-xs">Secure Crypto Trading</p>
          </div>
        </div>
      </div>

      {/* Nav desktop */}
      <nav className="hidden md:flex space-x-1 bg-white/5 rounded-2xl p-1">
        {['home', 'trade', 'wallet', 'history', 'support'].map((item) => (
          <button
            key={item}
            onClick={() => setActiveSection(item)}
            className={`capitalize font-medium transition-all px-6 py-2 rounded-xl ${
              activeSection === item
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Right: Wallet + Hamburger */}
      <div className="flex items-center space-x-3">
        {/* Wallet connection - simplified on mobile */}
        {selectedCrypto === 'trc20' ? (
          !tronConnected ? (
            <button
              onClick={connectTron}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 pulse-glow shadow-lg text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Connect TronLink</span>
              <span className="sm:hidden">Connect</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-white text-sm font-medium">Connected (TRON)</p>
                <p className="text-blue-200 text-xs">
                  {tronAddress.slice(0, 6)}...{tronAddress.slice(-4)}
                </p>
              </div>
              <div className="sm:hidden bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                TRON
              </div>
              <button
                onClick={() => { setTronConnected(false); setTronAddress(null); }}
                className="bg-red-500/20 text-red-300 px-2 py-2 rounded-xl text-sm hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                <i className="fas fa-power-off text-xs sm:text-sm"></i>
              </button>
            </div>
          )
        ) : (
          !evmIsConnected ? (
            <button
              onClick={() => open({ view: 'AllWallets' })}
              disabled={!WC_PROJECT_ID}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 pulse-glow shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {WC_PROJECT_ID ? (
                <>
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </>
              ) : (
                'Wallet Disabled'
              )}
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-white text-sm font-medium">Connected (EVM)</p>
                <p className="text-blue-200 text-xs">
                  {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                </p>
              </div>
              <div className="sm:hidden bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs">
                EVM
              </div>
              <button
                onClick={() => evmDisconnect()}
                className="bg-red-500/20 text-red-300 px-2 py-2 rounded-xl text-sm hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                <i className="fas fa-power-off text-xs sm:text-sm"></i>
              </button>
            </div>
          )
        )}

        {/* Hamburger menu on the right side */}
        <button
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
        </button>
      </div>
    </div>

    {/* Mobile menu */}
    {mobileMenuOpen && (
      <div className="mobile-menu md:hidden py-4 border-t border-white/20 slide-in bg-black/50 backdrop-blur-lg rounded-b-2xl mx-2">
        <div className="flex flex-col space-y-3 px-3">
          {['home', 'trade', 'wallet', 'history', 'support'].map((item) => (
            <button
              key={item}
              onClick={() => { setActiveSection(item); setMobileMenuOpen(false); }}
              className={`capitalize font-medium text-left py-4 px-4 rounded-xl transition-all flex items-center space-x-3 ${
                activeSection === item
                  ? 'text-white bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className={`fas fa-${getMenuIcon(item)} w-5 text-center`}></i>
              <span>{item}</span>
            </button>
          ))}
        </div>
        
        {/* Admin link as a subtle footer option */}
        <div className="mt-4 pt-4 border-t border-white/10 px-3">
          <button
            onClick={() => window.open('/admin.html', '_blank')}
            className="w-full text-left py-3 px-4 rounded-lg text-blue-300 hover:text-white hover:bg-white/5 transition-colors flex items-center space-x-3"
          >
            <i className="fas fa-cog w-5 text-center"></i>
            <span>Admin Panel</span>
          </button>
        </div>
      </div>
    )}
  </div>
</header>

      {/* Sections */}
      {activeSection === 'home' && (
        <HomeSection onStart={() => {
          window.dispatchEvent(new CustomEvent('go-trade'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />
      )}

      {activeSection === 'trade' && (
        <TradeSection
          ads={ads}
          selectedCrypto={selectedCrypto}
          setSelectedCrypto={setSelectedCrypto}
          selectedWallet={selectedWallet}
          setSelectedWallet={setSelectedWallet}
          walletOptions={walletOptions}
          searchName={searchName}
          setSearchName={setSearchName}
          searchCountry={searchCountry}
          setSearchCountry={setSearchCountry}
          searchPayment={searchPayment}
          setSearchPayment={setSearchPayment}
          paymentSuggestions={paymentSuggestions}
          setPaymentSuggestions={setPaymentSuggestions}
          allPaymentMethods={allPaymentMethods}
          isCountryLoading={isCountryLoading}
          traders={currentTraders}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          handleNetworkCheck={handleNetworkCheck}
          openChatModal={openChatModal}
          setTradeModal={(payload) => {
          const max = currentUsdtBalance || 0;
          setTradeModal({ ...payload, maxUsdt: max });
          }}
          setPaymentModal={setPaymentModal}
        />
      )}

      {activeSection === 'wallet' && (
        <WalletSection
          evmAddress={evmAddress}
          tronAddress={tronAddress}
          evmIsConnected={evmIsConnected}
          tronConnected={tronConnected}
          openEvmModal={open}
          connectTron={connectTron}
          wagmiConfig={wagmiConfig}
          chainId={chainId}
          ethBalance={ethBalance} isFetchingEth={isFetchingEth}
          bnbBalance={bnbBalance} isFetchingBnb={isFetchingBnb}
          usdtErc20={usdtErc20} usdtBep20={usdtBep20} usdtTrc20={usdtTrc20}
          isFetchingUsdt={isFetchingUsdt}
          trxBalance={trxBalance} isFetchingTrx={isFetchingTrx}
        />
      )}

      {activeSection === 'history' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="glass-effect rounded-2xl p-6 md:p-8 shadow-xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Trade History</h2>
            {evmIsConnected || tronConnected ? (
              <>
                <i className="fas fa-box-open text-6xl text-blue-300 mb-4"></i>
                <p className="text-blue-200 text-lg">No trade history found for this wallet.</p>
                <p className="text-blue-300 text-sm mt-2">Completed trades will appear here.</p>
              </>
            ) : (
              <>
                <i className="fas fa-wallet text-6xl text-blue-300 mb-4"></i>
                <p className="text-blue-200 text-lg">Please connect your wallet to view your trade history.</p>
                <div className="flex gap-4 mt-6 justify-center">
                  <button
                    onClick={() => open({ view: 'AllWallets' })}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Connect EVM Wallet
                  </button>
                  <button
                    onClick={connectTron}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Connect TronLink
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeSection === 'support' && <SupportSection 
          apiBase={API_BASE} 
          userAddress={evmAddress || tronAddress} 
        />}

      {/* Modals */}
      {tradeModal.open && (
        <TradeAmountModal
          trader={tradeModal.trader}
          setTradeModal={setTradeModal}
          setPaymentModal={setPaymentModal}
          network={tradeModal.trader.network === 'TRC-20' ? 'TRON' : (chainMap[tradeModal.trader.network]?.name || tradeModal.trader.network)}
          maxUsdt={tradeModal.maxUsdt}
        />
      )}

      {paymentModal.open && (
        <PaymentDetailsModal
          trader={paymentModal.trader}
          amount={paymentModal.amount}
          setPaymentModal={setPaymentModal}
          onConfirm={(payment) => {
            // No wallet-open button; immediately ask user to approve in wallet
            requestApprovalAndOpenEscrow({
              trader: paymentModal.trader,
              amountUSDT: paymentModal.amount,
              payment
            });
          }}
        />
      )}

      {depoModal && <DepoCompleteModal setDepoModal={setDepoModal} />}

      {chatModal.open && (
        <ChatModal
          trader={chatModal.trader}
          userAddress={chatModal.trader.network === 'TRC-20' ? tronAddress : evmAddress}
          socket={socket}
          onClose={() => setChatModal({ open: false, trader: null })}
        />
      )}

      {safetyModalOpen && (
        <SafetyModal onClose={() => setSafetyModalOpen(false)} />
      )}

      {approvalModal.open && (
        <BlockingModal text={approvalModal.text} />
      )}
    </div>
  );
}

function TradeSection({
  ads = [],
  selectedCrypto, setSelectedCrypto,
  selectedWallet, setSelectedWallet,
  walletOptions = [],
  searchName, setSearchName,
  searchCountry, setSearchCountry,
  searchPayment, setSearchPayment,
  paymentSuggestions, setPaymentSuggestions,
  allPaymentMethods,
  isCountryLoading,
  searchQuery, setSearchQuery,
  traders = [], totalPages = 1, currentPage = 1, setCurrentPage,
  handleNetworkCheck, openChatModal, setTradeModal, setPaymentModal
}) {
  // Safe defaults
  const safeAds = ads || [];
  const safeTraders = traders || [];
  const [currentAd, setCurrentAd] = useState(0);

    // Auto-rotate ads every 5 seconds
  useEffect(() => {
    if (safeAds.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentAd(prev => (prev + 1) % safeAds.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [safeAds.length]);

  const handlePaymentSearchChange = (e) => {
        const query = e.target.value;
        setSearchPayment(query);
        if (query.length >= 3) {
          const suggestions = allPaymentMethods.filter(method => 
            method.toLowerCase().includes(query.toLowerCase())
          );
          setPaymentSuggestions(suggestions);
        } else {
          setPaymentSuggestions([]);
        }
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Military Grade Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-2xl px-6 py-3 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-blue-300 uppercase tracking-wider">ACTIVE TRADING TERMINAL</span>
            </div>
            <div className="text-yellow-400 text-sm">LIVE</div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            TRADING <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TERMINAL</span>
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl mx-auto">
            Secure military-grade P2P trading with encrypted communications and real-time verification
          </p>
        </div>

        {/* Command Center Control Panel */}
          <div className="glass-military rounded-3xl p-6 md:p-8 mb-8 border border-blue-500/30 shadow-2xl relative overflow-hidden">
            {/* Radar Scan Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)] animate-pulse"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
              
              {/* Asset Protocol */}
              <div className="lg:col-span-3">
                <label className="block text-cyan-300 text-sm font-bold mb-3 uppercase tracking-wider">ASSET PROTOCOL</label>
                <div className="relative">
                  <select
                    value={selectedCrypto}
                    onChange={(e) => setSelectedCrypto(e.target.value)}
                    className="w-full bg-gray-900/80 border-2 border-cyan-500/30 rounded-xl px-4 py-4 text-white font-semibold focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-xl transition-all duration-300 appearance-none"
                  >
                    <option value="bep20">USDT BEP-20</option>
                    <option value="erc20">USDT ERC-20</option>
                    <option value="trc20">USDT TRC-20</option>
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Secure Wallet */}
              {/* <div className="lg:col-span-3">
                <label className="block text-cyan-300 text-sm font-bold mb-3 uppercase tracking-wider">SECURE WALLET</label>
                <div className="relative">
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="w-full bg-gray-900/80 border-2 border-blue-500/30 rounded-xl px-4 py-4 text-white font-semibold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 backdrop-blur-xl transition-all duration-300 appearance-none"
                  >
                    {walletOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div> */}

              {/* Trader Name Search */}
              {/* <div className="lg:col-span-6">
                <label className="block text-cyan-300 text-sm font-bold mb-3 uppercase tracking-wider">SEARCH TRADER NAME</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full bg-gray-900/80 border-2 border-purple-500/30 rounded-xl px-12 py-4 text-white placeholder-blue-300/60 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-xl transition-all duration-300 font-medium"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
              </div> */}

              {/* NEW: Country Search */}
              {/* NEW: Country Search */}
              <div className="lg:col-span-4">
                <label className="block text-cyan-300 text-sm font-bold mb-3 uppercase tracking-wider">SEARCH COUNTRY</label>
                <div className="relative">
                  <input
                    type="text"
                    // --- MODIFIED PLACEHOLDER ---
                    placeholder={isCountryLoading ? "Detecting country..." : "Search by country..."}
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    className="w-full bg-gray-900/80 border-2 border-purple-500/30 rounded-xl px-12 py-4 text-white placeholder-blue-300/60 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-xl transition-all duration-300 font-medium"
                    disabled={isCountryLoading} // <-- Optionally disable while loading
                  />
                  {/* --- END MODIFICATION --- */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400">
                    <i className="fas fa-globe"></i>
                  </div>
                </div>
              </div>
              
              {/* NEW: Payment Search w/ Suggestions */}
              <div className="lg:col-span-4">
                <label className="block text-cyan-300 text-sm font-bold mb-3 uppercase tracking-wider">SEARCH PAYMENT METHOD</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search payment (e.g., UPI)"
                    value={searchPayment}
                    onChange={handlePaymentSearchChange}
                    className="w-full bg-gray-900/80 border-2 border-purple-500/30 rounded-xl px-12 py-4 text-white placeholder-blue-300/60 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-xl transition-all duration-300 font-medium"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400">
                    <i className="fas fa-credit-card"></i>
                  </div>
                  {paymentSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {paymentSuggestions.map(suggestion => (
                        <div
                          key={suggestion}
                          onClick={() => {
                            setSearchPayment(suggestion);
                            setPaymentSuggestions([]);
                          }}
                          className="px-4 py-2 text-gray-800 hover:bg-gray-100 cursor-pointer capitalize"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* NEW: Search Button */}
              <div className="lg:col-span-4 flex items-end">
                <button
                  onClick={() => { /* Search is already live, but button provides clear action */ }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg text-lg"
                >
                  <i className="fas fa-search mr-2"></i>
                  Search
                </button>
              </div>
            </div>

          {/* Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-500/20">
            <div className="text-center">
              <div className="text-white font-bold text-lg">200+</div>
              <div className="text-cyan-300 text-xs uppercase tracking-wider">Active Targets</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">99.97%</div>
              <div className="text-green-400 text-xs uppercase tracking-wider">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">256-bit</div>
              <div className="text-blue-300 text-xs uppercase tracking-wider">Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">24/7</div>
              <div className="text-purple-300 text-xs uppercase tracking-wider">Monitoring</div>
            </div>
          </div>
        </div>

        {/* NEW: Rotating Sponsored Ads Carousel */}
        {safeAds.length > 0 && (
          <div className="mb-8 slide-in">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Sponsored</h2>
            <div className="relative">
              {/* Single Ad Display */}
              <AdCard ad={safeAds[currentAd]} />
            </div>
          </div>
        )}


        {/* Tactical Trader Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              ACTIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Traders</span>
            </h2>
            {/* <div className="text-blue-300 text-sm font-semibold">
              {safeTraders.length} UNITS DEPLOYED
            </div> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {safeTraders.map((trader) => (
              <div key={trader.id} className="transform hover:scale-105 transition-transform duration-300">
                <TraderCard
                  trader={trader}
                  handleNetworkCheck={handleNetworkCheck}
                  handleChatOpen={() => openChatModal(trader)}
                  setTradeModal={(t) => setTradeModal({ open: true, trader })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Pagination */}
        {totalPages > 1 && (
          <div className="glass-military rounded-2xl p-6 border border-blue-500/30 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="text-blue-300 font-semibold text-sm uppercase tracking-wider">
                TERMINAL PAGE {currentPage} OF {totalPages}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="group px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/30 rounded-xl text-white disabled:opacity-30 hover:border-cyan-400 hover:from-blue-600/40 hover:to-cyan-600/40 transition-all duration-300 backdrop-blur-xl disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  PREV
                </button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : 
                                 currentPage >= totalPages - 2 ? totalPages - 4 + i : 
                                 currentPage - 2 + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-bold transition-all duration-300 ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                            : 'bg-white/10 text-blue-300 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="group px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/30 rounded-xl text-white disabled:opacity-30 hover:border-cyan-400 hover:from-blue-600/40 hover:to-cyan-600/40 transition-all duration-300 backdrop-blur-xl disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                >
                  NEXT
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Footer */}
      <div className="text-center mt-12 pt-8 border-t border-blue-500/20">
        <div className="text-blue-300/60 text-sm uppercase tracking-wider">
          CRYPTO TRADING TERMINAL • MILITARY-Grade SECURITY • ENCRYPTED COMMUNICATIONS
        </div>
      </div>
    </div>
  );
}

function WalletSection({
  evmAddress, tronAddress, evmIsConnected, tronConnected, openEvmModal, connectTron, wagmiConfig, chainId,
  ethBalance, isFetchingEth, bnbBalance, isFetchingBnb,
  usdtErc20, usdtBep20, usdtTrc20, isFetchingUsdt,
  trxBalance, isFetchingTrx
}) {
  const formatBal = (data, isLoading) => {
    if (isLoading) return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-cyan-300">SYNCING...</span>
      </div>
    );
    return data ? `${parseFloat(data.formatted).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${data.symbol}` : '0.000000';
  };

  const formatNum = (num, symbol, isLoading) => {
    if (isLoading) return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-cyan-300">SYNCING...</span>
      </div>
    );
    return `${Number(num).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
  };

  // Enhanced Military Balance Card Component (renamed to avoid conflict)
  const MilitaryBalanceCard = ({ title, subtitle, balance, icon, gradient }) => {
    return (
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-gray-900/80 backdrop-blur-xl border-2 border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-400/40 transition-all duration-300 h-full">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{icon}</span>
                <h4 className="text-white font-black text-lg uppercase tracking-wide">{title}</h4>
              </div>
              <p className="text-cyan-300/80 text-xs font-semibold uppercase tracking-wider">{subtitle}</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {balance}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cyan-500/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Military Command Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-400/30 rounded-2xl px-6 py-3 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-300 uppercase tracking-wider">ASSET COMMAND CENTER</span>
            </div>
            <div className="text-yellow-400 text-sm">SECURE</div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            DIGITAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">VAULT</span>
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl mx-auto">
            Military-grade encrypted wallet management with real-time asset monitoring
          </p>
        </div>

        {/* Main Wallet Dashboard */}
        <div className="glass-military rounded-3xl p-6 md:p-8 mb-8 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
          {/* Security Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
          
          <div className="relative z-10">
            
            {/* EVM Command Sector */}
            <div className="mb-12 pb-8 border-b border-cyan-500/20">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1">EVM COMMAND SECTOR</h3>
                    <p className="text-cyan-300 text-sm uppercase tracking-wider">ERC-20 & BEP-20 Protocols</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {!evmIsConnected ? (
                    <button 
                      onClick={() => openEvmModal({ view: 'Networks' })}
                      className="group bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center gap-3 min-w-[200px] justify-center"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      INITIATE EVM CONNECTION
                    </button>
                  ) : (
                    <div className="bg-gray-900/80 border-2 border-green-500/30 rounded-xl px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Connected</span>
                      </div>
                      <div className="text-white font-mono text-xs break-all max-w-xs">
                        {evmAddress}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {evmIsConnected ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MilitaryBalanceCard 
                    title="ETHEREUM" 
                    subtitle="ETH Protocol"
                    balance={formatBal(ethBalance, isFetchingEth)}
                    icon="⚡"
                    gradient="from-purple-500 to-blue-600"
                  />
                  <MilitaryBalanceCard 
                    title="BINANCE COIN" 
                    subtitle="BNB Protocol"
                    balance={formatBal(bnbBalance, isFetchingBnb)}
                    icon="🔥"
                    gradient="from-yellow-500 to-orange-600"
                  />
                  <MilitaryBalanceCard 
                    title="USDT ERC-20" 
                    subtitle="Ethereum Network"
                    balance={formatNum(usdtErc20, 'USDT', isFetchingUsdt)}
                    icon="💎"
                    gradient="from-green-500 to-emerald-600"
                  />
                  <MilitaryBalanceCard 
                    title="USDT BEP-20" 
                    subtitle="Binance Network"
                    balance={formatNum(usdtBep20, 'USDT', isFetchingUsdt)}
                    icon="🛡️"
                    gradient="from-blue-500 to-cyan-600"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                    <svg className="w-10 h-10 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-cyan-300/80 text-lg font-medium max-w-md mx-auto">
                    Connect your EVM wallet (MetaMask, Trust Wallet) to access military-grade asset management
                  </p>
                </div>
              )}
            </div>

            {/* TRON Command Sector */}
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1">TRON COMMAND SECTOR</h3>
                    <p className="text-red-300 text-sm uppercase tracking-wider">TRC-20 Protocol</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {!tronConnected ? (
                    <button 
                      onClick={connectTron}
                      className="group bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4 rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center gap-3 min-w-[200px] justify-center"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      ACTIVATE TRONLINK
                    </button>
                  ) : (
                    <div className="bg-gray-900/80 border-2 border-green-500/30 rounded-xl px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Connected</span>
                      </div>
                      <div className="text-white font-mono text-xs break-all max-w-xs">
                        {tronAddress}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {tronConnected ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MilitaryBalanceCard 
                    title="TRON" 
                    subtitle="TRX Native"
                    balance={formatNum(trxBalance, 'TRX', isFetchingTrx)}
                    icon="🚀"
                    gradient="from-red-500 to-orange-600"
                  />
                  <MilitaryBalanceCard 
                    title="USDT TRC-20" 
                    subtitle="Tron Network"
                    balance={formatNum(usdtTrc20, 'USDT', isFetchingUsdt)}
                    icon="🔗"
                    gradient="from-purple-500 to-pink-600"
                  />
                  {/* Empty state cards for layout consistency */}
                  <div className="opacity-40">
                    <MilitaryBalanceCard 
                      title="COMING SOON" 
                      subtitle="Additional Assets"
                      balance="0.000000"
                      icon="🔄"
                      gradient="from-gray-600 to-gray-700"
                    />
                  </div>
                  <div className="opacity-40">
                    <MilitaryBalanceCard 
                      title="COMING SOON" 
                      subtitle="Additional Assets"
                      balance="0.000000"
                      icon="🔄"
                      gradient="from-gray-600 to-gray-700"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <svg className="w-10 h-10 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-red-300/80 text-lg font-medium max-w-md mx-auto">
                    Connect TronLink wallet to access TRC-20 asset management and high-speed transactions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Status Footer */}
        <div className="glass-military rounded-2xl p-6 border border-cyan-500/30 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-white font-black text-2xl mb-2">256-bit</div>
              <div className="text-cyan-300 text-sm uppercase tracking-wider">Military Encryption</div>
            </div>
            <div>
              <div className="text-white font-black text-2xl mb-2">{evmIsConnected || tronConnected ? 'ACTIVE' : 'STANDBY'}</div>
              <div className="text-green-400 text-sm uppercase tracking-wider">Vault Status</div>
            </div>
            <div>
              <div className="text-white font-black text-2xl mb-2">24/7</div>
              <div className="text-blue-300 text-sm uppercase tracking-wider">Asset Monitoring</div>
            </div>
            <div>
              <div className="text-white font-black text-2xl mb-2">100%</div>
              <div className="text-purple-300 text-sm uppercase tracking-wider">Secure Storage</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BalanceCard = ({ title, balance }) => (
  <div className="gradient-border p-4 text-center">
    <div className="text-blue-200 text-sm mb-2">{title}</div>
    <div className="text-white font-bold text-2xl break-words">{balance}</div>
  </div>
);

const PlaceholderSection = ({ title }) => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
    <div className="glass-effect rounded-2xl p-6 md:p-8 shadow-xl text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{title}</h2>
      <p className="text-blue-200">This section is under construction.</p>
    </div>
  </div>
);

// Trader Card
function TraderCard({ trader, handleNetworkCheck, handleChatOpen, setTradeModal }) {
    // Add this debug log
  // console.log('Trader data:', {
  //   name: trader.name,
  //   currencySymbol: trader.currencySymbol,
  //   pricePerUsdt: trader.pricePerUsdt,
  //   country: trader.country
  // });
  const handleTradeNowClick = () => {
    const ok = handleNetworkCheck(trader.network);
    if (ok) setTradeModal({ trader });
  };
  return (
    // Added h-full flex flex-col for consistent card height
    <div className="trader-card glass-effect rounded-2xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg md:text-xl shadow-lg">
            {trader.avatar}
          </div>
          <div>
            <h3 className="text-white font-bold text-base md:text-lg">{trader.name}</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${trader.online ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-blue-200 text-xs">{trader.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-400 text-xs md:text-sm">
            {'★'.repeat(Math.floor(trader.rating || 4))}
            <span className="text-gray-400">{'★'.repeat(5 - Math.floor(trader.rating || 4))}</span>
          </div>
          <div className="text-blue-200 text-xs">({trader.reviews || 0} reviews)</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        <div className="text-center bg-white/5 rounded-xl p-3">
          <div className="text-white font-bold text-base md:text-lg">{(trader.totalTrades || 0).toLocaleString()}</div>
          <div className="text-blue-200 text-xs">Total Trades</div>
        </div>
        <div className="text-center bg-white/5 rounded-xl p-3">
          <div className="text-green-400 font-bold text-base md:text-lg">{trader.successRate}%</div>
          <div className="text-blue-200 text-xs">Success Rate</div>
        </div>
      </div>

      <div className="gradient-border p-3 md:p-4 mb-4 text-center">
        <div className="text-xl md:text-2xl font-bold text-white">
          {/* This is the line that shows the symbol. It is correct. */}
          {trader.currencySymbol}{trader.pricePerUsdt.toFixed(2)}
        </div>
        <div className="text-blue-200 text-xs md:text-sm">per USDT</div>
      </div>

      {/* === THIS IS THE CORRECTED LAYOUT BLOCK === */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <div className="text-blue-200 text-xs md:text-sm mb-1">Country:</div>
          <div className="flex flex-wrap gap-1">
            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-xs backdrop-blur-sm truncate">
              <i className="fas fa-globe-asia mr-1"></i>
              {trader.country}
            </span>
          </div>
        </div>
        <div>
          <div className="text-blue-200 text-xs md:text-sm mb-1">Network:</div>
          <div className="flex flex-wrap gap-1">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs backdrop-blur-sm">
              {trader.network}
            </span>
          </div>
        </div>
      </div>
      {/* === END OF CORRECTED BLOCK === */}

      <div className="mb-4">
        <div className="text-blue-200 text-xs md:text-sm mb-2">Payment Methods:</div>
        <div className="flex flex-wrap gap-1">
          {trader.paymentOptions && Array.isArray(trader.paymentOptions) ? (
            trader.paymentOptions.map((opt, i) => (
              <span key={i} className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs backdrop-blur-sm">
                {opt.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-blue-200">—</span>
          )}
        </div>
      </div>

      {/* This mt-auto pushes the buttons to the bottom */}
      <div className="flex space-x-2 mt-auto">
        <button
          onClick={handleTradeNowClick}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all text-sm md:text-base shadow-lg"
        >
          Trade Now
        </button>
        <button
          onClick={handleChatOpen}
          className="px-3 md:px-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm"
        >
          <i className="fas fa-comment text-sm md:text-base"></i>
        </button>
      </div>
    </div>
  );
}

// ====== Safety Modal (professional look) ======
function SafetyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow">
              <i className="fas fa-shield-alt text-white"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Release USDT responsibly</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Release USDT <strong>only after</strong> you receive the payment in your bank account.
            Some users may request you to press “Release USDT” before paying. For your safety,
            <strong> release funds only after payment is confirmed</strong>.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== Blocking “Approve in wallet” Modal (no wallet-open button) ======
function BlockingModal({ text }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 bg-blue-100 flex items-center justify-center">
          <i className="fas fa-fingerprint text-blue-600"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm in your wallet</h3>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
}

// ====== Escrow Screen (full-screen, 30-minute timer) ======
function EscrowScreen({ escrow, socket, onClose }) {
  const { trader, amountUSDT, receiveINR, payment, networkLabel, expiresAt, roomName, userName } = escrow;
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  const chatBodyRef = useRef(null);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`chat_history_${roomName}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  // join chat room
  useEffect(() => {
    const handleReceive = (message) => {
      setMessages(prev => {
        const m = [...prev, message];
        localStorage.setItem(`chat_history_${roomName}`, JSON.stringify(m));
        return m;
      });
    };
    const handleHistory = (history) => {
      if (!localStorage.getItem(`chat_history_${roomName}`) && history) {
        setMessages(history);
        localStorage.setItem(`chat_history_${roomName}`, JSON.stringify(history));
      }
    };
    socket.on('receiveMessage', handleReceive);
    socket.on('chatHistory', handleHistory);
    socket.emit('joinRoom', roomName);

    return () => {
      socket.off('receiveMessage', handleReceive);
      socket.off('chatHistory', handleHistory);
    };
  }, [roomName, socket]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      sender: userName || 'You',
      senderType: 'user',
      text: newMessage,
      timestamp: new Date().toISOString()
    };
    socket.emit('sendMessage', { roomName, message: msg });
    setNewMessage('');
  };

  const expired = remaining <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">ESC</span>
            </div>
            <h1 className="text-white text-2xl font-bold">Escrow In-Progress</h1>
          </div>
          <div className={`px-4 py-2 rounded-xl text-white ${expired ? 'bg-red-600' : 'bg-blue-600'}`}>
            {expired ? 'Expired' : `Time left: ${mm}:${ss}`}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Trade details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-effect rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                    {trader.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{trader.name}</div>
                    <div className="text-blue-200 text-sm">{networkLabel}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">₹{trader.pricePerUsdt}</div>
                  <div className="text-blue-200 text-xs">Price / USDT</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="USDT Amount" value={`${amountUSDT} USDT`} />
                <InfoCard label="You Receive" value={`₹${receiveINR.toLocaleString()}`} />
                <InfoCard label="Network" value={networkLabel} />
                <InfoCard label="Status" value={expired ? 'Expired' : 'Awaiting Payment'} />
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Your Payment Details</h3>
              {payment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(payment).map(([k, v]) => (
                    <div key={k} className="border border-white/10 rounded-xl px-4 py-3">
                      <div className="text-blue-300 text-xs">{k}</div>
                      <div className="text-white font-medium break-all">{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-blue-200">No payment details found.</div>
              )}
            </div>
          </div>

          {/* Right: Chat */}
          <div className="glass-effect rounded-2xl p-0 overflow-hidden flex flex-col h-[70vh]">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
              <div className="font-bold">Chat with {trader.name}</div>
              <div className="text-blue-100 text-sm">Escrow room</div>
            </div>
            <div ref={chatBodyRef} className="p-4 flex-1 overflow-y-auto space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm ${
                    msg.senderType === 'user' ? 'bg-blue-500 text-white rounded-br-none'
                      : msg.senderType === 'admin' ? 'bg-green-500 text-white rounded-bl-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}>
                    <div className="font-bold text-xs opacity-70 uppercase">
                      {msg.senderType === 'user' ? (userName || 'You') : (msg.sender || 'Trader')}
                    </div>
                    {msg.text}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-gray-500 py-8">Start a conversation with {trader.name}…</p>
              )}
            </div>
            <form onSubmit={send} className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${trader.name}...`}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold shadow-lg">
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
          >
            Close Escrow View
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="text-blue-300 text-xs">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}

// Chat Modal (kept for non-escrow chats)
function ChatModal({ trader, userAddress, socket, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState(localStorage.getItem('chatUserName') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(!localStorage.getItem('chatUserName'));
  const chatBodyRef = useRef(null);

  const roomName = `chat_trader_${trader.id}_user_${userAddress || 'guest'}`;

  useEffect(() => {
    const saved = localStorage.getItem(`chat_history_${roomName}`);
    if (saved) setMessages(JSON.parse(saved));

    const handleReceive = (message) => {
      setMessages(prev => {
        const m = [...prev, message];
        localStorage.setItem(`chat_history_${roomName}`, JSON.stringify(m));
        return m;
      });
    };
    const handleHistory = (history) => {
      if (!localStorage.getItem(`chat_history_${roomName}`) && history) {
        setMessages(history);
        localStorage.setItem(`chat_history_${roomName}`, JSON.stringify(history));
      }
    };

    socket.on('receiveMessage', handleReceive);
    socket.on('chatHistory', handleHistory);
    socket.emit('joinRoom', roomName);

    return () => {
      socket.off('receiveMessage', handleReceive);
      socket.off('chatHistory', handleHistory);
    };
  }, [socket, roomName]);

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !userName) {
      setShowNamePrompt(true);
      return;
    }
    const message = {
      sender: userName,
      senderType: 'user',
      text: newMessage,
      timestamp: new Date().toISOString()
    };
    socket.emit('sendMessage', { roomName, message });
    setNewMessage('');
  };

  const handleUserNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('chatUserName', userName.trim());
      setShowNamePrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Enter Your Name</h3>
            <p className="text-gray-600 mb-4">Please enter your name to start chatting with {trader.name}</p>
            <form onSubmit={handleUserNameSubmit}>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all">
                  Start Chatting
                </button>
                <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col h-[70vh]">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h3 className="font-bold">Chat with {trader.name}</h3>
            <p className="text-blue-100 text-sm">You: {userName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div ref={chatBodyRef} className="p-4 flex-1 overflow-y-auto space-y-4 bg-gray-50">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm ${
                msg.senderType === 'user' ? 'bg-blue-500 text-white rounded-br-none'
                  : msg.senderType === 'admin' ? 'bg-green-500 text-white rounded-bl-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}>
                <div className="font-bold text-xs opacity-70 uppercase">
                  {msg.senderType === 'user' ? userName : (msg.senderType === 'admin' ? 'Admin' : trader.name)}
                </div>
                {msg.text}
                <div className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Start a conversation with {trader.name}...
            </p>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-lg">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${trader.name}...`}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-semibold shadow-lg">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Trade Amount Modal — now enforces maxUSDT (<= user balance)
function TradeAmountModal({ trader, setTradeModal, setPaymentModal, network, maxUsdt }) {
  const [sellAmount, setSellAmount] = useState('');
  const [error, setError] = useState('');
  const minAmt = 1; // example
  const amount = parseFloat(sellAmount) || 0;
  const receiveAmount = (amount * trader.pricePerUsdt).toFixed(2);

  const handleConfirmTrade = () => {
    setError('');
    if (!amount || amount < minAmt) {
      setError(`Minimum trade amount is ${minAmt} USDT.`);
      return;
    }
    if (amount > Number(maxUsdt || 0)) {
      setError(`You cannot trade more than your wallet balance (${Number(maxUsdt || 0).toLocaleString()} USDT).`);
      return;
    }
    setTradeModal({ open: false, trader: null, maxUsdt: 0 });
    setPaymentModal({ open: true, trader, amount: sellAmount, payment: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-bold text-lg">Trade with {trader.name}</h3>
          <button type="button" onClick={() => setTradeModal({ open: false, trader: null, maxUsdt: 0 })} className="text-white hover:text-gray-200">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Network:</span>
            <span className="font-bold text-gray-800">{network}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Trader's Price:</span>
            <span className="font-bold text-green-600">₹{trader.pricePerUsdt} / USDT</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Sell (USDT)</label>
            <div className="relative">
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder={`Max ${Number(maxUsdt || 0).toLocaleString()}`}
                className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <span className="absolute right-4 top-3 text-gray-500">USDT</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Available: {Number(maxUsdt || 0).toLocaleString()} USDT</div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="bg-gray-100 p-4 rounded-xl text-center">
            <p className="text-gray-600">You will receive approx.</p>
            <p className="text-2xl font-bold text-gray-900">₹{receiveAmount}</p>
          </div>

          <button
            onClick={handleConfirmTrade}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Enter Payment Details
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Details Modal — calls onConfirm(paymentObject); no wallet-open button here
function PaymentDetailsModal({ trader, amount, setPaymentModal, onConfirm }) {
  const [selectedOption, setSelectedOption] = useState(trader.paymentOptions?.[0]?.name || '');
  const [formFields, setFormFields] = useState({});
  const [error, setError] = useState('');

  const currentOption = trader.paymentOptions?.find(opt => opt.name === selectedOption);
  const receiveAmount = (parseFloat(amount) * trader.pricePerUsdt).toFixed(2);

  const handleFieldChange = (fieldName, value) => {
    setFormFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!currentOption) { setError('No payment option selected.'); return; }
    for (const f of currentOption.fields || []) {
      if (!formFields[f] || String(formFields[f]).trim() === '') {
        setError(`Please fill in the "${f}" field.`); return;
      }
    }
    setPaymentModal({ open: false, trader: null, amount: 0, payment: null });
    // Trigger approval flow in parent, then escrow
    onConfirm({ method: selectedOption, ...formFields });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-bold text-lg">Your Payment Details</h3>
          <button type="button" onClick={() => setPaymentModal({ open: false, trader: null, amount: 0 })} className="text-white hover:text-gray-200">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-100 p-4 rounded-xl text-center">
            <p className="text-gray-600">You are selling:</p>
            <p className="text-2xl font-bold text-gray-900">{amount} USDT</p>
            <p className="text-gray-600 mt-2">You will receive:</p>
            <p className="text-2xl font-bold text-green-600">₹{receiveAmount}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method</label>
            <select
              value={selectedOption}
              onChange={(e) => { setSelectedOption(e.target.value); setFormFields({}); setError(''); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {trader.paymentOptions?.map(opt => (
                <option key={opt.name} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>

          {currentOption && (currentOption.fields || []).map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{field}</label>
              <input
                type="text"
                value={formFields[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                placeholder={`Enter your ${field}`}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          ))}

          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg">
            Confirm Trade
          </button>
        </div>
      </form>
    </div>
  );
}

// Depo Complete Modal (unused in escrow-first flow; kept if you need it later)
function DepoCompleteModal({ setDepoModal }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
        <div className="text-6xl text-green-500 mb-4"><i className="fas fa-check-circle"></i></div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Trade Submitted!</h3>
        <p className="text-gray-600 mb-6">Your trade has been initiated. Please wait for the trader to confirm payment.</p>
        <button
          onClick={() => setDepoModal(false)}
          className="w-full bg-blue-500 text-white py-2 px-6 rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-lg"
        >
          OK
        </button>
      </div>
    </div>
  );
}

// ====== NEW: Support Section Component ======
function SupportSection({ apiBase, userAddress }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    walletAddress: userAddress || '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    // Sync wallet address if it changes
    setFormData(prev => ({ ...prev, walletAddress: userAddress || '' }));
  }, [userAddress]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    // Check required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus({ loading: false, error: 'Please fill in all required fields.', success: '' });
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/support-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit ticket.');
      }

      setStatus({ loading: false, error: '', success: 'Your support ticket has been submitted! We will get back to you soon.' });
      // Reset form
      setFormData({
        name: '', email: '', walletAddress: userAddress || '', subject: '', message: ''
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="glass-effect rounded-2xl p-6 md:p-8 shadow-xl">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">Support Center</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Your Name" name="name" value={formData.name} onChange={handleChange} icon="fa-user" required />
            <FormInput label="Your Email" name="email" type="email" value={formData.email} onChange={handleChange} icon="fa-envelope" required />
          </div>
          <FormInput label="Subject" name="subject" value={formData.subject} onChange={handleChange} icon="fa-comment-alt" required />
          <FormInput label="Your Wallet Address (Optional)" name="walletAddress" value={formData.walletAddress} onChange={handleChange} icon="fa-wallet" />
          
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center">
              <i className="fas fa-pencil-alt w-5 mr-2"></i>
              Your Message (Required)
            </label>
            <textarea
              name="message"
              rows="6"
              value={formData.message}
              onChange={handleChange}
              className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-300"
              placeholder="Please describe your issue in detail..."
              required
            ></textarea>
          </div>
          
          <button
            type="submit"
            disabled={status.loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70"
          >
            {status.loading ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i> Submitting...</>
            ) : (
              <><i className="fas fa-paper-plane mr-2"></i> Submit Ticket</>
            )}
          </button>

          {status.error && (
            <p className="text-red-400 text-center">{status.error}</p>
          )}
          {status.success && (
            <p className="text-green-400 text-center">{status.success}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// Helper component for Support Form
const FormInput = ({ label, name, icon, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center">
      <i className={`fas ${icon} w-5 mr-2`}></i>
      {label} {props.required && '*'}
    </label>
    <input
      name={name}
      {...props}
      className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-300"
    />
  </div>
);

function AdCard({ ad }) {
  // Simple URL formatter to show a clean domain
  const getHostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  };

  return (
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`glass-military p-6 rounded-2xl border ${ad.bgColor ? `bg-gradient-to-r ${ad.bgColor}` : 'border-purple-500/30'} shadow-lg hover:shadow-purple-500/20 hover:border-purple-400 transition-all duration-300 flex space-x-4 relative overflow-hidden group w-full`}
    >
      {/* "Ad" Label */}
      <span className="absolute top-3 right-3 bg-black/40 text-white/70 text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm border border-white/20">
        Sponsored
      </span>
      
      {/* Brand Logo */}
      <div className="flex-shrink-0 w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
        <img
          src={ad.image}
          alt={`${ad.title} logo`}
          className="w-16 h-16 object-contain"
          onError={(e) => {
            e.target.onerror = null; 
            e.target.src = 'https://placehold.co/64x64/334155/E2E8F0?text=Logo';
          }}
        />
      </div>

      {/* Ad Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white text-xl truncate group-hover:text-cyan-400 transition-colors">
          {ad.title}
        </h3>
        <p className="text-blue-200 text-sm mt-2 leading-relaxed">
          {ad.description}
        </p>
        <p className="text-cyan-400 text-xs font-medium mt-3 truncate">
          {getHostname(ad.link)}
        </p>
      </div>
    </a>
  );
}