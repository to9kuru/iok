// Game Types
export interface Point {
    x: number;
    y: number;
}

export interface Player {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    radius: number;
    speed: number;
    color: string;
    moving: boolean;
}

export interface Enemy {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

export enum GameState {
    MENU,
    PLAYING,
    GAME_OVER,
    LEADERBOARD
}

// PlayFab Types (Simplified)
export interface PlayFabLoginResult {
    SessionTicket?: string;
    PlayFabId?: string;
}

export interface PlayFabError {
    errorMessage: string;
}

export interface LeaderboardEntry {
    PlayFabId: string;
    DisplayName?: string;
    StatValue: number;
    Position: number;
}

export interface GetLeaderboardResult {
    Leaderboard: LeaderboardEntry[];
}

// Global declaration for the injected script
declare global {
    interface Window {
        PlayFab: any;
        PlayFabClientSDK: any;
    }
}