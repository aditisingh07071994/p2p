// models/Ad.js
import mongoose from 'mongoose';
import Counter from './counter.js';

const AdSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true },       // numeric id for FE
  title: String,
  description: String,
  image: String,
  bgColor: String,
  link: String,
  active: Boolean,
}, { timestamps: true });

AdSchema.pre('save', async function (next) {
  if (this.id) return next();
  const ctr = await Counter.findByIdAndUpdate(
    'ads',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.id = ctr.seq;
  next();
});

export default mongoose.models.Ad || mongoose.model('ads', AdSchema);
