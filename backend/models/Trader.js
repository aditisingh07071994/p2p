// models/Trader.js
import mongoose from 'mongoose';
import Counter from './counter.js';

const TraderSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true },        // numeric id for FE
  name: String,
  avatar: String,
  country: String,
  currency: String,
  currencySymbol: String,
  pricePerUsdt: Number,
  totalTrades: Number,
  successRate: Number,
  responseRate: String,
  network: { type: String, enum: ['BEP-20','ERC-20','TRC-20'] },
  paymentOptions: [{ name: String, fields: [String] }],
  limit: String,
  online: Boolean,
  rating: Number,
  reviews: Number,
}, { timestamps: true });

TraderSchema.pre('save', async function (next) {
  if (this.id) return next(); // keep existing id if provided (for migration)
  const ctr = await Counter.findByIdAndUpdate(
    'traders',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.id = ctr.seq;
  next();
});

export default mongoose.models.Trader || mongoose.model('traders', TraderSchema);
