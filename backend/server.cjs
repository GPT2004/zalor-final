const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const usersRoutes = require('./routes/users');
const groupsRoutes = require('./routes/groups');
const messageRoutes = require('./routes/messages');
const User = require('./models/User'); // Import model User để cập nhật trạng thái
process.env.LANG = 'en_US.UTF-8';
const app = express();
const path = require('path');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // URL của frontend
    methods: ['GET', 'POST'],
  },
});

// Gắn Socket.IO vào app để sử dụng trong routes
app.set('socketio', io);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "build", "index.html"));
  });
}
// Middleware
app.use(express.json());
app.use(cors());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Khi người dùng đăng nhập (gửi userId từ client)
  socket.on('userConnected', async (userId) => {
    try {
      // Cập nhật trạng thái online trong cơ sở dữ liệu
      const user = await User.findByIdAndUpdate(
        userId,
        { isOnline: true },
        { new: true }
      );
      if (!user) {
        console.error(`User with ID ${userId} not found`);
        return;
      }

      // Lưu userId vào socket để sử dụng khi disconnect
      socket.userId = userId;

      // Thông báo trạng thái online đến tất cả client
      io.emit('userStatus', { userId, isOnline: true });
      console.log(`User ${userId} is online`);
    } catch (err) {
      console.error('Error updating online status:', err);
    }
  });

  // Tham gia phòng chat (1-1 hoặc nhóm)
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.userId || 'unknown'} joined room: ${roomId}`);
  });

  // Khi người dùng ngắt kết nối
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        // Cập nhật trạng thái offline trong cơ sở dữ liệu
        const user = await User.findByIdAndUpdate(
          socket.userId,
          { isOnline: false },
          { new: true }
        );
        if (!user) {
          console.error(`User with ID ${socket.userId} not found`);
          return;
        }

        // Thông báo trạng thái offline đến tất cả client
        io.emit('userStatus', { userId: socket.userId, isOnline: false });
        console.log(`User ${socket.userId} is offline`);
      }
    } catch (err) {
      console.error('Error updating offline status:', err);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));