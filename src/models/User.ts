import mongoose, { Schema } from "mongoose";
import "@/models/SheetTemplate";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"],
    default: "EMPLOYEE",
    required: true,
  },
  designation: { type: String, default: "" }, // e.g. "Video Editor", "Graphic Designer", etc.
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
    required: true,
  },
  assignedTemplateId: { type: Schema.Types.ObjectId, ref: "SheetTemplate", default: null },
  createdAt: { type: Date, default: Date.now },
});

delete mongoose.models.User;

export const User = mongoose.model("User", UserSchema);
export default User;
