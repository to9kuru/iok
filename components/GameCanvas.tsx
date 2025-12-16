import React, { useEffect, useRef, useState } from 'react';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameEngine } from '../game/GameEngine';

interface GameCanvasProps {
    engine: GameEngine;
    isPlaying: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ engine, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current || !canvasRef.current) return;
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            // Update Canvas size to full window
            canvasRef.current.width = winW;
            canvasRef.current.height = winH;

            // Calculate Scale for Fixed Resolution
            const scaleX = winW / GAME_WIDTH;
            const scaleY = winH / GAME_HEIGHT;
            const newScale = Math.min(scaleX, scaleY);
            
            const offX = (winW - GAME_WIDTH * newScale) / 2;
            const offY = (winH - GAME_HEIGHT * newScale) / 2;

            setScale(newScale);
            setOffset({ x: offX, y: offY });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Game Loop
    useEffect(() => {
        let animationId: number;
        const ctx = canvasRef.current?.getContext('2d');

        const render = () => {
            if (!ctx || !canvasRef.current) return;

            // 1. Update Logic
            engine.update();

            // 2. Render
            // Clear entire screen with WHITE (letterbox area)
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Set Game Coordinate System
            ctx.translate(offset.x, offset.y);
            ctx.scale(scale, scale);

            // Game Background (The active play area remains dark)
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // Draw Border to make edges visible against the white background
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // Draw Player
            ctx.shadowBlur = 20;
            ctx.shadowColor = engine.player.color;
            ctx.fillStyle = engine.player.color;
            ctx.beginPath();
            ctx.arc(engine.player.x, engine.player.y, engine.player.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw Enemies
            for (const e of engine.enemies) {
                ctx.fillStyle = "#ff3333";
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Particles
            for (const p of engine.particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // 3. Clipping (White bars overlay to cover spilling particles)
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = "#ffffff";
            // Top
            if (offset.y > 0) ctx.fillRect(0, 0, canvasRef.current.width, offset.y);
            // Bottom
            if (offset.y > 0) ctx.fillRect(0, offset.y + GAME_HEIGHT * scale, canvasRef.current.width, offset.y + 10); // +10 for safety
            // Left
            if (offset.x > 0) ctx.fillRect(0, 0, offset.x, canvasRef.current.height);
            // Right
            if (offset.x > 0) ctx.fillRect(offset.x + GAME_WIDTH * scale, 0, offset.x + 10, canvasRef.current.height);

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [engine, scale, offset]); // Re-bind if scale/engine changes

    // Input Handling
    const getGamePos = (clientX: number, clientY: number) => {
        return {
            x: (clientX - offset.x) / scale,
            y: (clientY - offset.y) / scale
        };
    };

    const handleStart = (clientX: number, clientY: number) => {
        const pos = getGamePos(clientX, clientY);
        engine.setTarget(pos.x, pos.y);
    };

    const handleMove = (clientX: number, clientY: number) => {
        const pos = getGamePos(clientX, clientY);
        engine.setTarget(pos.x, pos.y);
    };

    const handleEnd = () => {
        engine.stopMoving();
    };

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden">
            <canvas
                ref={canvasRef}
                className="block absolute top-0 left-0 touch-none"
                onMouseDown={(e) => isPlaying && handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => isPlaying && handleMove(e.clientX, e.clientY)}
                onMouseUp={() => isPlaying && handleEnd()}
                onTouchStart={(e) => {
                    if(!isPlaying) return;
                    e.preventDefault();
                    handleStart(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchMove={(e) => {
                    if(!isPlaying) return;
                    e.preventDefault();
                    handleMove(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchEnd={(e) => isPlaying && handleEnd()}
            />
        </div>
    );
};

export default GameCanvas;