import { GAME_WIDTH, GAME_HEIGHT, PLAYER_RADIUS, SPAWN_MARGIN, PLAYER_SPEED, ENEMY_BASE_SPEED } from '../constants';
import { Player, Enemy, Particle } from '../types';

export class GameEngine {
    player: Player;
    enemies: Enemy[];
    particles: Particle[];
    startTime: number;
    deathCount: number;
    isActive: boolean;
    onGameOver: (time: number, deaths: number) => void;
    onUpdateScore: (time: number, deaths: number) => void;

    constructor(onGameOver: (time: number, deaths: number) => void, onUpdateScore: (time: number, deaths: number) => void) {
        this.onGameOver = onGameOver;
        this.onUpdateScore = onUpdateScore;
        this.enemies = [];
        this.particles = [];
        this.deathCount = 0;
        this.startTime = 0;
        this.isActive = false;
        
        this.player = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            targetX: GAME_WIDTH / 2,
            targetY: GAME_HEIGHT / 2,
            radius: PLAYER_RADIUS,
            speed: PLAYER_SPEED,
            color: "#00ffff",
            moving: false
        };
    }

    start() {
        this.isActive = true;
        this.enemies = [];
        this.particles = [];
        this.deathCount = 0;
        this.startTime = Date.now();
        
        this.player.x = GAME_WIDTH / 2;
        this.player.y = GAME_HEIGHT / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.player.moving = false;
    }

    setTarget(x: number, y: number) {
        // Clamp target so the player ball stays fully within the screen (accounting for radius)
        const r = this.player.radius;
        this.player.targetX = Math.max(r, Math.min(GAME_WIDTH - r, x));
        this.player.targetY = Math.max(r, Math.min(GAME_HEIGHT - r, y));
        this.player.moving = true;
    }

    stopMoving() {
        this.player.moving = false;
    }

    spawnEnemy(difficulty: number) {
        const r = 28 + Math.random() * 8;
        let x = 0, y = 0;
        const side = Math.floor(Math.random() * 4);

        if (side === 0) { x = Math.random() * GAME_WIDTH; y = -SPAWN_MARGIN; }
        else if (side === 1) { x = GAME_WIDTH + SPAWN_MARGIN; y = Math.random() * GAME_HEIGHT; }
        else if (side === 2) { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + SPAWN_MARGIN; }
        else if (side === 3) { x = -SPAWN_MARGIN; y = Math.random() * GAME_HEIGHT; }

        const angle = Math.atan2(this.player.y - y, this.player.x - x);
        const speed = ENEMY_BASE_SPEED + (difficulty * 0.4) + (Math.random() * 2);

        this.enemies.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: r
        });
    }

    createExplosion(x: number, y: number, color: string) {
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: color
            });
        }
    }

    update() {
        if (!this.isActive && this.particles.length === 0) return;

        const currentTime = (Date.now() - this.startTime) / 1000;
        
        // Notify score update only if active
        if (this.isActive) {
             this.onUpdateScore(currentTime, this.deathCount);
        }

        const difficulty = 1 + Math.floor(currentTime / 10);

        // Player Movement
        if (this.player.moving) {
            const dx = this.player.targetX - this.player.x;
            const dy = this.player.targetY - this.player.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 1) {
                const step = Math.min(this.player.speed, dist);
                this.player.x += (dx / dist) * step;
                this.player.y += (dy / dist) * step;
            }
        }

        // Enemy Spawn
        if (this.isActive && Math.random() < 0.04 + (difficulty * 0.005)) {
            this.spawnEnemy(difficulty);
        }

        // Enemies Update
        const destroyLimit = 100;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.x += e.vx;
            e.y += e.vy;

            // Collision
            const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
            if (this.isActive && dist < this.player.radius + e.r - 2) {
                this.createExplosion(this.player.x, this.player.y, this.player.color);
                this.isActive = false;
                this.onGameOver(currentTime, this.deathCount);
            }

            // Out of bounds
            if (e.x < -destroyLimit || e.x > GAME_WIDTH + destroyLimit ||
                e.y < -destroyLimit || e.y > GAME_HEIGHT + destroyLimit) {
                this.enemies.splice(i, 1);
                if (this.isActive) {
                    this.deathCount++;
                }
            }
        }

        // Particles Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}