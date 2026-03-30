// const { Op } = require('sequelize');
// const jwt = require('jsonwebtoken');
// const { User, Message } = require('../models');

// const onlineUsers = new Map(); // userId -> Set(socketIds)

// module.exports = (io) => {
//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth.token;
//       if (!token) return next(new Error('Authentication error'));
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const user = await User.findByPk(decoded.id);
//       if (!user) return next(new Error('User not found'));
//       socket.user = user;
//       next();
//     } catch {
//       next(new Error('Authentication error'));
//     }
//   });

//   io.on('connection', async (socket) => {
//     const userId = socket.user.id;

//     if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
//     onlineUsers.get(userId).add(socket.id);

//     await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });

//     socket.broadcast.emit('user:online', { userId });
//     console.log(`✅ User connected: ${socket.user.username}`);

//     socket.on('conversation:join', (conversationId) => socket.join(`conv:${conversationId}`));
//     socket.on('conversation:leave', (conversationId) => socket.leave(`conv:${conversationId}`));

//     // ================= TYPING =================
//     socket.on('typing:start', ({ conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('typing:start', { conversationId, userId, username: socket.user.username })
//       );
//     });

//     socket.on('typing:stop', ({ conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('typing:stop', { conversationId, userId })
//       );
//     });

//     // // ================= MESSAGE SEND =================
//     // socket.on('message:send', ({ message, receiverId, conversationId }) => {
//     //   onlineUsers.get(receiverId)?.forEach(id =>
//     //     io.to(id).emit('message:new', { message, conversationId })
//     //   );
//     // });

// //     socket.on('message:send', ({ message, receiverId, conversationId }) => {

// //   // 🔥 DEBUG (add this)
// //   console.log('📩 Incoming message:', message);

// //   // ❗ FIX: Ensure file is included
// //   const formattedMessage = {
// //     ...message,
// //     file: message.file || message.image || null, // handle naming issue
// //   };

// //   onlineUsers.get(receiverId)?.forEach(id =>
// //     io.to(id).emit('message:new', { 
// //       message: formattedMessage, 
// //       conversationId 
// //     })
// //   );
// // });

//     socket.on('message:send', ({ message, receiverId, conversationId }) => {

//   const finalMessage = {
//     ...message,
//     file: message.file || message.fileUrl || null
//   };

//   onlineUsers.get(receiverId)?.forEach(id =>
//     io.to(id).emit('message:new', { 
//       message: finalMessage, 
//       conversationId 
//     })
//   );
// });

//     // ================= MESSAGE EDIT =================
//     socket.on('message:edited', ({ message, conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('message:edited', { message, conversationId })
//       );
//     });

//     // ================= MESSAGE DELETE =================
//     socket.on('message:deleted', ({ messageId, conversationId, receiverId, deleteFor }) => {
//       if (deleteFor === 'everyone') {
//         onlineUsers.get(receiverId)?.forEach(id =>
//           io.to(id).emit('message:deleted', { messageId, conversationId })
//         );
//       }
//     });

//     // ================= REACTIONS ✅ FIXED =================
//     socket.on('message:reaction', ({ messageId, conversationId, reactions, receiverId }) => {
//       // ✅ Send to receiver
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('message:reaction', { messageId, conversationId, reactions })
//       );

//       // ✅ Send back to sender's OTHER sockets (multi-tab support)
//       // Skip current socket.id — that tab already updated state locally
//       onlineUsers.get(userId)?.forEach(id => {
//         if (id !== socket.id) {
//           io.to(id).emit('message:reaction', { messageId, conversationId, reactions });
//         }
//       });
//     });

//     // ================= FRIEND REQUEST =================
//     socket.on('friend:request', ({ request, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('friend:request', { request }));
//     });

//     socket.on('friend:response', ({ request, senderId }) => {
//       onlineUsers.get(senderId)?.forEach(id => io.to(id).emit('friend:response', { request }));
//     });

