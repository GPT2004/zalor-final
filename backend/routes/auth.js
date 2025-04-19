const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Import middleware

// Đăng ký
router.post('/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, phone, email, password });
    await user.save(); // Mật khẩu sẽ được mã hóa tự động bởi UserSchema.pre('save')

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Thay đổi mật khẩu
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid old password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Xóa tài khoản
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // (Tùy chọn) Xóa các dữ liệu liên quan (friend requests, groups, v.v.)
    // Ví dụ: await FriendRequest.deleteMany({ $or: [{ from: req.user.id }, { to: req.user.id }] });

    res.status(200).json({ msg: 'Account deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Cập nhật cài đặt (doNotDisturb)
router.put('/me/settings', authMiddleware, async (req, res) => {
  try {
    const { doNotDisturb } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.doNotDisturb = doNotDisturb;
    await user.save();

    res.status(200).json({ msg: 'Settings updated successfully', doNotDisturb });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;