import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  address: { type: String, required: true, index: true },
  network: { 
    type: String, 
    required: true,
    enum: ['ERC-20', 'BEP-20', 'TRC-20'] 
  },
  walletClient: String,
  createdAt: { type: Date, default: Date.now },
});

// Create a compound index to ensure address+network is unique
WalletSchema.index({ address: 1, network: 1 }, { unique: true });

export default mongoose.model('Wallet', WalletSchema);