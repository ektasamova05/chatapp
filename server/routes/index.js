const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const authController = require('../controllers/authController');
const friendController = require('../controllers/friendController');
const messageController = require('../controllers/messageController');

// ── Auth Routes ──────────────────────────────────────────
router.post('/auth/register', [
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], authController.register);

router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

router.get('/auth/me', authMiddleware, authController.getMe);
router.put('/auth/profile', authMiddleware, upload.single('avatar'), authController.updateProfile);
router.put('/auth/change-password', authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], authController.changePassword);

// ── Friend/User Routes ────────────────────────────────────
router.get('/users/search', authMiddleware, friendController.searchUsers);
router.get('/users/:id', authMiddleware, friendController.getUserProfile);
router.post('/friends/request', authMiddleware, friendController.sendRequest);
router.put('/friends/request/:id', authMiddleware, friendController.respondRequest);
router.get('/friends/pending', authMiddleware, friendController.getPendingRequests);
router.get('/friends', authMiddleware, friendController.getFriends);

// ── Message Routes ────────────────────────────────────────
router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/conversations/:conversationId/messages', authMiddleware, messageController.getMessages);
router.post('/messages', authMiddleware, upload.single('file'), messageController.sendMessage);
router.post('/messages/forward', authMiddleware, messageController.forwardMessage); // new add


// ✅ These MUST be before /messages/:id to avoid Express treating
// 'missed-call' and 'ended-call' as :id params
router.post('/messages/missed-call', authMiddleware, messageController.saveMissedCall);
router.post('/messages/ended-call', authMiddleware, messageController.saveEndedCall);

router.put('/messages/:id', authMiddleware, messageController.editMessage);
router.delete('/messages/:id', authMiddleware, messageController.deleteMessage);
router.post('/messages/:id/react', authMiddleware, messageController.reactToMessage);

module.exports = router;


