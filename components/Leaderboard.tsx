import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { playFabService } from '../services/playfabService';

interface LeaderboardProps {
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        playFabService.getLeaderboard()
            .then(data => {
                setEntries(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(typeof err === 'string' ? err : 'Could not fetch leaderboard');
                setLoading(false);
            });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white bg-black/90 p-4 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6 text-cyan-400 tracking-wider shadow-cyan-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                RANKING
            </h2>

            {loading && <p className="text-xl text-gray-400 animate-pulse">Loading...</p>}
            
            {error && (
                <div className="text-red-400 mb-4 text-center">
                    <p>Failed to load ranking.</p>
                    <p className="text-sm opacity-70">Check console or Title ID in constants.ts</p>
                </div>
            )}

            {!loading && !error && (
                <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-2xl mb-8">
                    <div className="grid grid-cols-12 bg-gray-800 p-3 font-bold text-gray-300 border-b border-gray-700 text-sm md:text-base">
                        <div className="col-span-2 text-center">#</div>
                        <div className="col-span-7">NAME</div>
                        <div className="col-span-3 text-right">TIME</div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {entries.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No records yet.</div>
                        ) : (
                            entries.map((entry) => (
                                <div key={entry.PlayFabId} className="grid grid-cols-12 p-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-sm md:text-base">
                                    <div className="col-span-2 text-center font-mono text-cyan-300">
                                        {entry.Position + 1}
                                    </div>
                                    <div className="col-span-7 truncate text-gray-200">
                                        {entry.DisplayName || 'Unknown'}
                                    </div>
                                    <div className="col-span-3 text-right font-mono text-yellow-300">
                                        {(entry.StatValue / 100).toFixed(2)}s
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <button 
                onClick={onBack}
                className="mt-4 px-8 py-3 border-2 border-cyan-400 text-cyan-400 text-xl font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all duration-200 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"
            >
                BACK
            </button>
        </div>
    );
};

export default Leaderboard;