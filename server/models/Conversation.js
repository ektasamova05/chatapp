const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user1Id: { type: DataTypes.UUID, allowNull: false },
  user2Id: { type: DataTypes.UUID, allowNull: false },
  lastMessageId: { type: DataTypes.UUID, defaultValue: null },
  lastMessageAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'conversations',
  indexes: [{ unique: true, fields: ['user1Id', 'user2Id'] }],
});

module.exports = Conversation;
