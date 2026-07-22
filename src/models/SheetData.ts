import mongoose, { Schema } from "mongoose";

const TaskItemSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, default: "General" },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "MEDIUM",
    required: true,
  },
  status: {
    type: String,
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "WAITING_FOR_REVIEW", "APPROVED"],
    default: "NOT_STARTED",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ColumnSnapshotSchema = new Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["text", "number", "boolean", "select"],
    default: "text",
    required: true,
  },
  options: [{ type: String }],
});

const SheetDataSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  templateId: { type: Schema.Types.ObjectId, ref: "SheetTemplate", required: true },
  columnsSnapshot: { type: [ColumnSnapshotSchema], default: undefined }, // Lock columns config for historic safety
  data: { type: Map, of: Schema.Types.Mixed, default: {} }, // Key-value store of dynamic cell inputs
  tasks: { type: [TaskItemSchema], default: [] },
  eodSummary: { type: String, default: "" },
  submittedAt: { type: Date, default: null },
});


// Ensure a single sheet data record per user per day
SheetDataSchema.index({ userId: 1, date: 1 }, { unique: true });

export const SheetData = mongoose.models.SheetData || mongoose.model("SheetData", SheetDataSchema);
export default SheetData;
