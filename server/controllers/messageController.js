const { Op } = require('sequelize');
const { Message, Conversation, User, sequelize } = require('../models');

const getOrCreateConversation = async (userId1, userId2) => {
  const [u1, u2] = [userId1, userId2].sort();
  const [conv] = await Conversation.findOrCreate({
    where: { user1Id: u1, user2Id: u2 },
    defaults: { user1Id: u1, user2Id: u2 },
  });
  return conv;
};

exports.getConversations = async (req, res) => {
  try {
    const convs = await Conversation.findAll({
      where: { [Op.or]: [{ user1Id: req.user.id }, { user2Id: req.user.id }] },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'avatar', 'isOnline', 'lastSeen'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'avatar', 'isOnline', 'lastSeen'] },
        { model: Message, as: 'lastMessage', include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }] },
      ],
      order: [['lastMessageAt', 'DESC']],
    });

    const result = await Promise.all(convs.map(async (conv) => {
      const unreadCount = await Message.count({
        where: { conversationId: conv.id, senderId: { [Op.ne]: req.user.id }, isRead: false, deletedForEveryone: false },
      });
      const data = conv.toJSON();
      data.otherUser = conv.user1Id === req.user.id ? conv.user2 : conv.user1;
      data.unreadCount = unreadCount;
      return data;
    }));

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// exports.getMessages = async (req, res) => {
//   const { conversationId } = req.params;
//   const { page = 1, limit = 50 } = req.query;

//   try {
//     const messages = await Message.findAll({
//       where: {
//         conversationId,
//         deletedForEveryone: false,
//         [Op.not]: [{ deletedForSender: true, senderId: req.user.id }],
//       },
//       include: [
//         { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
//         // { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }] },
//       ],
//       order: [['createdAt', 'DESC']],
//       limit: parseInt(limit),
//       offset: (parseInt(page) - 1) * parseInt(limit),
//     });

//       // ✅ FIX: mark all as read in ONE query
//     await Message.update(
//       { isRead: true },
//       {
//         where: {
//           conversationId,
//           senderId: { [Op.ne]: req.user.id },
//           isRead: false
//         }
//       }
//     );

//     // ✅ emit read event (for realtime unread fix)
//     req.io.to(`conv:${conversationId}`).emit('message:read', {
//       conversationId
//     });

//     // const messagesToUpdate = await Message.findAll({
//     //   where: { conversationId, senderId: { [Op.ne]: req.user.id } },
//     // });
//     // for (let msg of messagesToUpdate) {
//     //   let readBy = msg.readBy || [];
//     //   if (!readBy.includes(req.user.id)) {
//     //     readBy.push(req.user.id);
//     //     await msg.update({ readBy });
//     //   }
//     // }

//     res.json({ messages: messages.reverse() });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };


exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const messages = await Message.findAll({
      where: {
        conversationId,
        deletedForEveryone: false,
        [Op.or]: [
          { deletedForSender: false },
          { senderId: { [Op.ne]: req.user.id } }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // ✅ mark as read (FAST + CORRECT)
    await Message.update(
      { isRead: true },
      {
        where: {
          conversationId,
          senderId: { [Op.ne]: req.user.id },
          isRead: false
        }
      }
    );

    // ✅ realtime read update
    req.io.to(`conv:${conversationId}`).emit('message:read', {
      conversationId
    });

    res.json({ messages: messages.reverse() });

  } catch (err) {
    console.log("❌ GET MESSAGES ERROR:", err); // IMPORTANT
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.sendMessage = async (req, res) => {
  const { receiverId, content, type = 'text', replyToId } = req.body;

  try {
    const conv = await getOrCreateConversation(req.user.id, receiverId);

    const msgData = {
      conversationId: conv.id,
      senderId: req.user.id,
      content,
      type,
      replyToId: replyToId || null,
      readBy: [req.user.id],
    };

    if (req.file) {
      msgData.fileUrl = `/${req.file.path}`;
      msgData.fileName = req.file.originalname;
      msgData.fileSize = req.file.size;
      msgData.type = req.file.mimetype.startsWith('image/') ? 'image'
        : req.file.mimetype.startsWith('video/') ? 'video'
        : req.file.mimetype.startsWith('audio/') ? 'voice'
        : 'file';
    }

    const message = await Message.create(msgData);

    await conv.update({
      lastMessageId: message.id,
      lastMessageAt: new Date(),
    });

    const populated = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        {
          model: Message,
          as: 'replyTo',
          include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }]
        },
      ],
    });

    // ✅ 🔥 REALTIME FIX START

    // 1️⃣ send to conversation room (chat open case)
    req.io.to(`conv:${conv.id}`).emit('message:new', {
      message: populated,
      conversationId: conv.id,
    });

    // 2️⃣ send to receiver directly (chat CLOSED → unread count update)
    req.io.to(`user:${receiverId}`).emit('message:new', {
      message: populated,
      conversationId: conv.id,
    });

    // ✅ 🔥 REALTIME FIX END

    res.status(201).json({
      message: populated,
      conversationId: conv.id,
    });

  } catch (err) {
    console.log("❌ SEND MESSAGE ERROR:", err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

// exports.sendMessage = async (req, res) => {
//   const { receiverId, content, type = 'text', replyToId } = req.body;
//   try {
//     const conv = await getOrCreateConversation(req.user.id, receiverId);
//     const msgData = {
//       conversationId: conv.id, senderId: req.user.id,
//       content, type, replyToId: replyToId || null, readBy: [req.user.id],
//     };
//     if (req.file) {
//       msgData.fileUrl = `/${req.file.path}`;
//       msgData.fileName = req.file.originalname;
//       msgData.fileSize = req.file.size;
//       msgData.type = req.file.mimetype.startsWith('image/') ? 'image'
//         : req.file.mimetype.startsWith('video/') ? 'video'
//         : req.file.mimetype.startsWith('audio/') ? 'voice' : 'file';
//     }
//     const message = await Message.create(msgData);
//     await conv.update({ lastMessageId: message.id, lastMessageAt: new Date() });
//     const populated = await Message.findByPk(message.id, {



//       include: [
//         { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
//         { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }] },
//       ],


//     }
  
//   );
//     res.status(201).json({ message: populated, conversationId: conv.id });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// ===================== SAVE MISSED CALL =====================
exports.saveMissedCall = async (req, res) => {
  const { receiverId, callType } = req.body;
  try {
    const conv = await getOrCreateConversation(req.user.id, receiverId);
    const message = await Message.create({
      conversationId: conv.id, senderId: req.user.id,
      type: 'missed_call', callType,
      content: `Missed ${callType} call`, readBy: [req.user.id],
    });
    await conv.update({ lastMessageId: message.id, lastMessageAt: new Date() });
    const populated = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
    });
    res.status(201).json({ message: populated, conversationId: conv.id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ===================== ✅ SAVE ENDED CALL (with duration) =====================
exports.saveEndedCall = async (req, res) => {
  const { receiverId, callType, duration } = req.body; // duration in seconds

  try {
    const conv = await getOrCreateConversation(req.user.id, receiverId);

    // Format: "02:34"
    const mins = String(Math.floor(duration / 60)).padStart(2, '0');
    const secs = String(duration % 60).padStart(2, '0');
    const durationStr = `${mins}:${secs}`;

    const message = await Message.create({
      conversationId: conv.id,
      senderId: req.user.id,
      type: 'ended_call',
      callType,
      content: `${callType === 'voice' ? 'Voice' : 'Video'} call · ${durationStr}`,
      readBy: [req.user.id],
    });

    await conv.update({ lastMessageId: message.id, lastMessageAt: new Date() });

    const populated = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
    });

    res.status(201).json({ message: populated, conversationId: conv.id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.editMessage = async (req, res) => {
  const { content } = req.body;
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (message.type !== 'text') return res.status(400).json({ message: 'Can only edit text messages' });
    await message.update({ content, isEdited: true });
    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  const { deleteFor } = req.body;
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (deleteFor === 'everyone') {
      if (message.senderId !== req.user.id)
        return res.status(403).json({ message: 'Only sender can delete for everyone' });
      await message.update({ deletedForEveryone: true, content: null, fileUrl: null });
    } else {
      await message.update({ deletedForSender: true });
    }
    res.json({ message: 'Message deleted', deleteFor });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reactToMessage = async (req, res) => {
  const { emoji } = req.body;
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    const reactions = message.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(req.user.id);
    if (idx > -1) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(req.user.id);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    await message.update({ reactions });
    res.json({ reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};




// forward message API

// exports.forwardMessage = async (req, res) => {
//   try {
//     const { messageId, receiverId } = req.body;

//     const originalMsg = await Message.findByPk(messageId);

//     if (!originalMsg) {
//       return res.status(404).json({ message: 'Message not found' });
//     }

//     const conv = await getOrCreateConversation(req.user.id, receiverId);

//     const newMsg = await Message.create({
//       conversationId: conv.id,
//       senderId: req.user.id,

//       // ✅ COPY EVERYTHING
//       content: originalMsg.content,
//       type: originalMsg.type,
//       fileUrl: originalMsg.fileUrl,
//       fileName: originalMsg.fileName,
//       fileSize: originalMsg.fileSize,

//       replyToId: null,
//       readBy: [req.user.id],
//     });

//     // await conv.update({ lastMessageId: newMsg.id, lastMessageAt: new Date() });

//     // res.status(201).json({ message: newMsg });

//     await conv.update({ lastMessageId: newMsg.id, lastMessageAt: new Date() });

//       // ✅ populate message (important for frontend UI)
//       const populated = await Message.findByPk(newMsg.id, {
//         include: [
//           { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
//           { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }] },
//         ],
//       });

//       // ✅ SOCKET EMIT (REALTIME FIX)
//       req.io.to(conv.id.toString()).emit('message:new', {
//         message: populated,
//         conversationId: conv.id,
//       });

//       // ✅ send response
//       res.status(201).json({ message: populated });

//   } catch (err) {
//     res.status(500).json({ message: 'Forward failed', error: err.message });
//   }
// };

exports.forwardMessage = async (req, res) => {
  try {
    const { messageId, receiverId } = req.body;

    const originalMsg = await Message.findByPk(messageId);
    if (!originalMsg) return res.status(404).json({ message: 'Message not found' });

    const conv = await getOrCreateConversation(req.user.id, receiverId);

    const newMsg = await Message.create({
      conversationId: conv.id,
      senderId: req.user.id,
      content: originalMsg.content,
      type: originalMsg.type,
      fileUrl: originalMsg.fileUrl,
      fileName: originalMsg.fileName,
      fileSize: originalMsg.fileSize,
      replyToId: null,
      readBy: [req.user.id],
    });

    await conv.update({ lastMessageId: newMsg.id, lastMessageAt: new Date() });

    const populated = await Message.findByPk(newMsg.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }] },
      ],
    });

    // ✅ FIX 1: emit to conversation room with correct prefix
    req.io.to(`conv:${conv.id}`).emit('message:new', {
      message: populated,
      conversationId: conv.id,
    });

    // ✅ FIX 2: emit directly to receiver's socket (guaranteed delivery)
    onlineUsers.get(Number(receiverId))?.forEach(socketId => {
      req.io.to(socketId).emit('message:new', {
        message: populated,
        conversationId: conv.id,
      });
    });

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ message: 'Forward failed', error: err.message });
  }
};