//     // ================= MESSAGE READ =================
//     socket.on('message:read', async ({ conversationId }) => {
//       try {
//         await Message.update(
//           { isRead: true },
//           { where: { conversationId, senderId: { [Op.ne]: userId }, isRead: false } }
//         );
//         io.to(`conv:${conversationId}`).emit('message:read', { conversationId });
//       } catch (err) {
//         console.error('Read error:', err);
//       }
//     });

//     // ================= CALL =================
//     socket.on('call:initiate', ({ receiverId, callType, offer }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('call:incoming', {
//           callerId: userId, callerName: socket.user.username,
//           callerAvatar: socket.user.avatar, callType, offer,
//         })
//       );
//     });

//     socket.on('call:answer', ({ callerId, answer }) => {
//       onlineUsers.get(callerId)?.forEach(id => io.to(id).emit('call:answered', { answer }));
//     });

//     socket.on('call:reject', ({ callerId }) => {
//       onlineUsers.get(callerId)?.forEach(id => io.to(id).emit('call:rejected'));
//     });

//     socket.on('call:end', ({ receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('call:ended'));
//     });

//     socket.on('call:ice-candidate', ({ receiverId, candidate }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('call:ice-candidate', { candidate }));
//     });

//     // ================= DISCONNECT =================
//     socket.on('disconnect', async () => {
//       const userSockets = onlineUsers.get(userId);
//       if (userSockets) {
//         userSockets.delete(socket.id);
//         if (userSockets.size === 0) {
//           onlineUsers.delete(userId);
//           await User.update(
//             { isOnline: false, lastSeen: new Date(), socketId: null },
//             { where: { id: userId } }
//           );
//           io.emit('user:offline', { userId, lastSeen: new Date() });
//         }
//       }
//       console.log(`❌ User disconnected: ${socket.user.username}`);
//     });
//   });

//   return { onlineUsers };
// };












// const { Op } = require('sequelize');
// const jwt = require('jsonwebtoken');
// const { User, Message } = require('../models');

// const onlineUsers = new Map(); // userId -> Set(socketIds)

// module.exports = (io) => {
//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth.token;
//       if (!token) return next(new Error('Authentication error'));
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const user = await User.findByPk(decoded.id);
//       if (!user) return next(new Error('User not found'));
//       socket.user = user;
//       next();
//     } catch {
//       next(new Error('Authentication error'));
//     }
//   });

//   io.on('connection', async (socket) => {
//     const userId = socket.user.id;

//     if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
//     onlineUsers.get(userId).add(socket.id);

//     await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });

//     socket.broadcast.emit('user:online', { userId });
//     console.log(`✅ User connected: ${socket.user.username}`);

//     socket.on('conversation:join', (conversationId) => socket.join(`conv:${conversationId}`));
//     socket.on('conversation:leave', (conversationId) => socket.leave(`conv:${conversationId}`));

//     // ================= TYPING =================
//     socket.on('typing:start', ({ conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('typing:start', { conversationId, userId, username: socket.user.username })
//       );
//     });

//     socket.on('typing:stop', ({ conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('typing:stop', { conversationId, userId })
//       );
//     });

//     // ================= MESSAGE SEND =================
//     socket.on('message:send', ({ message, receiverId, conversationId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('message:new', { message, conversationId })
//       );
//     });

//     // ================= MESSAGE EDIT =================
//     socket.on('message:edited', ({ message, conversationId, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('message:edited', { message, conversationId })
//       );
//     });

//     // ================= MESSAGE DELETE =================
//     socket.on('message:deleted', ({ messageId, conversationId, receiverId, deleteFor }) => {
//       if (deleteFor === 'everyone') {
//         onlineUsers.get(receiverId)?.forEach(id =>
//           io.to(id).emit('message:deleted', { messageId, conversationId })
//         );
//       }
//     });

//     // ================= REACTIONS ✅ FIXED =================
//     socket.on('message:reaction', ({ messageId, conversationId, reactions, receiverId }) => {
//       // ✅ Send to receiver
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('message:reaction', { messageId, conversationId, reactions })
//       );

