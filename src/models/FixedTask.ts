import mongoose, { Schema } from "mongoose";

const FixedTaskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "MEDIUM",
    required: true,
  },
  category: { type: String, default: "General" },
  assignedDesignation: { type: String, default: "ALL" }, // "ALL", "Video Editor", "Content Writer", "Graphic Designer"
  createdAt: { type: Date, default: Date.now },
});

export const FixedTask = mongoose.models.FixedTask || mongoose.model("FixedTask", FixedTaskSchema);
export default FixedTask;
