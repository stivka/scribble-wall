import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';
import concreteWall from './images/concrete-wall.jpg';
import ShareDB from 'sharedb/lib/client';

const Canvas = () => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const socket = io.connect('http://localhost:3001');
    let doc = null;

    useEffect(() => {
        const canvas = canvasRef.current;
        ctxRef.current = canvas.getContext('2d');

        const background = new Image();
        background.src = concreteWall; 
        background.onload = function() {
            ctxRef.current.drawImage(background, 0, 0);
        }

        // Initialize ShareDB's connection
        const connection = new ShareDB.Connection(socket);
        doc = connection.get('drawings', 'canvas'); // 'drawings' is the collection and 'canvas' is the document id

        // When the document's data updates, redraw the canvas
        doc.subscribe((err) => {
            if (err) throw err;
            drawCanvasFromData(doc.data);
        });

        doc.on('op', (op) => {
            drawCanvasFromData(doc.data);
        });

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mousemove', draw);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mousemove', draw);
        };
    }, []);

    // we save the entire canvas state as ImageData to the document
    // this should be changed to send only the differential changes
    const drawCanvasFromData = (data) => {
        // Use the data from ShareDB's document to redraw the canvas. 
        // For simplicity, the data can be an imageData object.
        if (data && data.imageData) {
            ctxRef.current.putImageData(data.imageData, 0, 0);
        }
    };

    let drawing = false;

    const startDrawing = (event) => {
        drawing = true;
        ctxRef.current.moveTo(event.clientX - canvasRef.current.offsetLeft, event.clientY - canvasRef.current.offsetTop);
    };

    const stopDrawing = () => {
        drawing = false;
        ctxRef.current.beginPath();
        const imageData = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        doc.submitOp([{ p: ['imageData'], oi: imageData }]);
    };

    const draw = (event) => {
        if (!drawing) return;
        const canvas = canvasRef.current;
        ctxRef.current.lineWidth = 5;
        ctxRef.current.lineCap = 'round';
        ctxRef.current.strokeStyle = 'black';
        
        ctxRef.current.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop); 
        ctxRef.current.stroke();
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    };

    return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />;
};

export default Canvas;
