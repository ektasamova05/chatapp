const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { len: [3, 50] },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
  bio: {
    type: DataTypes.STRING(300),
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING(20),
    defaultValue: null,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  socketId: {
    type: DataTypes.STRING(100),
    defaultValue: null,
  },
}, {
  tableName: 'users',

  // ✅ Explicit indexes
  indexes: [
    {
      name: 'users_username_unique',
      unique: true,
      fields: ['username'],
    },
    {
      name: 'users_email_unique',
      unique: true,
      fields: ['email'],
    },
  ],

  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.socketId;
  return values;
};

module.exports = User;