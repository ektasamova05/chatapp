const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User } = require('../models');
const { validationResult } = require('express-validator');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const deleteAvatarFile = (avatarPath) => {
  if (!avatarPath || typeof avatarPath !== 'string' || !avatarPath.startsWith('/uploads/')) return;

  const normalizedPath = avatarPath.replace(/^\/+/, '');
  const absolutePath = path.join(__dirname, '..', normalizedPath);

  fs.promises.unlink(absolutePath).catch(() => {});
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password } = req.body;
  try {
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const usernameTaken = await User.findOne({ where: { username } });
    if (usernameTaken) return res.status(400).json({ message: 'Username already taken' });

    const user = await User.create({ username, email, password });
    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.updateProfile = async (req, res) => {
  const { username, bio, phone, removeAvatar } = req.body;
  try {
    if (username && username !== req.user.username) {
      const taken = await User.findOne({ where: { username } });
      if (taken) return res.status(400).json({ message: 'Username already taken' });
    }

    const updates = {};
    const shouldRemoveAvatar = removeAvatar === 'true' || removeAvatar === true;
    const previousAvatar = req.user.avatar;

    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (phone !== undefined) updates.phone = phone;
    if (req.file) updates.avatar = `/${req.file.path.replace(/\\/g, '/')}`;
    else if (shouldRemoveAvatar) updates.avatar = null;

    await req.user.update(updates);
    if ((req.file || shouldRemoveAvatar) && previousAvatar && previousAvatar !== req.user.avatar) {
      deleteAvatarFile(previousAvatar);
    }
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const valid = await req.user.comparePassword(currentPassword);
    if (!valid) return res.status(400).json({ message: 'Current password incorrect' });

    await req.user.update({ password: newPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
