const sequelize = require('../config/database');
const User = require('./User');
const FriendRequest = require('./FriendRequest');
const Conversation = require('./Conversation');
const Message = require('./Message');

// FriendRequest associations
FriendRequest.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
FriendRequest.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(FriendRequest, { as: 'sentRequests', foreignKey: 'senderId' });
User.hasMany(FriendRequest, { as: 'receivedRequests', foreignKey: 'receiverId' });

// Conversation associations
Conversation.belongsTo(User, { as: 'user1', foreignKey: 'user1Id' });
Conversation.belongsTo(User, { as: 'user2', foreignKey: 'user2Id' });

// Message associations
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Conversation.belongsTo(Message, { as: 'lastMessage', foreignKey: 'lastMessageId' });

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');
    await sequelize.sync();
    console.log('✅ Database synced');
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, User, FriendRequest, Conversation, Message, syncDatabase };
