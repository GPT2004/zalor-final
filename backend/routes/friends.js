const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const router = express.Router();

// [GET] Tìm kiếm người dùng theo số điện thoại
router.get('/search', auth, async (req, res) => {
  const { phone } = req.query;

  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  }

  try {
    const user = await User.findOne({ phone })
      .select('name avatar')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Không thể kết bạn với chính mình' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// [POST] Gửi lời mời kết bạn
router.post('/requests', auth, async (req, res) => {
  const { friendId } = req.body;

  try {
    // Kiểm tra người dùng tồn tại
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    // Kiểm tra chế độ "Không làm phiền"
    if (friend.doNotDisturb) {
      return res.status(403).json({ error: 'Người dùng đã bật chế độ không làm phiền' });
    }

    // Không cho phép kết bạn với chính mình
    if (friendId === req.user.id) {
      return res.status(400).json({ error: 'Không thể kết bạn với chính mình' });
    }

    // Kiểm tra xem đã là bạn bè chưa
    const user = await User.findById(req.user.id);
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ error: 'Đã là bạn bè' });
    }

    // Kiểm tra đã gửi lời mời chưa
    const existingRequest = await FriendRequest.findOne({
      from: req.user.id,
      to: friendId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Đã gửi lời mời trước đó' });
    }

    // Tạo lời mời mới
    const newRequest = await FriendRequest.create({
      from: req.user.id,
      to: friendId,
      status: 'pending',
    });

    res.status(201).json({ message: 'Gửi lời mời thành công', request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// [GET] Lấy danh sách lời mời kết bạn (nhận được)
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user.id, status: 'pending' })
      .populate('from', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// [PATCH] Chấp nhận/từ chối lời mời kết bạn
router.patch('/requests/:requestId', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' hoặc 'declined'
  const { requestId } = req.params;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  try {
    const request = await FriendRequest.findOne({
      _id: requestId,
      to: req.user.id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ error: 'Lời mời không tồn tại hoặc đã được xử lý' });
    }

    request.status = status;
    await request.save();

    // Nếu chấp nhận, thêm vào danh sách bạn bè
    if (status === 'accepted') {
      await User.findByIdAndUpdate(request.from, {
        $addToSet: { friends: request.to },
      });
      await User.findByIdAndUpdate(request.to, {
        $addToSet: { friends: request.from },
      });
    }

    res.json({ message: `Đã ${status === 'accepted' ? 'chấp nhận' : 'từ chối'} lời mời` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// [GET] Lấy danh sách bạn bè
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'name avatar isOnline')
      .select('friends');
    res.json(user.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// [GET] Tìm kiếm người dùng (bạn bè) theo tên hoặc số điện thoại
router.get('/search-friends', auth, async (req, res) => {
  const { phone, name } = req.query;
  try {
    // Lấy danh sách bạn bè của người dùng hiện tại
    const user = await User.findById(req.user.id).select('friends');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    let query = { _id: { $in: user.friends } }; // Chỉ tìm trong danh sách bạn bè

    if (phone) {
      query.phone = phone;
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' }; // Tìm kiếm không phân biệt hoa thường
    }

    if (!phone && !name) {
      return res.status(400).json({ msg: 'Cần cung cấp số điện thoại hoặc tên để tìm kiếm' });
    }

    const users = await User.find(query).select('name phone avatar');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;