const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const fs = require('fs'); // Để xóa file tạm
const router = express.Router();

// [GET] Lấy thông tin profile của người dùng hiện tại
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// [PUT] Cập nhật thông tin profile
router.put('/me', auth, upload.single('avatar'), async (req, res) => {
  const { name, address, birthDate } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Cập nhật các trường nếu có giá trị mới
    if (name) user.name = name;
    if (address) user.address = address;
    if (birthDate) user.birthDate = birthDate;
    

    // Nếu có file ảnh được upload, upload lên Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'zalor/avatars', // Lưu vào thư mục zalor/avatars trên Cloudinary
        resource_type: 'image',
      });

      // Lưu URL từ Cloudinary vào database
      user.avatar = result.secure_url;

      // Xóa file tạm trên server
      fs.unlinkSync(req.file.path);
    }

    await user.save();
    res.json(user);
  } catch (err) {
    // Nếu có lỗi, xóa file tạm (nếu tồn tại)
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});
// [GET] Tìm kiếm bạn bè
router.get('/search', auth, async (req, res) => {
  const { phone, name } = req.query;
  try {
    if (!phone && !name) {
      return res.status(400).json({ msg: 'Vui lòng cung cấp số điện thoại hoặc tên để tìm kiếm' });
    }

    // Lấy danh sách bạn bè của người dùng hiện tại
    const currentUser = await User.findById(req.user.id).populate('friends', 'name phone avatar');
    const friendIds = currentUser.friends.map(friend => friend._id);

    // Tìm kiếm trong danh sách bạn bè
    const query = { _id: { $in: friendIds } };
    if (phone) query.phone = phone;
    if (name) query.name = { $regex: name, $options: 'i' };

    const users = await User.find(query).select('name phone avatar');
    res.json(users);
  } catch (err) {
    console.error('Error searching friends:', err);
    res.status(500).json({ msg: 'Lỗi server khi tìm kiếm bạn bè' });
  }
});
// [GET] Lấy thông tin người dùng theo ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const currentUser = await User.findById(req.user.id);
    const isFriend = currentUser.friends.some(friendId => friendId.toString() === req.params.id);
    if (!isFriend && req.user.id !== req.params.id) {
      return res.status(403).json({ msg: 'Bạn không có quyền xem thông tin của người dùng này' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});
module.exports = router;