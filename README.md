# 💬 ChatApp — Full-Stack Real-Time Messaging

A WhatsApp-like chat application built with the **MERN stack + MySQL + Sequelize ORM**, featuring real-time messaging, voice/video calls, and a sleek dark UI.

---

## ✨ Features

### Authentication
- ✅ Register with username, email, password, confirm password
- ✅ Login / Logout with JWT
- ✅ Protected routes

### Profile
- ✅ Profile modal (view own + edit own: username, bio, phone, avatar)
- ✅ Email is view-only (cannot be edited)
- ✅ Other users see profile in view-only mode
- ✅ Change password from own profile
- ✅ Avatar upload with preview

### Friend System
- ✅ Search users by username/email
- ✅ Send / Cancel friend requests
- ✅ Accept / Reject friend requests
- ✅ Pending requests count badge
- ✅ Friends list tab

### Messaging
- ✅ Real-time messages via Socket.io
- ✅ Text, image, file, voice, video messages
- ✅ Typing indicator (animated dots)
- ✅ Online / Offline status
- ✅ Last seen timestamp
- ✅ Unread message count badge per conversation
- ✅ Message read receipts (double tick, colored when read)
- ✅ Reply to messages
- ✅ Edit message (own text messages)
- ✅ Delete for me / Delete for everyone
- ✅ Emoji reactions (toggle on/off)
- ✅ Emoji picker in input
- ✅ File & image upload (up to 50MB)
- ✅ Voice message recording (hold mic button)
- ✅ Date separators in chat
- ✅ Message grouping by sender
- ✅ Context menu per message

### Calls
- ✅ Voice call (WebRTC peer-to-peer)
- ✅ Video call (WebRTC peer-to-peer)
- ✅ Incoming call screen (accept / reject)
- ✅ Mic toggle, camera toggle, speaker toggle
- ✅ Call duration timer
- ✅ End call

### UI/UX
- ✅ Full dark theme (deep navy/black palette)
- ✅ Tailwind CSS
- ✅ Responsive (mobile sidebar + chat toggle)
- ✅ Toast notifications
- ✅ Smooth animations
- ✅ Gradient accents, glow effects

---

## 🛠 Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, React Router v6         |
| Styling    | Tailwind CSS, CSS Variables       |
| State      | Context API (Auth + Chat)         |
| Realtime   | Socket.io (client + server)       |
| Calls      | WebRTC (native browser API)       |
| Backend    | Node.js, Express.js               |
| Database   | MySQL 8+                          |
| ORM        | Sequelize v6                      |
| Auth       | JWT (jsonwebtoken), bcryptjs      |
| Uploads    | Multer                            |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+ running locally
- npm or yarn

---

### 1. Clone & Install

```bash
# Clone the project
git clone <your-repo-url>
cd chatapp

# Install all dependencies (root + server + client)
npm run install:all
```

---

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chatapp
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

---

### 3. Create MySQL Database

```sql
CREATE DATABASE chatapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Sequelize will auto-create all tables on first run (`sync: alter`).

---

### 4. Run Development Servers

```bash
# From root — runs both server (port 5000) and client (port 3000)
npm run dev
```

Or separately:

```bash
# Server only
npm run dev:server

# Client only
npm run dev:client
```

---

### 5. Open App

```
http://localhost:3000
```

Register two accounts in different browser windows to test messaging, calls, and friend requests.

---

## 📁 Project Structure

```
chatapp/
├── server/
│   ├── config/
│   │   └── database.js          # Sequelize MySQL connection
│   ├── models/
│   │   ├── User.js              # User model (auth, profile, online)
│   │   ├── FriendRequest.js     # Friend request model
│   │   ├── Conversation.js      # Conversation model
│   │   ├── Message.js           # Message model (full features)
│   │   └── index.js             # Associations + sync
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile, password
│   │   ├── friendController.js  # Search, send/accept/reject requests
│   │   └── messageController.js # CRUD messages, reactions
│   ├── middleware/
│   │   ├── auth.js              # JWT middleware
│   │   └── upload.js            # Multer file upload
│   ├── routes/
│   │   └── index.js             # All API routes
│   ├── socket/
│   │   └── index.js             # Socket.io events handler
│   ├── uploads/                 # Uploaded files (auto-created)
│   ├── .env.example
│   └── index.js                 # Express + Socket.io server
│
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── chat/
│   │   │   │   ├── Sidebar.jsx       # Conv list, friends, requests
│   │   │   │   ├── ChatWindow.jsx    # Main chat area
│   │   │   │   ├── MessageBubble.jsx # Msg with reactions/menu
│   │   │   │   └── MessageInput.jsx  # Text/file/voice input
│   │   │   ├── calls/
│   │   │   │   └── CallScreen.jsx    # Voice/video WebRTC
│   │   │   ├── profile/
│   │   │   │   └── ProfileModal.jsx  # Own edit / other view-only
│   │   │   └── ui/
│   │   │       ├── Avatar.jsx        # Avatar with initials fallback
│   │   │       └── Modal.jsx         # Reusable modal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Auth state + socket init
│   │   │   └── ChatContext.jsx       # Chat state + socket events
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Main layout
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── utils/
│   │   │   ├── api.js               # Axios instance
│   │   │   ├── socket.js            # Socket.io client
│   │   │   └── helpers.js           # Date, file, string helpers
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css               # Tailwind + custom styles
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json                    # Root scripts (concurrently)
└── README.md
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint              | Description         |
|--------|-----------------------|---------------------|
| POST   | /api/auth/register    | Register             |
| POST   | /api/auth/login       | Login                |
| GET    | /api/auth/me          | Get current user     |
| PUT    | /api/auth/profile     | Update profile       |
| PUT    | /api/auth/change-password | Change password  |

