import mongoose, { Schema } from "mongoose";

const ColumnConfigSchema = new Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["text", "number", "boolean", "select"],
    default: "text",
    required: true,
  },
  options: [{ type: String }], // Optional choices for 'select' type
});

const SheetTemplateSchema = new Schema({
  name: { type: String, required: true },
  columns: { type: [ColumnConfigSchema], default: [], required: true },
  assignedRoles: [{ type: String }], // Roles this template defaults to
  isActive: { type: Boolean, default: true, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const SheetTemplate =
  mongoose.models.SheetTemplate || mongoose.model("SheetTemplate", SheetTemplateSchema);
export default SheetTemplate;
