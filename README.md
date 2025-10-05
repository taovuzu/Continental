<a name="readme-top"></a>

[![Last commit][last-commit-shield]][last-commit-url] [![GitHub issues][issues-shield]][issues-url] [![Repo size][repo-size-shield]][repo-size-url][![License][license-shield]][license-url]

<div align="center">
  <table>
    <tr>
      <td align="center">
        <h1>Continental</h1>
        <p>Realtime collaborative video conferencing and workspace for teams.</p>
      </td>
    </tr>
  </table>
</div>

<details>
  <summary><strong>Table of Contents</strong></summary>
  <ol>
    <li><a href="#about-the-project">About the Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation-docker-recommended">Installation (Docker Recommended)</a></li>
        <li><a href="#installation-manual">Installation (Manual)</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#technical-details">Technical Details</a>
      <ul>
        <li><a href="#architecture-overview">Architecture Overview</a></li>
        <li><a href="#technology-stack">Technology Stack</a></li>
        <li><a href="#database-schema">Database Schema</a></li>
        <li><a href="#api-endpoints">API Endpoints</a></li>
        <li><a href="#processing-flow">Processing Flow</a></li>
        <li><a href="#security-features">Security Features</a></li>
        <li><a href="#performance-optimizations">Performance Optimizations</a></li>
      </ul>
    </li>
    <li><a href="#future-plans">Future Plans</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About the Project

Continental is a modern, full-stack web application that provides realtime video conferencing, persistent collaboration rooms, and in-room messaging designed for teams and small organizations. The project combines a fast React + Vite frontend with a Node.js + Express backend and WebSocket-based signaling (Socket.IO-style) to coordinate WebRTC peer connections. Conversations, room metadata, and messages persist in a MongoDB datastore so teams can resume work and keep a history of collaboration.

Key benefits:
- Start and join secure video rooms quickly from the browser (no native app required).
- Real-time text chat and collaboration whitespace alongside live video.
- Persistent rooms and message history so teams can pick up where they left off.
- Designed to be extensible: plugins for recording, file sharing, and external integrations are straightforward to add.

