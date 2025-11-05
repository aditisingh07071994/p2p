import 'dotenv/config'; // Loads .env variables
import mongoose from 'mongoose';
import Ad from './models/Ad.js'; // Imports your Ad model
import readline from 'readline'; // Used for confirmation

// --- Data for 10 Famous Crypto Ads ---
// Updated with verified working image URLs
const adsData = [
  {
    id: 1,
    title: 'Trade on Binance',
    description: 'The world\'s largest crypto exchange. Buy, sell, and trade hundreds of cryptocurrencies.',
    image: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    bgColor: 'from-yellow-400 to-yellow-500',
    link: 'https://www.binance.com/',
    active: true
  },
  {
    id: 2,
    title: 'Get Started with Coinbase',
    description: 'The easiest and most trusted place to buy, sell, and manage your cryptocurrency.',
    image: 'https://cryptologos.cc/logos/coinbase-coin-logo.png',
    bgColor: 'from-blue-500 to-blue-600',
    link: 'https://www.coinbase.com/',
    active: true
  },
  {
    id: 3,
    title: 'Secure Your Crypto with Ledger',
    description: 'The most popular hardware wallet. Keep your crypto safe from hackers and in your own control.',
    image: 'https://logos-world.net/wp-content/uploads/2021/02/Ledger-Logo.png',
    bgColor: 'from-gray-700 to-gray-800',
    link: 'https://www.ledger.com/',
    active: true
  },
  {
    id: 4,
    title: 'Your Wallet for Web3',
    description: 'The world\'s leading self-custody wallet. Start exploring blockchain applications and DeFi.',
    image: 'https://cryptologos.cc/logos/metamask-logo.png',
    bgColor: 'from-orange-400 to-orange-500',
    link: 'https://metamask.io/',
    active: true
  },
  {
    id: 5,
    title: 'Swap on Uniswap',
    description: 'The leading decentralized exchange. Swap, earn, and build on the Uniswap Protocol.',
    image: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    bgColor: 'from-pink-400 to-pink-500',
    link: 'https://uniswap.org/',
    active: true
  },
  {
    id: 6,
    title: 'Chainlink Data Feeds',
    description: 'The industry-standard oracle network for powering hybrid smart contracts.',
    image: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
    bgColor: 'from-blue-600 to-blue-700',
    link: 'https://chain.link/',
    active: true
  },
  {
    id: 7,
    title: 'Polygon: The Value Layer of the Internet',
    description: 'Fast, secure, and scalable Ethereum scaling solutions for Web3 builders.',
    image: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    bgColor: 'from-purple-500 to-purple-600',
    link: 'https://polygon.technology/',
    active: true
  },
  {
    id: 8,
    title: 'Build on Solana',
    description: 'Experience the high-performance blockchain for global-scale applications.',
    image: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    bgColor: 'from-green-400 to-purple-500',
    link: 'https://solana.com/',
    active: true
  },
  {
    id: 9,
    title: 'Tether (USDT)',
    description: 'The original, most popular stablecoin, pegged 1:1 with the U.S. dollar.',
    image: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    bgColor: 'from-green-400 to-green-500',
    link: 'https://tether.to/',
    active: true
  },
  {
    id: 10,
    title: 'Kraken Pro',
    description: 'The secure and professional way to trade crypto. Low fees, deep liquidity.',
    image: 'https://logos-world.net/wp-content/uploads/2021/02/Kraken-Logo.png',
    bgColor: 'from-indigo-500 to-indigo-600',
    link: 'https://www.kraken.com/',
    active: true
  }
];

// --- Seeder Function ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const importData = async () => {
  try {
    // 1. Connect to DB
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'p2p' });
    console.log('MongoDB Connected...');

    // 2. Delete all existing ads
    await Ad.deleteMany({});
    console.log('Existing ads have been wiped.');

    // 3. Insert new ads
    await Ad.insertMany(adsData);
    console.log('New ads have been imported!');
    
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
console.log('WARNING: This script will WIPE all existing ads in your database.');
rl.question('Are you sure you want to continue? Type "yes" to proceed: ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('Proceeding with database seeding...');
    importData();
  } else {
    console.log('Aborted. No changes were made.');
    rl.close();
    process.exit();
  }
});