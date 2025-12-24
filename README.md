# WebRTC Video Calling App

A real-time peer-to-peer video calling application built with WebRTC, Socket.IO, and Express.

## Features
- 🎥 Real-time video and audio calling
- 🎤 Toggle audio/video during call
- 🚪 Room-based connections (up to 2 users per room)
- 📱 Responsive design

## Tech Stack
- **Frontend:** Vanilla JavaScript, WebRTC API
- **Backend:** Node.js, Express, Socket.IO
- **Deployment:** Railway/Render

## Live Demo
[Your deployed URL here]

## Local Setup
\`\`\`bash
npm install
node server.js
\`\`\`
Visit `http://localhost:8080`

## How It Works
1. Enter a room name
2. Share the room name with another user
3. Start video calling!

## Architecture
- WebRTC for P2P video/audio streams
- Socket.IO for signaling (offer/answer/ICE candidates)
- STUN servers for NAT traversal