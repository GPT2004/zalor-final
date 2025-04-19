const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String },
  birthDate: { type: Date },
  avatar: { type: String }, // URL của ảnh đại diện
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  doNotDisturb: { type: Boolean, default: false }, // Thêm trường doNotDisturb
  isOnline: { type: Boolean, default: false }, // Thêm trường isOnline
});

// Mã hóa mật khẩu trước khi lưu
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Phương thức so sánh mật khẩu
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);