### Friends
| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| GET    | /api/users/search?q=        | Search users          |
| GET    | /api/users/:id              | Get user profile      |
| POST   | /api/friends/request        | Send friend request   |
| PUT    | /api/friends/request/:id    | Accept/Reject request |
| GET    | /api/friends/pending        | Get pending requests  |
| GET    | /api/friends                | Get friends list      |

### Messages
| Method | Endpoint                                    | Description          |
|--------|---------------------------------------------|----------------------|
| GET    | /api/conversations                          | Get all conversations|
| GET    | /api/conversations/:id/messages             | Get messages         |
| POST   | /api/messages                               | Send message/file    |
| PUT    | /api/messages/:id                           | Edit message         |
| DELETE | /api/messages/:id                           | Delete message       |
| POST   | /api/messages/:id/react                     | React to message     |

---

## 🔌 Socket Events

| Event              | Direction       | Description                    |
|--------------------|-----------------|--------------------------------|
| `user:online`      | Server → Client | User came online               |
| `user:offline`     | Server → Client | User went offline              |
| `message:send`     | Client → Server | Deliver message in real-time   |
| `message:new`      | Server → Client | New message received           |
| `message:edited`   | Bidirectional   | Message was edited             |
| `message:deleted`  | Bidirectional   | Message deleted for everyone   |
| `message:reaction` | Bidirectional   | Emoji reaction updated         |
| `typing:start`     | Client → Server | User started typing            |
| `typing:stop`      | Client → Server | User stopped typing            |
| `message:read`     | Client → Server | Messages marked as read        |
| `friend:request`   | Bidirectional   | Friend request sent            |
| `friend:response`  | Bidirectional   | Friend request accepted        |
| `call:initiate`    | Client → Server | Start a call (WebRTC offer)    |
| `call:incoming`    | Server → Client | Incoming call notification     |
| `call:answer`      | Client → Server | Answer call (WebRTC answer)    |
| `call:answered`    | Server → Client | Call was answered              |
| `call:reject`      | Client → Server | Reject incoming call           |
| `call:end`         | Client → Server | End active call                |
| `call:ice-candidate` | Bidirectional | WebRTC ICE candidate exchange  |

---

## 🎨 Customization

- **Colors**: Edit CSS variables in `client/src/index.css` under `:root`
- **Theme**: Change `--accent`, `--sent`, `--received` for different color schemes
- **Fonts**: Update Google Fonts import + `tailwind.config.js` fontFamily
- **Max file size**: Change in `server/middleware/upload.js` (`limits.fileSize`)
- **JWT expiry**: Change `JWT_EXPIRES_IN` in `.env`

---

## 🔒 Security Notes

- Never commit `.env` to version control
- Change `JWT_SECRET` to a strong random string in production
- Add rate limiting (e.g., `express-rate-limit`) for production
- Use HTTPS + WSS in production
- Configure CORS to your production domain only
- Consider adding refresh token rotation for production

---

## 📦 Build for Production

```bash
# Build React client
npm run build

# The build output is in client/build/
# Serve it via Express or a static hosting service

# In server/index.js add:
# app.use(express.static(path.join(__dirname, '../client/build')));
```

---

## 🐛 Troubleshooting

**MySQL connection error**: Ensure MySQL is running and credentials in `.env` match.

**Socket not connecting**: Check `CLIENT_URL` in server `.env` matches your React dev port.

**Camera/mic not working for calls**: WebRTC requires HTTPS in production. Use `localhost` for development.

**File uploads failing**: Ensure the `uploads/` directory is writable.
