import mongoose, { Schema } from "mongoose";

const HolidaySchema = new Schema({
  date: { type: String, required: true, unique: true }, // "YYYY-MM-DD"
  name: { type: String, required: true },
  isOptional: { type: Boolean, default: false },
});

export const Holiday = mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
export default Holiday;
