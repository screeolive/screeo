import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://webrtc-shubh.vercel.app"],
        methods: ["GET", "POST"]
    }
});

// --- Maps for tracking users and their data ---
const userIdToSocketIdMap = new Map<string, string>();
const socketIdToUserIdMap = new Map<string, string>();
// **NEW**: Map to store usernames associated with user IDs
const userIdToUsernameMap = new Map<string, string>();
const rooms: Record<string, Set<string>> = {};

io.on('connection', (socket: Socket) => {
    console.log(`User connected with socket ID: ${socket.id}`);

    // --- UPDATED 'join-room' LOGIC ---
    // **FIX**: Now accepts `username` from the client
    socket.on('join-room', (roomId: string, userId: string, username: string) => {
        // Get a list of users already in the room BEFORE the new user joins.
        const usersInThisRoom = rooms[roomId] ? Array.from(rooms[roomId]) : [];
        const participantsInRoom = usersInThisRoom.map(id => ({
            id,
            username: userIdToUsernameMap.get(id) || 'Guest'
        }));

        // Associate userId with socket.id and username
        userIdToSocketIdMap.set(userId, socket.id);
        socketIdToUserIdMap.set(socket.id, userId);
        userIdToUsernameMap.set(userId, username); // **NEW**: Store username
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(userId);

        console.log(`User ${username} (${userId}) joined room ${roomId}`);

        // **FIX**: Send the list of existing participants (with usernames) to the new user.
        socket.emit('existing-users', participantsInRoom);

        // **FIX**: Notify everyone else, sending the new user's complete info.
        socket.to(roomId).emit('user-connected', { id: userId, username });
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

    // --- UPDATED Disconnect logic ---
    const handleDisconnect = () => {
        const disconnectedUserId = socketIdToUserIdMap.get(socket.id);
        if (disconnectedUserId) {
            console.log(`User ${disconnectedUserId} disconnected.`);
            // **NEW**: Clean up username map
            userIdToUsernameMap.delete(disconnectedUserId);
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
