import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // e.g. "USER_LOGIN", "USER_CREATE", "ATTENDANCE_CORRECT", etc.
  details: { type: String, required: true },
  ipAddress: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
