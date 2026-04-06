const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { User, Message } = require('../models');
const onlineUsers = require('../utils/onlineUsers'); // ✅ shared Map

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
   

     // ✅ JOIN USER ROOM (🔥 MOST IMPORTANT LINE)
  socket.join(`user:${userId}`);

  console.log("🟢 Joined room:", `user:${userId}`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });

    socket.broadcast.emit('user:online', { userId });
    console.log(`✅ User connected: ${socket.user.username}`);

    // ✅ helper to get sockets by any user id
    const getSockets = (id) => onlineUsers.get(Number(id));

    socket.on('conversation:join', (room) =>{
      console.log("👉 Joining room:", room);
     socket.join(room);
    });
    socket.on('conversation:leave', (room) =>{
      console.log("Leave Room:", room);
    socket.leave(room)});

    // ================= TYPING =================
   socket.on('typing:start', ({ conversationId, userId, username }) => {
  socket.to(`conv:${conversationId}`).emit('typing:start', {
    conversationId,
    userId,
    username,
  });
});

socket.on('typing:stop', ({ conversationId }) => {
  socket.to(`conv:${conversationId}`).emit('typing:stop', {
    conversationId
  });
});

    // ================= MESSAGE SEND (🔥 REALTIME FIX) =================
// socket.on("message:send", ({ message, conversationId}) => {


//   // ✅ 2. ALSO send to all users in conversation room (IMPORTANT)
//   io.to(`conv:${conversationId}`).emit("message:new", {
//     message,
//     conversationId,
//   });
// });

socket.on("message:send", ({ message, conversationId, receiverId }) => {

  // ✅ send to conversation room
  io.to(`conv:${conversationId}`).emit("message:new", {
    message,
    conversationId,
  });

  // 🔥 ALSO send to receiver personal room (FIX)
  io.to(`user:${receiverId}`).emit("message:new", {
    message,
    conversationId,
  });

});

 

    // ================= MESSAGE EDIT =================
    socket.on('message:edited', ({ message, conversationId, receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('message:edited', { message, conversationId })
      );
    });

    // ================= MESSAGE DELETE =================
    socket.on('message:deleted', ({ messageId, conversationId, receiverId, deleteFor }) => {
      if (deleteFor === 'everyone') {
        getSockets(receiverId)?.forEach(id =>
          io.to(id).emit('message:deleted', { messageId, conversationId })
        );
      }
    });

    // ================= REACTIONS =================
    socket.on('message:reaction', ({ messageId, conversationId, reactions, receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('message:reaction', { messageId, conversationId, reactions })
      );
      onlineUsers.get(userId)?.forEach(id => {
        if (id !== socket.id) {
          io.to(id).emit('message:reaction', { messageId, conversationId, reactions });
        }
      });
    });

    // ================= FRIEND REQUEST =================
    socket.on('friend:request', ({ request, receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('friend:request', { request })
      );
    });

    socket.on('friend:response', ({ request, senderId }) => {
      getSockets(senderId)?.forEach(id =>
        io.to(id).emit('friend:response', { request })
      );
    });

    // ================= MESSAGE READ =================
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await Message.update(
          { isRead: true },
          { where: { conversationId, senderId: { [Op.ne]: userId }, isRead: false } }
        );
        io.to(`conv:${conversationId}`).emit('message:read', { conversationId });
      } catch (err) {
        console.error('Read error:', err);
      }
    });

    // ================= CALL =================
    socket.on('call:initiate', ({ receiverId, callType, offer }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('call:incoming', {
          callerId: userId, callerName: socket.user.username,
          callerAvatar: socket.user.avatar, callType, offer,
        })
      );
    });

    socket.on('call:answer', ({ callerId, answer }) => {
      getSockets(callerId)?.forEach(id =>
        io.to(id).emit('call:answered', { answer })
      );
    });

    socket.on('call:reject', ({ callerId }) => {
      getSockets(callerId)?.forEach(id =>
        io.to(id).emit('call:rejected')
      );
    });

    socket.on('call:end', ({ receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('call:ended')
      );
    });

    socket.on('call:ice-candidate', ({ receiverId, candidate }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('call:ice-candidate', { candidate })
      );
    });

    // ================= DISCONNECT =================
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await User.update(
            { isOnline: false, lastSeen: new Date(), socketId: null },
            { where: { id: userId } }
          );
          io.emit('user:offline', { userId, lastSeen: new Date() });
        }
      }
      console.log(`❌ User disconnected: ${socket.user.username}`);
    });
  });

  

  return { onlineUsers };
};