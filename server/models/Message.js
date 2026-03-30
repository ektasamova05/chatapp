const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },

  conversationId: { 
    type: DataTypes.UUID, 
    allowNull: false 
  },

  senderId: { 
    type: DataTypes.UUID, 
    allowNull: false 
  },

  content: { 
    type: DataTypes.TEXT, 
    defaultValue: null 
  },

  type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'voice', 'video', 'system', 'missed_call', 'ended_call'),
    defaultValue: 'text',
  },
  
  // ✅ 'voice' or 'video' — used by missed_call and ended_call messages
  callType: {
    type: DataTypes.ENUM('voice', 'video'),
    defaultValue: null,
    allowNull: true,
  },

  fileUrl: { 
    type: DataTypes.STRING(500), 
    defaultValue: null 
  },

  fileName: { 
    type: DataTypes.STRING(255), 
    defaultValue: null 
  },

  fileSize: { 
    type: DataTypes.INTEGER, 
    defaultValue: null 
  },

  replyToId: { 
    type: DataTypes.UUID, 
    defaultValue: null 
  },

  isEdited: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },

  deletedForSender: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },

  deletedForEveryone: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },

  isRead: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },

  reactions: { 
    type: DataTypes.JSON, 
    defaultValue: {} 
  },
}, {
  tableName: 'messages',
});

module.exports = Message;


