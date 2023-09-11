import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';
import concreteWall from './images/concrete-wall.jpg';

const Canvas = () => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null); // Use useRef for the context
    const socket = io.connect('http://localhost:3001');

    useEffect(() => {
        const canvas = canvasRef.current;
        ctxRef.current = canvas.getContext('2d');

        const background = new Image();
        background.src = concreteWall; 
        background.onload = function() {
            ctxRef.current.drawImage(background, 0, 0);
        }

        socket.on('draw', (data) => {
            drawOnCanvas(data, ctxRef.current);
        });

        // Listen to drawing history from the server
        socket.on('drawingHistory', (history) => {
            history.forEach(data => drawOnCanvas(data, ctxRef.current));
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

    let drawing = false;

    const startDrawing = (event) => {
        drawing = true;
        ctxRef.current.moveTo(event.clientX - canvasRef.current.offsetLeft, event.clientY - canvasRef.current.offsetTop);
    };

    const stopDrawing = () => {
        drawing = false;
        ctxRef.current.beginPath();
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
    
        let data = {
            x: event.clientX - canvas.offsetLeft,
            y: event.clientY - canvas.offsetTop
        };
    
        socket.emit('draw', data);
    };
    
    const drawOnCanvas = (data, ctx) => {
        ctx.beginPath(); // Start a new path here
        ctx.moveTo(data.x, data.y); // Move to the current position
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    };

    return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />;
};

export default Canvas;
