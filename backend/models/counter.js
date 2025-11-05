// models/counter.js — simple auto-increment counter per collection
import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // collection name, e.g., 'traders', 'ads'
  seq: { type: Number, default: 1 },
});

export default mongoose.models.Counter || mongoose.model('counters', CounterSchema);
