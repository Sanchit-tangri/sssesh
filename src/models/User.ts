import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  likedSongs: [{
    title: String,
    artist: String,
    url: String,
    thumbnail: String,
    duration: Number,
  }],
}, { timestamps: true });

userSchema.pre("save", async function() {
  const user = this as any;
  if (!user.isModified("password")) return;
  user.password = await bcrypt.hash(user.password, 10);
});

userSchema.methods.comparePassword = function(password: string) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
