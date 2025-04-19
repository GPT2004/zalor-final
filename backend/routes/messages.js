const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const Message = require('../models/Message');

// [POST] Gửi tin nhắn
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { receiverId, content, isGroup } = req.body;
    const senderId = req.user.id;

    let messageContent = content;
    let messageType = 'text';
    let fileName = null;

    if (req.file) {
      const mimeType = req.file.mimetype;
      let resourceType;

      if (mimeType.startsWith('image')) {
        resourceType = 'image';
        messageType = 'image';
      } else if (mimeType.startsWith('video')) {
        resourceType = 'video';
        messageType = 'video';
      } else {
        resourceType = 'raw';
        messageType = 'file';
      }

      // Decode tên file trực tiếp từ buffer với UTF-8
      fileName = Buffer.from(req.file.originalname, 'binary').toString('utf8');

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: `zalor/${messageType}s`,
        resource_type: resourceType,
      });

      messageContent = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const message = new Message({
      senderId,
      receiverId,
      content: messageContent,
      type: messageType,
      fileName: fileName,
      isGroup: isGroup === 'true',
      isRead: false,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name avatar');
    console.log('Emitting message:', populatedMessage); // Kiểm tra log

    const io = req.app.get('socketio');
    const roomId = isGroup === 'true' ? receiverId : [senderId, receiverId].sort().join('-');
    io.to(roomId).emit('receiveMessage', populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// [GET] Lấy lịch sử tin nhắn (không tự động đánh dấu đã xem)
router.get('/:receiverId', authMiddleware, async (req, res) => {
  try {
    const receiverId = req.params.receiverId; // ID của người gửi hoặc nhóm
    const userId = req.user.id;              // ID của người đang xem (người nhận)
    const { isGroup } = req.query;

    let query = {};
    if (isGroup === 'true') {
      query = { receiverId, isGroup: true };
    } else {
      query = {
        $or: [
          { senderId: userId, receiverId, isGroup: false },  // Tin nhắn do user gửi
          { senderId: receiverId, receiverId: userId, isGroup: false }, // Tin nhắn nhận từ người khác
        ],
      };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 });

    // Không đánh dấu tự động ở đây, chỉ trả về dữ liệu
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// [POST] Đánh dấu tin nhắn đã xem (API mới)
router.post('/mark-read/:receiverId', authMiddleware, async (req, res) => {
  try {
    const receiverId = req.params.receiverId;
    const userId = req.user.id;
    const { isGroup } = req.body;

    let updated = { modifiedCount: 0 };
    if (isGroup === 'true') {
      updated = await Message.updateMany(
        { receiverId, isGroup: true, isRead: false, senderId: { $ne: userId } },
        { $set: { isRead: true } }
      );
      console.log('Updated group messages count:', updated.modifiedCount);
    } else {
      updated = await Message.updateMany(
        { senderId: receiverId, receiverId: userId, isRead: false, isGroup: false },
        { $set: { isRead: true } }
      );
      console.log('Updated private messages count:', updated.modifiedCount);
    }

    if (updated.modifiedCount > 0) {
      const io = req.app.get('socketio');
      const roomId = isGroup === 'true' ? receiverId : [userId, receiverId].sort().join('-');
      io.to(roomId).emit('messageRead', { receiverId, senderId: userId });
      console.log('Emitted messageRead to room:', roomId);
    }

    res.json({ msg: 'Messages marked as read', count: updated.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// [DELETE] Thu hồi tin nhắn
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    message.isRecalled = true;
    await message.save();

    // Thông báo qua Socket.IO
    const io = req.app.get('socketio');
    const roomId = message.isGroup
      ? message.receiverId
      : [message.senderId, message.receiverId].sort().join('-');
    io.to(roomId).emit('messageRecalled', message._id);

    res.json({ msg: 'Message recalled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// [PUT] Chỉnh sửa tin nhắn
router.put('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    message.content = content;
    message.updatedAt = Date.now();
    await message.save();

    // Thông báo qua Socket.IO
    const io = req.app.get('socketio');
    const roomId = message.isGroup
      ? message.receiverId
      : [message.senderId, message.receiverId].sort().join('-');
    io.to(roomId).emit('messageEdited', message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;