[↥ Back to top](#readme-top)

## Built With

- [![React][React.js]][React-url] [![Vite][Vite.js]][Vite-url] [![Node.js][Node.js]][Node-url] [![Express][Express.js]][Express-url] [![Socket.IO][SocketIO.js]][SocketIO-url] [![WebRTC][WebRTC.js]][WebRTC-url] [![MongoDB][MongoDB.js]][MongoDB-url] [![Mongoose][Mongoose.js]][Mongoose-url] [![TailwindCSS][Tailwind.css]][Tailwind-url]

[↥ Back to top](#readme-top)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher)
- npm (v9+) or yarn/pnpm
- MongoDB (local instance or MongoDB Atlas)
- (Optional) Docker & Docker Compose for containerized development

[↥ Back to top](#readme-top)

### Installation (Docker Recommended)

1. Clone the repository

```bash
git clone https://github.com/taovuzu/Continental.git
cd Continental
```

2. Copy example environment files and edit values

```bash
cp server/env.example server/.env
cp client/src/.env client/src/.env
# Edit the .env files to set MONGO_URI, JWT_SECRET, and any WebRTC/STUN/TURN credentials.
```

3. Start services with Docker Compose (if you have a Compose file configured)

```bash
docker compose up --build
```

Note: If this repository does not include a docker-compose file, follow the manual steps below.

[↥ Back to top](#readme-top)

### Installation (Manual)

1. Start a MongoDB instance (localhost or Atlas)

2. Run the server

```bash
cd server
cp env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, PORT
npm install
npm run dev # or: node server.js
```

3. Run the client

```bash
cd client
cp .env.example .env || true
# Edit client/src/.env for API_URL if necessary
npm install
npm run dev
```

[↥ Back to top](#readme-top)

## Usage

Open the client app in your browser (typically http://localhost:5173 for Vite). Common workflows:

- Create an account or sign in.
- Create a collaboration room and invite teammates.
- Start a video call — the app performs signaling via the server to establish WebRTC peer connections.
- Use the in-room chat for text messages; messages are saved to the database and visible to new joiners.

<details>
  <summary>Example workflows</summary>

  1. Create and join a room

     - Login to the app
     - Click "Create Room" and give it a name
     - Share the room link with teammates
     - Teammates open the link, grant camera/microphone permissions, and join

  2. Persistent chat

     - While in the room, open chat to see historical messages stored by the server
     - New messages are broadcast to all connected clients and persisted

  3. Reconnect flow

     - If a user's connection drops, they can refresh and reconnect to the same room; the client re-establishes the signaling channel and fetches recent history

</details>

[↥ Back to top](#readme-top)

## Technical Details

<details>
  <summary>Architecture Overview</summary>

  The project follows a client-server architecture:

  - Client: React + Vite single-page app that handles UI, user interactions, and WebRTC peer connections.
  - Server: Node.js + Express application that provides REST APIs (auth, user, rooms, messages) and a WebSocket-based signaling layer for WebRTC (socket handlers live in `socket/` and `websocket/`).
  - Database: MongoDB for persistent storage of users, rooms, and messages.

  Key decisions:
  - Use WebSocket signaling instead of server-side media routing to keep server costs low; clients exchange SDP and ICE via the server.
  - Persist messages for auditability and to allow late joiners to see history.

</details>

<details>
  <summary>Technology Stack</summary>

  - Frontend: React (v18+), Vite, Tailwind CSS
  - Backend: Node.js (v18+), Express
  - Real-time / Signaling: WebSocket (Socket.IO-compatible handlers)
  - Database: MongoDB (v5/6), Mongoose ODM
  - Optional infra: Docker for containerization

</details>

<details>
  <summary>Database Schema</summary>

  Primary models (simplified):

  - User
    - _id: ObjectId
    - name: string
    - email: string (unique)
    - passwordHash: string
    - avatarUrl: string
    - createdAt, updatedAt

  - CollaborationRoom
    - _id: ObjectId
    - name: string
    - slug or shortId: string
    - isPrivate: boolean
    - owner: ObjectId (User)
    - participants: [ObjectId]
    - createdAt, updatedAt

  - CollaborationMessage
    - _id: ObjectId
    - roomId: ObjectId
    - sender: ObjectId (User)
    - text: string
    - metadata: object (e.g., attachments)
    - createdAt

</details>

<details>
  <summary>API Endpoints</summary>

  Authentication
  - POST /api/auth/register — Register a new user
  - POST /api/auth/login — Authenticate and return a JWT
  - GET /api/auth/me — Get current authenticated user

  Collaboration
  - GET /api/collaboration/rooms — List rooms (with pagination)
  - POST /api/collaboration/rooms — Create a room
  - GET /api/collaboration/rooms/:id — Get room details and recent messages
  - POST /api/collaboration/rooms/:id/messages — Post a new message (also broadcast via WebSocket)

  Users
  - GET /api/users/:id — Get public profile

  Real-time (WebSocket / Socket.IO)
  - connect() — Establish a socket connection
  - join-room { roomId } — Join a signaling room
  - signal { to, data } — Forward SDP/ICE signaling messages
  - message { roomId, text } — Broadcast chat messages

</details>

<details>
  <summary>Processing Flow</summary>

  Example: Starting a video call

  1. User creates or opens a room in the client.
  2. Client fetches room metadata and recent messages via REST APIs.
  3. Client opens a WebSocket connection and emits a "join-room" event.
  4. Signaling: when peers join, they exchange SDP offers/answers and ICE candidates via the server's socket handlers until peer-to-peer WebRTC connections are established.
  5. Media flows directly between peers; the server only handles signaling and message persistence.

</details>

<details>
  <summary>Security Features</summary>

  - JWT-based authentication for REST APIs and socket connections (token passed during socket handshake).
  - Passwords hashed with bcrypt/scrypt/argon2 (implementation detail — recommend bcrypt or argon2).
  - Input validation & sanitization on server endpoints.
  - CORS configuration to restrict allowed origins in production.
  - Rate limiting (recommended) on auth endpoints to reduce brute-force risk.

</details>

<details>
  <summary>Performance Optimizations</summary>

  Implemented:
  - Signaling-only server: media remains peer-to-peer, reducing server bandwidth needs.
  - MongoDB indexes on frequently queried fields (e.g., roomId, createdAt for messages).
  - Pagination for listing rooms and messages.

  Planned:
  - Redis adapter for Socket.IO to support horizontal scaling across multiple server instances.
  - TURN server integration for improved connectivity in restrictive networks.
  - CDN for serving static assets (client build) and caching of public resources.

</details>

[↥ Back to top](#readme-top)

## Future Plans

- Performance Enhancements
  - Add Redis-based pub/sub and Socket.IO adapter for multi-instance scaling.
  - Integrate TURN servers and upgrade NAT traversal reliability.

- Business Features
  - Recording & playback for meetings.
  - File sharing and collaborative whiteboard.
  - Third-party OAuth providers (Google, Microsoft).

- Infrastructure & Security
  - Automated CI/CD pipelines and production-ready Helm charts or Terraform modules.
  - Enterprise SSO & granular permissions for rooms.

- Developer Experience
  - Better developer docs and an end-to-end test suite for signaling flows.

[↥ Back to top](#readme-top)

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a branch: git checkout -b feature/my-feature
3. Make your changes and commit them: git commit -m "feat: add awesome feature"
4. Push to your branch: git push origin feature/my-feature
5. Open a Pull Request describing your changes and link any related issues

Please follow existing code style, include tests for new behavior where possible, and run lints before opening a PR.

[↥ Back to top](#readme-top)

## License

Distributed under the MIT License. See `LICENSE` for more information.

[↥ Back to top](#readme-top)

## Acknowledgments

<details>
  <summary>Third-party libraries and resources</summary>

  - Core Technologies: React, Vite, Node.js, Express, MongoDB
  - Real-time and WebRTC resources and tutorials
  - Design inspirations: Tailwind UI and community component libraries

</details>

[↥ Back to top](#readme-top)

<!-- Badge references -->
[last-commit-shield]: https://img.shields.io/github/last-commit/taovuzu/Continental.svg
[last-commit-url]: https://github.com/taovuzu/Continental/commits/main
[issues-shield]: https://img.shields.io/github/issues/taovuzu/Continental.svg
[issues-url]: https://github.com/taovuzu/Continental/issues
[repo-size-shield]: https://img.shields.io/github/repo-size/taovuzu/Continental.svg
[repo-size-url]: https://github.com/taovuzu/Continental
[license-shield]: https://img.shields.io/github/license/taovuzu/Continental.svg
[license-url]: https://github.com/taovuzu/Continental/blob/main/LICENSE

<!-- Technology refs -->
[React.js]: https://img.shields.io/badge/React-18-blue.svg
[React-url]: https://reactjs.org/
[Vite.js]: https://img.shields.io/badge/Vite-4-brightgreen.svg
[Vite-url]: https://vitejs.dev/
[Node.js]: https://img.shields.io/badge/Node.js-18-green.svg
[Node-url]: https://nodejs.org/
[Express.js]: https://img.shields.io/badge/Express-4-lightgrey.svg
[Express-url]: https://expressjs.com/
[SocketIO.js]: https://img.shields.io/badge/Socket.IO-4-blue.svg
[SocketIO-url]: https://socket.io/
[WebRTC.js]: https://img.shields.io/badge/WebRTC-1-ff69b4.svg
[WebRTC-url]: https://webrtc.org/
[MongoDB.js]: https://img.shields.io/badge/MongoDB-6-green.svg
[MongoDB-url]: https://www.mongodb.com/
[Mongoose.js]: https://img.shields.io/badge/Mongoose-6-orange.svg
[Mongoose-url]: https://mongoosejs.com/
[Tailwind.css]: https://img.shields.io/badge/TailwindCSS-3-teal.svg
[Tailwind-url]: https://tailwindcss.com/
