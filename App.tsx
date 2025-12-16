import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { GameEngine } from './game/GameEngine';
import { playFabService } from './services/playfabService';
import { GameState } from './types';
import { PLAYFAB_TITLE_ID } from './constants';

const App: React.FC = () => {
    // Game State
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [currentTime, setCurrentTime] = useState(0);
    const [deaths, setDeaths] = useState(0);
    const [finalScore, setFinalScore] = useState({ time: 0, deaths: 0 });
    const [playerName, setPlayerName] = useState("");
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [tempName, setTempName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    
    // Online Status for Debugging
    const [onlineStatus, setOnlineStatus] = useState<"connecting" | "connected" | "offline">("connecting");
    const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    
    // Engine Instance
    const engineRef = useRef<GameEngine | null>(null);

    // Callbacks for the engine
    const handleGameOver = useCallback((time: number, deaths: number) => {
        setFinalScore({ time, deaths });
        setGameState(GameState.GAME_OVER);
        setSubmitError(null); // Reset previous errors
        
        // Auto submit score
        playFabService.submitScore(time)
            .then(() => console.log("Score submitted"))
            .catch(err => {
                console.error("Score submit failed", err);
                setSubmitError(typeof err === 'string' ? err : "Score upload failed");
            });
    }, []);

    const handleUpdateScore = useCallback((time: number, deaths: number) => {
        setCurrentTime(time);
        setDeaths(deaths);
    }, []);

    // Initialize Engine once
    if (!engineRef.current) {
        engineRef.current = new GameEngine(handleGameOver, handleUpdateScore);
    }

    // PlayFab Init
    useEffect(() => {
        if ((PLAYFAB_TITLE_ID as string) === "YOUR_TITLE_ID_HERE") {
            console.warn("Please set your PlayFab Title ID in constants.ts to enable online features.");
        }
        playFabService.init();
        playFabService.login()
            .then(() => {
                setOnlineStatus("connected");
                setLoginErrorMessage(null);
                const name = playFabService.getDisplayName();
                if (name) setPlayerName(name);
            })
            .catch(err => {
                console.error("PlayFab Login Failed", err);
                setOnlineStatus("offline");
                setLoginErrorMessage(typeof err === 'string' ? err : "Unknown login error");
            });
    }, []);

    const startGame = () => {
        engineRef.current?.start();
        setGameState(GameState.PLAYING);
    };

    const goToLeaderboard = () => {
        setGameState(GameState.LEADERBOARD);
    };

    const backToMenu = () => {
        setGameState(GameState.MENU);
    };

    const saveName = () => {
        const nameToSave = tempName.trim();
        
        // If name hasn't changed or is empty, just exit edit mode
        if (nameToSave === playerName) {
            setIsNameEditing(false);
            return;
        }

        if (nameToSave.length > 0) {
            setIsSavingName(true);
            playFabService.updateDisplayName(nameToSave)
                .then(() => {
                    setPlayerName(nameToSave);
                    setIsNameEditing(false);
                })
                .catch((err) => {
                    alert("Error: " + err);
                })
                .finally(() => {
                    setIsSavingName(false);
                });
        }
    };

    return (
        <div className="relative w-full h-screen bg-white overflow-hidden flex justify-center items-center">
            {/* The Game Canvas handles the visuals and logic */}
            <div className="absolute inset-0">
                {engineRef.current && (
                    <GameCanvas 
                        engine={engineRef.current} 
                        isPlaying={gameState === GameState.PLAYING} 
                    />
                )}
            </div>

            {/* HUD: Always visible when playing */}
            {gameState === GameState.PLAYING && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none max-w-[600px] max-h-[800px] mx-auto relative-hud-container">
                    <div className="absolute top-5 left-5 text-2xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_5px_currentColor]">
                        TIME: {currentTime.toFixed(2)}
                    </div>
                    <div className="absolute top-14 left-5 text-2xl font-mono font-bold text-red-500 drop-shadow-[0_0_5px_currentColor]">
                        DEATH: {deaths}
                    </div>
                </div>
            )}

            {/* Menu Screen */}
            {gameState === GameState.MENU && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 p-4">
                    <h1 className="text-4xl md:text-5xl font-serif tracking-widest text-white drop-shadow-[0_0_15px_#0ff] mb-4 text-center">
                        弱き者から<br/>死んでいく
                    </h1>
                    <p className="text-gray-300 text-lg mb-8">Tap screen to move / Avoid enemies</p>
                    
                    {/* Online Status Indicator */}
                    <div className="mb-4 text-sm font-mono text-center">
                        Status: 
                        <span className={`ml-2 font-bold ${
                            onlineStatus === 'connected' ? 'text-green-400' : 
                            onlineStatus === 'offline' ? 'text-red-500' : 'text-yellow-400'
                        }`}>
                            {onlineStatus.toUpperCase()}
                        </span>
                        {/* Display specific login error instruction */}
                        {loginErrorMessage && (
                            <div className="mt-2 p-3 bg-red-900/90 border border-red-500 rounded text-xs text-white max-w-md mx-auto whitespace-pre-wrap text-left shadow-lg">
                                {loginErrorMessage}
                            </div>
                        )}
                    </div>
                    
                    {/* Name Entry */}
                    <div className="mb-8 flex flex-col items-center h-10 justify-center">
                        {!isNameEditing ? (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Player:</span>
                                <span className="font-bold text-cyan-300 text-xl">{playerName || "Guest"}</span>
                                <button 
                                    onClick={() => { setTempName(playerName); setIsNameEditing(true); }}
                                    className="text-xs border border-gray-600 px-2 py-1 rounded hover:bg-gray-800 ml-2"
                                    disabled={onlineStatus !== 'connected'}
                                >
                                    EDIT
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    className="bg-gray-800 border border-cyan-500 text-white px-2 py-1 rounded outline-none"
                                    placeholder="Enter Name"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    maxLength={12}
                                    disabled={isSavingName}
                                />
                                <button 
                                    onClick={saveName} 
                                    className="text-cyan-400 font-bold disabled:text-gray-500 disabled:cursor-wait"
                                    disabled={isSavingName}
                                >
                                    {isSavingName ? "..." : "OK"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button 
                            onClick={startGame}
                            className="w-full py-4 text-2xl border-2 border-cyan-400 text-cyan-400 font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                        >
                            START
                        </button>
                        <button 
                            onClick={goToLeaderboard}
                            className="w-full py-3 text-lg border border-gray-500 text-gray-300 hover:border-white hover:text-white transition-all"
                        >
                            LEADERBOARD
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameState === GameState.GAME_OVER && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white z-20 p-4 animate-fade-in">
                    <h1 className="text-6xl md:text-8xl font-serif text-red-500 drop-shadow-[0_0_30px_#f00] mb-8 tracking-widest">
                        無念
                    </h1>
                    <div className="text-center text-xl text-gray-300 mb-8 leading-relaxed">
                        <p>生存記録: <span className="text-white font-bold">{finalScore.time.toFixed(2)}</span> 秒</p>
                        <p>あなたより弱き者: <span className="text-red-400 font-bold">{finalScore.deaths}</span> 体</p>
                    </div>

                    {/* Submit Error Message */}
                    {submitError && (
                        <div className="mb-4 p-3 bg-red-900/80 border border-red-500 rounded text-white text-xs max-w-md text-center whitespace-pre-wrap">
                            <strong>通信エラー:</strong><br/>
                            {submitError}
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button 
                            onClick={startGame}
                            className="w-full py-4 text-2xl border-2 border-cyan-400 text-cyan-400 font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                        >
                            RETRY
                        </button>
                        <button 
                            onClick={goToLeaderboard}
                            className="w-full py-3 text-lg border border-gray-500 text-gray-300 hover:border-white hover:text-white transition-all"
                        >
                            LEADERBOARD
                        </button>
                        <button 
                            onClick={backToMenu}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-all"
                        >
                            TITLE
                        </button>
                    </div>
                </div>
            )}

            {/* Leaderboard Screen */}
            {gameState === GameState.LEADERBOARD && (
                <div className="absolute inset-0 z-30">
                    <Leaderboard onBack={backToMenu} />
                </div>
            )}

            {/* Ensure Game Resolution Aspect Ratio for UI overlay positioning if needed */}
            <style>{`
                .relative-hud-container {
                     /* This acts as a responsive container overlay matching game coords loosely if strictly needed,
                        but absolute positioning is usually fine for HUD */
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;