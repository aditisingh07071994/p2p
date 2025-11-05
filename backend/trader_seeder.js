import 'dotenv/config';
import mongoose from 'mongoose';
import Trader from './models/Trader.js';
import readline from 'readline';

// --- Helper Functions ---
const getRandom = (min, max) => Math.random() * (max - min) + min;
const getRandomInt = (min, max) => Math.floor(getRandom(min, max));
const getRandomElements = (arr, n) => {
  let result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (n > len)
      throw new RangeError("getRandomElements: more elements taken than available");
  while (n--) {
      let x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
};
const generateName = () => {
  const first = ['Crypto', 'BTC', 'ETH', 'P2P', 'Fast', 'Apex', 'Alpha', 'Pro', 'Secure'];
  const second = ['King', 'Whale', 'Trader', 'Exchange', 'Flow', 'Lion', 'Bull', 'Fox'];
  const realFirst = ['Rohan', 'Ananya', 'Ahmet', 'Yilmaz', 'Emeka', 'Chioma', 'Nguyen', 'Linh', 'Lucas', 'Sofia', 'Juan', 'Valeria', 'Dmitri', 'Olga', 'John', 'Sarah'];
  const realLast = ['S.', 'K.', 'Sharma', 'Gupta', 'Okoro', 'Van', 'Silva', 'Santos', 'Garcia', 'Ivanov', 'Smith', 'Jones'];
  
  if (Math.random() > 0.5) {
    return `${getRandomElements(first, 1)[0]}${getRandomElements(second, 1)[0]}`;
  }
  return `${getRandomElements(realFirst, 1)[0]} ${getRandomElements(realLast, 1)[0]}`;
};

// --- Top 20 USDT Countries Data ---
// Rates are approximate vs. INR (1 INR = X)
const countriesData = [
  { name: 'India', currency: 'INR', symbol: '₹', rateToINR: 1, methods: ['UPI', 'IMPS', 'Bank Transfer', 'PayTM', 'PhonePe'] },
  { name: 'Turkey', currency: 'TRY', symbol: '₺', rateToINR: 0.39, methods: ['Bank Transfer', 'Papara', 'Ininal'] },
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', rateToINR: 0.057, methods: ['Bank Transfer', 'Chipper Cash', 'Paga'] },
  { name: 'Vietnam', currency: 'VND', symbol: '₫', rateToINR: 0.0033, methods: ['Bank Transfer', 'Momo', 'ZaloPay', 'ViettelPay'] },
  { name: 'Brazil', currency: 'BRL', symbol: 'R$', rateToINR: 15.02, methods: ['PIX', 'Bank Transfer', 'Mercado Pago'] },
  { name: 'Argentina', currency: 'ARS', symbol: '$', rateToINR: 0.091, methods: ['Bank Transfer', 'Mercado Pago', 'Ualá'] },
  { name: 'Russia', currency: 'RUB', symbol: '₽', rateToINR: 0.90, methods: ['Bank Transfer', 'Qiwi', 'YooMoney'] },
  { name: 'USA', currency: 'USD', symbol: '$', rateToINR: 83.5, methods: ['Zelle', 'Wire Transfer', 'Cash Deposit'] },
  { name: 'UAE', currency: 'AED', symbol: 'د.إ', rateToINR: 22.7, methods: ['Bank Transfer', 'Cash Deposit'] },
  { name: 'Philippines', currency: 'PHP', symbol: '₱', rateToINR: 1.42, methods: ['GCash', 'PayMaya', 'Bank Transfer'] },
  { name: 'UK', currency: 'GBP', symbol: '£', rateToINR: 104.2, methods: ['Bank Transfer', 'Revolut', 'Skrill'] },
  { name: 'Mexico', currency: 'MXN', symbol: '$', rateToINR: 4.15, methods: ['Bank Transfer (SPEI)', 'OXXO', 'Mercado Pago'] },
  { name: 'Colombia', currency: 'COP', symbol: '$', rateToINR: 0.019, methods: ['Bancolombia', 'Nequi', 'DaviPlata'] },
  { name: 'Indonesia', currency: 'IDR', symbol: 'Rp', rateToINR: 0.0051, methods: ['Bank Transfer', 'GoPay', 'OVO', 'DANA'] },
  { name: 'Pakistan', currency: 'PKR', symbol: '₨', rateToINR: 0.30, methods: ['Bank Transfer', 'Easypaisa', 'JazzCash'] },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', rateToINR: 1.74, methods: ['Bank Transfer', 'Vodafone Cash', 'InstaPay'] },
  { name: 'Thailand', currency: 'THB', symbol: '฿', rateToINR: 2.27, methods: ['Bank Transfer', 'PromptPay', 'TrueMoney'] },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', rateToINR: 4.55, methods: ['Bank Transfer', 'EFT', 'Capitec Pay'] },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', rateToINR: 0.65, methods: ['M-PESA', 'Bank Transfer'] },
  { name: 'Malaysia', currency: 'MYR', symbol: 'RM', rateToINR: 17.6, methods: ['Bank Transfer', 'DuitNow', 'Touch \'n Go'] }
];

