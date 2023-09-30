const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const ShareDB = require('sharedb');
const ShareDBMongo = require('sharedb-mongo');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Create a single ShareDB instance that will handle multiple client connections
const backend = new ShareDB({
    // lets use the ShareDBMongo database adapter
    // provide "mongodb" as the scheme for the connection string URI
  db: ShareDBMongo('mongodb://localhost:27017/drawingDB')
});

// Create a WebSocket server and bind it to the Express HTTP server.
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Create a ShareDB connection for this WebSocket connection.
    const shareDBConnection = backend.connect();

    // Fetch or create our shared document.
    const doc = shareDBConnection.get('canvas', 'sharedCanvas');

    doc.fetch((err) => {
        if (err) throw err;

        if (doc.type === null) {
            doc.create({ operations: [] }, (createErr) => {
                if (createErr) throw createErr;

                // Send the current state to the connected client.
                ws.send(JSON.stringify({ type: 'drawingHistory', data: doc.data.operations }));
            });
        } else {
            // If the document already exists, send its current state to the connected client.
            ws.send(JSON.stringify({ type: 'drawingHistory', data: doc.data.operations }));
        }
    });

    ws.on('message', (message) => {
        const { type, data } = JSON.parse(message);

        if (type === 'draw') {
            // Update the shared document with the new drawing operation.
            doc.submitOp([{ p: ['operations', doc.data.operations.length], li: data }]);

            // Broadcast the drawing data to other clients.
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'draw', data }));
                }
            });
        } else if (type === 'getDrawingHistory') {
            ws.send(JSON.stringify({ type: 'drawingHistory', data: doc.data.operations }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(3001, () => {
    console.log('listening on *:3001');
});
