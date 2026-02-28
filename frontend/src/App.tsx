import { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LandingPage from "./components/LandingPage";
import QueueLobby from "./components/QueueLobby";
import MatchPage from "./components/MatchPage";
import ResultPage from "./components/ResultPage";

type PageState = "LOBBY" | "MATCH" | "RESULT";

interface MatchInfo {
    roomId: string;
    opponentId: string;
    playerId: string;
    isInitiator: boolean;
}

function App() {
    const { isAuthenticated, isLoading } = useAuth0();
    const [currentPage, setCurrentPage] = useState<PageState>("LOBBY");
    const [didWin, setDidWin] = useState(false);
    const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

    // --- Audio State and Ref ---
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Set default volume when component mounts
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.3; // 30% volume so it acts as background music
        }
    }, []);

    const toggleMusic = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                // Catch handles any browser autoplay policy rejections
                audioRef.current.play().catch(err => console.error("Playback failed:", err));
            }
            setIsPlaying(!isPlaying);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-amber-900">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LandingPage />;
    }

    const handleMatchFound = (info: MatchInfo) => {
        setMatchInfo(info);
        setCurrentPage("MATCH");
    };
    const handleMatchEnd = (won: boolean) => {
        setDidWin(won);
        setCurrentPage("RESULT");
    };
    const handleRequeue = () => {
        setMatchInfo(null);
        setCurrentPage("LOBBY");
    };

    return (
        // Added 'relative' to the main wrapper so the absolute button positions correctly
        <div className="app-root min-h-screen bg-gray-900 relative">
            
            {/* Global Background Music Element */}
            <audio ref={audioRef} src="/playlistsons-wild-west-466301.mp3" loop />
            
            {/* Floating Music Toggle Button */}
            <button 
                onClick={toggleMusic}
                className="absolute top-4 left-4 z-50 bg-black bg-opacity-60 text-yellow-500 hover:text-white border-2 border-yellow-700 px-4 py-2 rounded-full font-mono transition-colors shadow-lg"
            >
                {isPlaying ? "🔊 Music: ON" : "🔇 Music: OFF"}
            </button>

            {currentPage === "LOBBY" && (
                <QueueLobby onMatchFound={handleMatchFound} />
            )}
            {currentPage === "MATCH" && matchInfo && (
                <MatchPage
                    roomId={matchInfo.roomId}
                    opponentId={matchInfo.opponentId}
                    playerId={matchInfo.playerId}
                    isInitiator={matchInfo.isInitiator}
                    onMatchEnd={handleMatchEnd}
                />
            )}
            {currentPage === "RESULT" && (
                <ResultPage isWinner={didWin} onRequeue={handleRequeue} />
            )}
        </div>
    );
}

export default App;