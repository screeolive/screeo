import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // You can update this with your production frontend URL
        origin: ["http://localhost:3000", "https://webrtc-shubh.vercel.app"],
        methods: ["GET", "POST"]
    }
});

const userIdToSocketIdMap = new Map<string, string>();
const socketIdToUserIdMap = new Map<string, string>();
const rooms: Record<string, Set<string>> = {};

io.on('connection', (socket: Socket) => {
    console.log(`User connected with socket ID: ${socket.id}`);

    // --- UPDATED 'join-room' LOGIC ---
    socket.on('join-room', (roomId: string, userId: string) => {
        // Get a list of users already in the room BEFORE the new user joins.
        const usersInThisRoom = rooms[roomId] ? Array.from(rooms[roomId]) : [];

        // Associate userId with socket.id
        userIdToSocketIdMap.set(userId, socket.id);
        socketIdToUserIdMap.set(socket.id, userId);
        socket.join(roomId);

        // Initialize room if it's new
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(userId);

        console.log(`User ${userId} (Socket: ${socket.id}) joined room ${roomId}`);

        // **NEW:** Send the list of existing users to the new user.
        // The new user will initiate connections to them.
        socket.emit('existing-users', usersInThisRoom);

        // Notify everyone else in the room that a new user has connected.
        socket.to(roomId).emit('user-connected', userId);
    });

    // --- WebRTC Signaling Handlers (No changes needed here) ---
    socket.on('offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
        const fromUserId = socketIdToUserIdMap.get(socket.id);
        const targetSocketId = userIdToSocketIdMap.get(data.to);
        if (targetSocketId && fromUserId) {
            io.to(targetSocketId).emit('offer', { offer: data.offer, from: fromUserId });
        }
    });

    socket.on('answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
        const fromUserId = socketIdToUserIdMap.get(socket.id);
        const targetSocketId = userIdToSocketIdMap.get(data.to);
        if (targetSocketId && fromUserId) {
            io.to(targetSocketId).emit('answer', { answer: data.answer, from: fromUserId });
        }
    });

    socket.on('ice-candidate', (data: { to: string; candidate: RTCIceCandidateInit }) => {
        const fromUserId = socketIdToUserIdMap.get(socket.id);
        const targetSocketId = userIdToSocketIdMap.get(data.to);
        if (targetSocketId && fromUserId) {
            io.to(targetSocketId).emit('ice-candidate', { candidate: data.candidate, from: fromUserId });
        }
    });

    // Disconnect logic remains the same
    const handleDisconnect = () => {
        const disconnectedUserId = socketIdToUserIdMap.get(socket.id);
        if (disconnectedUserId) {
            console.log(`User ${disconnectedUserId} (Socket: ${socket.id}) disconnected.`);
            userIdToSocketIdMap.delete(disconnectedUserId);
            socketIdToUserIdMap.delete(socket.id);
            for (const roomId in rooms) {
                if (rooms[roomId].has(disconnectedUserId)) {
                    rooms[roomId].delete(disconnectedUserId);
                    socket.to(roomId).emit('user-disconnected', disconnectedUserId);
                    if (rooms[roomId].size === 0) {
                        delete rooms[roomId];
                        console.log(`Room ${roomId} is now empty and has been deleted.`);
                    }
                }
            }
        }
    };

    socket.on('leave-room', handleDisconnect);
    socket.on('disconnect', handleDisconnect);
});

const PORT = process.env.SIGNALING_PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ Signaling server running on port ${PORT}`);
});
