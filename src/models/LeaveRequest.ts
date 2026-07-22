import mongoose, { Schema } from "mongoose";

const LeaveRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["FULL_DAY", "HALF_DAY", "HOURLY", "WFH"],
    required: true,
  },
  startDate: { type: String, required: true }, // "YYYY-MM-DD"
  endDate: { type: String, required: true }, // "YYYY-MM-DD"
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
    required: true,
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  comments: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const LeaveRequest =
  mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", LeaveRequestSchema);
export default LeaveRequest;
