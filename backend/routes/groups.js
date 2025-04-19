const express = require('express');
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const fs = require('fs'); // Thêm module fs để xóa file tạm
const router = express.Router();

// [POST] Tạo nhóm mới (có thể thêm thành viên ngay khi tạo)
router.post('/', auth, async (req, res) => {
  const { name, memberIds } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ msg: 'Tên nhóm là bắt buộc' });
    }

    const members = [req.user.id];
    if (memberIds && Array.isArray(memberIds)) {
      const users = await User.find({ _id: { $in: memberIds } });
      if (users.length !== memberIds.length) {
        return res.status(400).json({ msg: 'Một số thành viên không tồn tại' });
      }
      members.push(...memberIds);
    }

    const group = new Group({
      name,
      creator: req.user.id,
      members,
    });

    await group.save();

    try {
      await group.populate('creator', 'name').populate('members', 'name');
    } catch (populateErr) {
      console.error('Error populating group data:', populateErr);
    }

    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ msg: 'Lỗi server khi tạo nhóm' });
  }
});

// [GET] Lấy danh sách nhóm
router.get('/', auth, async (req, res) => {
  try {
    const { name } = req.query;
    const query = { members: req.user.id };
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    const groups = await Group.find(query)
      .populate('creator', 'name avatar')
      .populate('members', 'name avatar');
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ msg: 'Lỗi server khi lấy danh sách nhóm' });
  }
});

// [POST] Thêm thành viên vào nhóm
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Nhóm không tồn tại' });
    }

    const userId = req.body.userId || req.user.id;
    if (!userId) {
      return res.status(400).json({ msg: 'Vui lòng cung cấp userId' });
    }

    // Kiểm tra xem người dùng có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tồn tại' });
    }

    // Kiểm tra xem người dùng đã là thành viên chưa
    if (group.members.includes(userId)) {
      return res.status(400).json({ msg: 'Người dùng đã là thành viên của nhóm này' });
    }

    // Thêm người dùng vào nhóm
    group.members.push(userId);
    await group.save();

    // Populate cả creator và members trong một lần gọi
    try {
      await group.populate([
        { path: 'creator', select: 'name avatar' },
        { path: 'members', select: 'name avatar' },
      ]);
    } catch (populateErr) {
      console.error('Error populating group data:', populateErr);
      return res.status(200).json(group); // Vẫn trả về dữ liệu nếu populate thất bại
    }

    res.status(200).json(group);
  } catch (err) {
    console.error('Error adding member to group:', err);
    res.status(500).json({ msg: 'Lỗi server khi thêm thành viên vào nhóm' });
  }
});

// [DELETE] Xóa thành viên khỏi nhóm
router.delete('/:groupId/members/:memberId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Nhóm không tồn tại' });
    }

    // Kiểm tra xem người dùng có phải là admin không
    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Chỉ admin mới có thể xóa thành viên' });
    }

    // Kiểm tra xem thành viên có trong nhóm không
    if (!group.members.includes(req.params.memberId)) {
      return res.status(400).json({ msg: 'Thành viên không có trong nhóm' });
    }

    // Xóa thành viên khỏi nhóm
    group.members = group.members.filter(member => member.toString() !== req.params.memberId);
    await group.save();

    // Populate cả creator và members trong một lần gọi
    try {
      await group.populate([
        { path: 'creator', select: 'name avatar' },
        { path: 'members', select: 'name avatar' },
      ]);
    } catch (populateErr) {
      console.error('Error populating group data:', populateErr);
      return res.status(200).json(group);
    }

    res.status(200).json(group);
  } catch (err) {
    console.error('Error removing member from group:', err);
    res.status(500).json({ msg: 'Lỗi server khi xóa thành viên' });
  }
});

// [DELETE] Rời nhóm 
router.delete('/:groupId/members', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Nhóm không tồn tại' });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Bạn không phải là thành viên của nhóm này' });
    }

    if (group.creator.toString() === req.user.id) {
      return res.status(400).json({ msg: 'Người tạo nhóm không thể rời nhóm. Hãy xóa nhóm nếu muốn.' });
    }

    group.members = group.members.filter(member => member.toString() !== req.user.id);
    await group.save();
    res.json({ msg: 'Rời nhóm thành công' });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ msg: 'Lỗi server khi rời nhóm' });
  }
});

// [PATCH] Cập nhật thông tin nhóm (avatar và description)
router.patch('/:groupId', auth, upload.single('avatar'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Nhóm không tồn tại' });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Chỉ admin mới có thể cập nhật thông tin nhóm' });
    }

    // Cập nhật description nếu có trong body
    if (req.body.description) {
      group.description = req.body.description;
    }

    // Nếu có file ảnh được upload, upload lên Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'zalor/group_avatars', // Lưu vào thư mục zalor/group_avatars trên Cloudinary
        resource_type: 'image',
      });

      // Lưu URL từ Cloudinary vào database
      group.avatar = result.secure_url;

      // Xóa file tạm trên server
      fs.unlinkSync(req.file.path);
    }

    await group.save();

    try {
      await group.populate([
        { path: 'creator', select: 'name avatar' },
        { path: 'members', select: 'name avatar' },
      ]);
    } catch (populateErr) {
      console.error('Error populating group data:', populateErr);
      return res.status(200).json(group);
    }

    res.status(200).json(group);
  } catch (err) {
    // Nếu có lỗi, xóa file tạm (nếu tồn tại)
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error updating group:', err);
    if (err.message === 'Chỉ hỗ trợ file ảnh (jpeg, jpg, png) hoặc video (mp4, mov)!') {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Lỗi server khi cập nhật thông tin nhóm' });
  }
});

// [DELETE] Xóa nhóm (chỉ người tạo nhóm mới có quyền)
router.delete('/:groupId', auth, async (req, res) => {
  try {
    if (!req.params.groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'ID nhóm không hợp lệ' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Nhóm không tồn tại' });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Chỉ người tạo nhóm mới có thể xóa nhóm' });
    }

    await Group.deleteOne({ _id: req.params.groupId });
    res.json({ msg: 'Xóa nhóm thành công' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ msg: 'Lỗi server khi xóa nhóm' });
  }
});

module.exports = router;