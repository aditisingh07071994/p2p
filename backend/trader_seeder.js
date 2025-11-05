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
      n = len; // Fix: If n is > array length, just take all
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

// --- Top 20 USDT Countries Data with DETAILED Payment Methods ---
const countriesData = [
  { name: 'India', currency: 'INR', symbol: '₹', rateToINR: 1, 
    methods: [
      { name: 'UPI', fields: ['UPI ID', 'Full Name'] },
      { name: 'IMPS', fields: ['Bank Name', 'Account Number', 'IFSC Code', 'Full Name'] },
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'IFSC Code', 'Full Name'] },
      { name: 'PayTM', fields: ['PayTM Number', 'Full Name'] },
      { name: 'PhonePe', fields: ['PhonePe Number', 'Full Name'] }
    ]},
  { name: 'Turkey', currency: 'TRY', symbol: '₺', rateToINR: 0.39, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'IBAN', 'Full Name'] },
      { name: 'Papara', fields: ['Papara Number', 'Full Name'] },
      { name: 'Ininal', fields: ['Ininal Card Number'] }
    ]},
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', rateToINR: 0.057, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Full Name'] },
      { name: 'Chipper Cash', fields: ['Chipper Tag'] },
      { name: 'Paga', fields: ['Paga Account Number'] }
    ]},
  { name: 'Vietnam', currency: 'VND', symbol: '₫', rateToINR: 0.0033, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Branch Name', 'Full Name'] },
      { name: 'Momo', fields: ['Momo Phone Number', 'Full Name'] },
      { name: 'ZaloPay', fields: ['ZaloPay Phone Number'] },
      { name: 'ViettelPay', fields: ['ViettelPay Phone Number'] }
    ]},
  { name: 'Brazil', currency: 'BRL', symbol: 'R$', rateToINR: 15.02, 
    methods: [
      { name: 'PIX', fields: ['PIX Key (Email, Phone, or CPF)', 'Full Name'] },
      { name: 'Bank Transfer (TED)', fields: ['Bank Name', 'Agency', 'Account Number', 'CPF', 'Full Name'] },
      { name: 'Mercado Pago', fields: ['Mercado Pago Email'] }
    ]},
  { name: 'Argentina', currency: 'ARS', symbol: '$', rateToINR: 0.091, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'CBU/Alias', 'CUIT/CUIL', 'Full Name'] },
      { name: 'Mercado Pago', fields: ['CVU/Alias', 'Full Name'] },
      { name: 'Ualá', fields: ['CVU/Alias', 'Full Name'] }
    ]},
  { name: 'Russia', currency: 'RUB', symbol: '₽', rateToINR: 0.90, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Card Number', 'Full Name'] },
      { name: 'Qiwi', fields: ['Qiwi Wallet Number'] },
      { name: 'YooMoney', fields: ['YooMoney Account Number'] }
    ]},
  { name: 'USA', currency: 'USD', symbol: '$', rateToINR: 83.5, 
    methods: [
      { name: 'Zelle', fields: ['Email or Phone Number', 'Full Name'] },
      { name: 'Wire Transfer', fields: ['Bank Name', 'Account Number', 'Routing Number', 'Full Name'] },
      { name: 'Cash Deposit', fields: ['Bank Name', 'Account Number', 'Full Name (for receipt)'] }
    ]},
  { name: 'UAE', currency: 'AED', symbol: 'د.إ', rateToINR: 22.7, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'IBAN', 'Full Name'] },
      { name: 'Cash Deposit', fields: ['Bank Name', 'Account Number', 'Full Name'] }
    ]},
  { name: 'Philippines', currency: 'PHP', symbol: '₱', rateToINR: 1.42, 
    methods: [
      { name: 'GCash', fields: ['GCash Number', 'Full Name'] },
      { name: 'PayMaya', fields: ['PayMaya Number', 'Full Name'] },
      { name: 'Bank Transfer (InstaPay)', fields: ['Bank Name', 'Account Number', 'Full Name'] }
    ]},
  { name: 'UK', currency: 'GBP', symbol: '£', rateToINR: 104.2, 
    methods: [
      { name: 'Bank Transfer (Faster Payments)', fields: ['Bank Name', 'Sort Code', 'Account Number', 'Full Name'] },
      { name: 'Revolut', fields: ['Revolut Phone or Revtag', 'Full Name'] },
      { name: 'Skrill', fields: ['Skrill Email'] }
    ]},
  { name: 'Mexico', currency: 'MXN', symbol: '$', rateToINR: 4.15, 
    methods: [
      { name: 'Bank Transfer (SPEI)', fields: ['Bank Name', 'CLABE', 'Full Name'] },
      { name: 'OXXO', fields: ['Payment Reference Number'] },
      { name: 'Mercado Pago', fields: ['Email or Phone Number'] }
    ]},
  { name: 'Colombia', currency: 'COP', symbol: '$', rateToINR: 0.019, 
    methods: [
      { name: 'Bancolombia', fields: ['Account Number', 'Account Type', 'Full Name', 'ID Number'] },
      { name: 'Nequi', fields: ['Phone Number', 'Full Name'] },
      { name: 'DaviPlata', fields: ['Phone Number', 'Full Name'] }
    ]},
  { name: 'Indonesia', currency: 'IDR', symbol: 'Rp', rateToINR: 0.0051, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Full Name'] },
      { name: 'GoPay', fields: ['GoPay Phone Number'] },
      { name: 'OVO', fields: ['OVO Phone Number'] },
      { name: 'DANA', fields: ['DANA Phone Number'] }
    ]},
  { name: 'Pakistan', currency: 'PKR', symbol: '₨', rateToINR: 0.30, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'IBAN or Account Number', 'Full Name'] },
      { name: 'Easypaisa', fields: ['Easypaisa Account Number', 'Full Name'] },
      { name: 'JazzCash', fields: ['JazzCash Account Number', 'Full Name'] }
    ]},
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', rateToINR: 1.74, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'IBAN', 'Full Name'] },
      { name: 'Vodafone Cash', fields: ['Vodafone Phone Number'] },
      { name: 'InstaPay', fields: ['InstaPay Handle (IPA) or Phone Number'] }
    ]},
  { name: 'Thailand', currency: 'THB', symbol: '฿', rateToINR: 2.27, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Full Name'] },
      { name: 'PromptPay', fields: ['Phone Number or Citizen ID'] },
      { name: 'TrueMoney', fields: ['TrueMoney Wallet Number'] }
    ]},
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', rateToINR: 4.55, 
    methods: [
      { name: 'Bank Transfer (EFT)', fields: ['Bank Name', 'Account Number', 'Branch Code', 'Full Name'] },
      { name: 'Capitec Pay', fields: ['Phone Number'] }
    ]},
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', rateToINR: 0.65, 
    methods: [
      { name: 'M-PESA', fields: ['Phone Number', 'Full Name'] },
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Full Name'] }
    ]},
  { name: 'Malaysia', currency: 'MYR', symbol: 'RM', rateToINR: 17.6, 
    methods: [
      { name: 'Bank Transfer', fields: ['Bank Name', 'Account Number', 'Full Name'] },
      { name: 'DuitNow', fields: ['Phone Number or ID Number'] },
      { name: 'Touch \'n Go', fields: ['eWallet Phone Number'] }
    ]}
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
        // --- THIS LOGIC IS NOW CORRECTED ---
        paymentOptions: getRandomElements(country.methods, getRandomInt(2, Math.min(5, country.methods.length))),
        limit: `${country.symbol}${getRandomInt(100, 500)} - ${country.symbol}${getRandomInt(10000, 50000)}`,
        online: Math.random() > 0.3, // 70% chance of being online
      };
      tradersForCountry.push(trcTrader);

      // Create 9 other traders (BEP-20 / ERC-20)
      for (let i = 0; i < 9; i++) {
        const baseRateINR = getRandom(94.5, 104.0);
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
          // --- THIS LOGIC IS NOW CORRECTED ---
          paymentOptions: getRandomElements(country.methods, getRandomInt(2, Math.min(5, country.methods.length))),
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