// --- Seeder Function ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const importTraders = async () => {
  try {
    // 1. Connect to DB
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'p2p' });
    console.log('MongoDB Connected...');

    // 2. Delete all existing traders
    await Trader.deleteMany({});
    console.log('Existing traders have been wiped.');

    // 3. Generate and insert new traders
    console.log('Generating new traders...');
    const allTraders = [];
    let traderIdCounter = 1; // Start ID counter

    for (const country of countriesData) {
      const tradersForCountry = [];

      // Create 1 TRC-20 Trader
      const baseRateINR_TRC = getRandom(94.5, 96.0); // Max 96 INR
      // Convert INR rate to local currency rate
      const price_TRC = (baseRateINR_TRC / country.rateToINR);
      
      const trcTrader = {
        id: traderIdCounter++,
        name: generateName(),
        avatar: '🚀',
        country: country.name,
        currency: country.currency,
        currencySymbol: country.symbol,
        pricePerUsdt: price_TRC,
        totalTrades: getRandomInt(20, 5000),
        successRate: getRandom(90, 100).toFixed(2),
        rating: getRandom(4.5, 5).toFixed(1),
        reviews: getRandomInt(40, 800),
        network: 'TRC-20',
        paymentOptions: getRandomElements(country.methods, getRandomInt(2, Math.min(5, country.methods.length))).map(name => ({ name, fields: [name] })),
        limit: `${country.symbol}${getRandomInt(100, 500)} - ${country.symbol}${getRandomInt(10000, 50000)}`,
        online: Math.random() > 0.3, // 70% chance of being online
      };
      tradersForCountry.push(trcTrader);

      // Create 9 other traders (BEP-20 / ERC-20)
      for (let i = 0; i < 9; i++) {
        const baseRateINR = getRandom(94.5, 104.0);
         // Convert INR rate to local currency rate
        const price = (baseRateINR / country.rateToINR);
        
        const trader = {
          id: traderIdCounter++,
          name: generateName(),
          avatar: i % 2 === 0 ? '⚡' : '💎',
          country: country.name,
          currency: country.currency,
          currencySymbol: country.symbol,
          pricePerUsdt: price,
          totalTrades: getRandomInt(20, 5000),
          successRate: getRandom(90, 100).toFixed(2),
          rating: getRandom(4.2, 5).toFixed(1),
          reviews: getRandomInt(40, 800),
          network: i % 2 === 0 ? 'BEP-20' : 'ERC-20',
          paymentOptions: getRandomElements(country.methods, getRandomInt(2, Math.min(5, country.methods.length))).map(name => ({ name, fields: [name] })),
          limit: `${country.symbol}${getRandomInt(100, 500)} - ${country.symbol}${getRandomInt(10000, 50000)}`,
          online: Math.random() > 0.3,
        };
        tradersForCountry.push(trader);
      }
      allTraders.push(...tradersForCountry);
    }
    
    await Trader.insertMany(allTraders);
    console.log(`New traders have been imported! (${allTraders.length} total)`);

    // 4. Disconnect
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
    process.exit();

  } catch (error) {
    console.error(`Error: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// --- Run the script ---
console.log('WARNING: This script will WIPE all existing traders in your database.');
rl.question('Are you sure you want to continue? Type "yes" to proceed: ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('Proceeding with database seeding...');
    importTraders();
  } else {
    console.log('Aborted. No changes were made.');
    rl.close();
    process.exit();
  }
});