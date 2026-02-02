import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface SignaturePadRef {
    clear: () => void;
    getSignature: () => string | null;
}

interface SignaturePadProps {
    width?: number;
    height?: number;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ width = 400, height = 200 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number, y: number } | null>(null);

    const getCtx = () => canvasRef.current?.getContext('2d');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = getCtx();
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = '#000000'; // Change signature color to black
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, [width, height]);

    const getMousePos = (e: MouseEvent | TouchEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        if (e instanceof MouseEvent) {
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        if (e.touches[0]) {
             return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return null;
    };
    
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        const pos = getMousePos(e.nativeEvent);
        lastPos.current = pos;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        const ctx = getCtx();
        const pos = getMousePos(e.nativeEvent);
        if (ctx && pos && lastPos.current) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPos.current = pos;
        }
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawing.current = false;
        lastPos.current = null;
    };
    
    useImperativeHandle(ref, () => ({
        clear: () => {
            const ctx = getCtx();
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        },
        getSignature: () => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const ctx = getCtx();
            if(!ctx) return null;
            // Check if canvas is blank
            const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
            const isBlank = !pixelBuffer.some(color => color !== 0);
            if (isBlank) return null;

            return canvas.toDataURL('image/png');
        }
    }));

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="bg-gray-200 rounded-md cursor-crosshair touch-none border border-gray-400"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />
    );
});

export default SignaturePad;
