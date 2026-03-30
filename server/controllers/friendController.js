const { Op } = require('sequelize');
const { User, FriendRequest, Conversation } = require('../models');

exports.searchUsers = async (req, res) => {
  const { q } = req.query;
  try {
    const users = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: req.user.id } },
          {
            [Op.or]: [
              { username: { [Op.like]: `%${q}%` } },
              { email: { [Op.like]: `%${q}%` } },
            ],
          },
        ],
      },
      attributes: ['id', 'username', 'avatar', 'bio', 'isOnline', 'lastSeen'],
      limit: 20,
    });

    // Get request status for each user
    const results = await Promise.all(users.map(async (u) => {
      const req1 = await FriendRequest.findOne({
        where: {
          [Op.or]: [
            { senderId: req.user.id, receiverId: u.id },
            { senderId: u.id, receiverId: req.user.id },
          ],
        },
      });
      return {
        ...u.toJSON(),
        friendStatus: req1 ? req1.status : null,
        requestId: req1 ? req1.id : null,
        isSender: req1 ? req1.senderId === req.user.id : null,
      };
    }));

    res.json({ users: results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'avatar', 'bio', 'phone', 'isOnline', 'lastSeen', 'createdAt'],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.sendRequest = async (req, res) => {
  const { receiverId } = req.body;
  try {
    if (receiverId === req.user.id)
      return res.status(400).json({ message: 'Cannot send request to yourself' });

    const existing = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });
    if (existing) return res.status(400).json({ message: 'Request already exists' });

    const request = await FriendRequest.create({ senderId: req.user.id, receiverId });
    const populated = await FriendRequest.findByPk(request.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
    });
    res.status(201).json({ request: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.respondRequest = async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'
  try {
    const request = await FriendRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiverId !== req.user.id)
      return res.status(403).json({ message: 'Unauthorized' });

    await request.update({ status });

    if (status === 'accepted') {
      const [u1, u2] = [request.senderId, request.receiverId].sort();
      await Conversation.findOrCreate({
        where: { user1Id: u1, user2Id: u2 },
        defaults: { user1Id: u1, user2Id: u2 },
      });
    }

    res.json({ request, message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.findAll({
      where: { receiverId: req.user.id, status: 'pending' },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'bio'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const accepted = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ senderId: req.user.id }, { receiverId: req.user.id }],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isOnline', 'lastSeen', 'bio'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar', 'isOnline', 'lastSeen', 'bio'] },
      ],
    });

    const friends = accepted.map((r) =>
      r.senderId === req.user.id ? r.receiver : r.sender
    );
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
