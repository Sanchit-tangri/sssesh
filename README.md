# ✨ SSSESH: Real-Time Jamming Platform

SSSESH is a real-time collaborative jamming platform built using the **MERN stack** and **WebSockets**. Designed to break down the barriers of traditional music streaming, SSSESH allows users to create and join interactive music rooms where they can listen, chat, and control playback together seamlessly—without premium access restrictions.

---

## 🚀 Key Features

* **Real-Time Music Sync:** Instantaneous synchronization of play, pause, and seek actions across all users in a room using Socket.io.
* **Host-Controlled Rooms:** Public and private room creation with a robust join-request system. Hosts retain full control over playback and user permissions.
* **Live Interaction:** Integrated real-time chat with ephemeral (temporary and secure) messaging alongside the active music session.
* **Immersive & Modern UI:** A highly visual, dark-themed aesthetic with neon and glow accents. The interface steps away from standard layouts, utilizing a distinct floating pill design and glassmorphism effects for a seamless, "vibey" user experience.
* **Personalized Ecosystem:** Users can like songs, maintain persistent preferences, and receive personalized recommendations stored securely in the database.
* **Scalable Architecture:** Designed for low-latency streaming and horizontal scaling to support large group sessions efficiently.

---

## 🛠️ Technology Stack

**Frontend:**
* React.js (Web)
* React Native (Mobile App)
* Tailwind CSS
* Socket.io Client

**Backend & Real-Time Sync:**
* Node.js
* Express.js
* Socket.io (WebSockets)

**Database & Security:**
* MongoDB (NoSQL)
* JWT Authentication (HTTP-only cookies)
* End-to-End Encryption for sensitive data

**APIs:**
* Open Music APIs / YouTube API integration

---

## 🏗️ System Architecture

The system follows a real-time client-server architecture:
1. **User Interaction:** The user interacts with the React frontend.
2. **Authentication:** Backend validates credentials and issues a secure JWT.
3. **Room Connection:** User creates or joins a room, establishing a WebSocket connection.
4. **Event Broadcasting:** Play, pause, seek, and chat events are broadcasted instantly.
5. **State Synchronization:** The Node.js/Express backend syncs the state across all connected clients.
6. **Data Persistence:** User preferences, chat logs, and room data are stored and retrieved from MongoDB.

---

## ⚙️ Installation & Local Setup

To run SSSESH locally, follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/Sanchit-tangri/sssesh.git](https://github.com/Sanchit-tangri/sssesh.git)
cd sssesh
