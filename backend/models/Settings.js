import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  platformFee: { type: Number, default: 0.1 },
  minTradeAmount: { type: Number, default: 100 },
  supportEmail: { type: String, default: 'support@example.com' },
  maintenanceMode: { type: Boolean, default: false },
});

export default mongoose.model('Settings', SettingsSchema);