import mongoose, { Schema } from "mongoose";

const ScriptSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  writerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  fileName: { type: String, default: "" }, // Video File Name
  scriptContent: { type: String, required: true },
  videoUrl: { type: String, default: "" },
  status: {
    type: String,
    enum: ["PENDING_REVIEW", "APPROVED", "CORRECTION_REQUESTED"],
    default: "PENDING_REVIEW",
  },
  clientFeedback: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Script = mongoose.models.Script || mongoose.model("Script", ScriptSchema);
export default Script;