//       // ✅ Send back to sender's OTHER sockets (multi-tab support)
//       // Skip current socket.id — that tab already updated state locally
//       onlineUsers.get(userId)?.forEach(id => {
//         if (id !== socket.id) {
//           io.to(id).emit('message:reaction', { messageId, conversationId, reactions });
//         }
//       });
//     });

//     // ================= FRIEND REQUEST =================
//     socket.on('friend:request', ({ request, receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('friend:request', { request }));
//     });

//     socket.on('friend:response', ({ request, senderId }) => {
//       onlineUsers.get(senderId)?.forEach(id => io.to(id).emit('friend:response', { request }));
//     });

//     // ================= MESSAGE READ =================
//     socket.on('message:read', async ({ conversationId }) => {
//       try {
//         await Message.update(
//           { isRead: true },
//           { where: { conversationId, senderId: { [Op.ne]: userId }, isRead: false } }
//         );
//         io.to(`conv:${conversationId}`).emit('message:read', { conversationId });
//       } catch (err) {
//         console.error('Read error:', err);
//       }
//     });

//     // ================= CALL =================
//     socket.on('call:initiate', ({ receiverId, callType, offer }) => {
//       onlineUsers.get(receiverId)?.forEach(id =>
//         io.to(id).emit('call:incoming', {
//           callerId: userId, callerName: socket.user.username,
//           callerAvatar: socket.user.avatar, callType, offer,
//         })
//       );
//     });

//     socket.on('call:answer', ({ callerId, answer }) => {
//       onlineUsers.get(callerId)?.forEach(id => io.to(id).emit('call:answered', { answer }));
//     });

//     socket.on('call:reject', ({ callerId }) => {
//       onlineUsers.get(callerId)?.forEach(id => io.to(id).emit('call:rejected'));
//     });

//     socket.on('call:end', ({ receiverId }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('call:ended'));
//     });

//     socket.on('call:ice-candidate', ({ receiverId, candidate }) => {
//       onlineUsers.get(receiverId)?.forEach(id => io.to(id).emit('call:ice-candidate', { candidate }));
//     });

//     // ================= DISCONNECT =================
//     socket.on('disconnect', async () => {
//       const userSockets = onlineUsers.get(userId);
//       if (userSockets) {
//         userSockets.delete(socket.id);
//         if (userSockets.size === 0) {
//           onlineUsers.delete(userId);
//           await User.update(
//             { isOnline: false, lastSeen: new Date(), socketId: null },
//             { where: { id: userId } }
//           );
//           io.emit('user:offline', { userId, lastSeen: new Date() });
//         }
//       }
//       console.log(`❌ User disconnected: ${socket.user.username}`);
//     });
//   });

//   return { onlineUsers };
// };












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

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });

    socket.broadcast.emit('user:online', { userId });
    console.log(`✅ User connected: ${socket.user.username}`);

    // ✅ helper to get sockets by any user id
    const getSockets = (id) => onlineUsers.get(Number(id));

    socket.on('conversation:join', (conversationId) => socket.join(`conv:${conversationId}`));
    socket.on('conversation:leave', (conversationId) => socket.leave(`conv:${conversationId}`));

    // ================= TYPING =================
    socket.on('typing:start', ({ conversationId, receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('typing:start', { conversationId, userId, username: socket.user.username })
      );
    });

    socket.on('typing:stop', ({ conversationId, receiverId }) => {
      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('typing:stop', { conversationId, userId })
      );
    });

    // ================= MESSAGE SEND =================
    socket.on('message:send', ({ message, receiverId, conversationId }) => {
      const finalMessage = {
        ...message,
        file: message.file || message.fileUrl || null,
      };

      getSockets(receiverId)?.forEach(id =>
        io.to(id).emit('message:new', {
          message: finalMessage,
          conversationId,
        })
      );
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