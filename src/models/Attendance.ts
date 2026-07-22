import mongoose, { Schema } from "mongoose";

const CorrectionSchema = new Schema({
  proposedCheckIn: { type: Date, default: null },
  proposedCheckOut: { type: Date, default: null },
  reason: { type: String, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
    required: true,
  },
  approvedOrRejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const AttendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD" (Asia/Kolkata)
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  breaks: [
    {
      start: { type: Date, required: true },
      end: { type: Date, default: null },
    },
  ],
  workDurationMinutes: { type: Number, default: 0 },
  breakDurationMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WFH", "MISSING_CHECKOUT"],
    default: "PRESENT",
    required: true,
  },
  corrections: { type: [CorrectionSchema], default: [] },
});

// Compound index to prevent multiple attendance records per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
export default Attendance;
