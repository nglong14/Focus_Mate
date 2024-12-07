const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle room joining
    socket.on('joinRoom', (packet) => {
        const { roomName, username } = packet;
        socket.join(roomName);
        console.log(`User ${username} (${socket.id}) joined room: ${roomName}`);

        // Add the user to the room participants list
        if (!rooms[roomName]) rooms[roomName] = [];
        else{
            rooms[roomName] = rooms[roomName].filter((user) => user.userId !== socket.id);
        }
        rooms[roomName].push({ userId: socket.id, name: username });
        
        // Notify the room of the new participant
        socket.to(roomName).emit('userConnected', { userId: socket.id, name: username });
        socket.emit('setbackbtn', (rooms[roomName].length == 1));
        // Send the updated participants list to everyone in the room
        io.to(roomName).emit('updateParticipants', rooms[roomName]);
    });

    // Handle new messages
    socket.on('newMessage', (message) => {
        const roomName = message.roomName; // You may need to include roomName in the message
        console.log(message);
        socket.to(roomName).emit('newMessage', message); // Send message to the room
    });

    socket.on('changeBack', (packet) => {
        console.log(packet);
        socket.broadcast.to(packet.roomName).emit('changeBack', packet.url);
    });

    // Handle room leaving
    socket.on('leaveRoom', (packet) => {
        console.log(`User ${socket.id} left room: ${packet.roomName}`);
        if (rooms[packet.roomName]) {
            const isHost = rooms[packet.roomName][0]?.userId === socket.id; // Check if the user is the host
    
            // Remove the user from the room
            rooms[packet.roomName] = rooms[packet.roomName].filter((user) => user.userId !== socket.id);
            console.log(rooms[packet.roomName]);
    
            // Update participants for everyone in the room
            // socket.emit('userDisconnected', { userId: socket.id, name: packet.username });
            console.log(isHost);
            if (isHost) {
                console.log(`Host ${socket.id} has left. Terminating room: ${packet.roomName}`);
                // Notify all participants to leave
                console.log(`Emitting hostLeaving for room: ${packet.roomName}`);
                // Notify all participants (except the host) to leave the room
                socket.broadcast.to(packet.roomName).emit('endnow'); // Send 'endnow' to everyone except the host
                // Clear the room's participant list
                delete rooms[packet.roomName];
            }
            socket.broadcast.to(packet.roomName).emit('updateParticipants', rooms[packet.roomName]);
            socket.emit('hostLeaving', {roomName: packet.roomName, ishost: isHost});
        }
        socket.leave(packet.roomName);
    });
    
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
