const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// Store drawing history
let drawingHistory = [];

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Send existing drawing history to the newly connected client
    socket.emit('drawingHistory', drawingHistory);

    socket.on('draw', (data) => {
        // Add the new drawing data to the history
        drawingHistory.push(data);

        // Broadcast the drawing data to other clients
        socket.broadcast.emit('draw', data);
    });

    // Handle request for drawing history (optional if you're emitting history right after connection)
    socket.on('getDrawingHistory', () => {
        socket.emit('drawingHistory', drawingHistory);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(3001, () => {
    console.log('listening on *:3001');
});
