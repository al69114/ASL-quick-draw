import { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LandingPage from "./components/LandingPage";
import QueueLobby from "./components/QueueLobby";
import MatchPage from "./components/MatchPage";
import ResultPage from "./components/ResultPage";
import AboutPage from "./components/AboutPage";
import HowToPlayPage from "./components/HowToPlayPage";
import TutorialPage from "./components/TutorialPage";
import LeaderboardPage from "./components/LeaderboardPage"; 

type PageState = "LOBBY" | "MATCH" | "RESULT" | "ABOUT" | "HOW_TO_PLAY" | "TUTORIAL" | "LEADERBOARD";

interface MatchInfo {
    roomId: string;
    opponentId: string;
    playerId: string;
    isInitiator: boolean;
}

function App() {
    const { isAuthenticated, isLoading } = useAuth0();

    // 1. State Initializations FIRST
    const [currentPage, setCurrentPage] = useState<PageState>("LOBBY");
    const [didWin, setDidWin] = useState(false);
    const [eloChange, setEloChange] = useState(0);
    const [eloAdjustment, setEloAdjustment] = useState(0);
    const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

    // Audio State and Ref
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Set default volume when component mounts
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.3;
        }
    }, []);

    const toggleMusic = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current
                    .play()
                    .catch((err) => console.error("Playback failed:", err));
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

    const handleMatchEnd = (won: boolean, delta: number) => {
        setDidWin(won);
        setEloChange(delta);
        setEloAdjustment((prev) => prev + delta);
        setCurrentPage("RESULT");

        // Play the Yeehaw sound if they won the whole showdown
        if (won) {
            const yeehaw = new Audio("/yeehaw.mp3");
            yeehaw.volume = 0.6;
            yeehaw.play().catch((err) => console.error("SFX failed:", err));
        }
    };

    const handleRequeue = () => {
        setMatchInfo(null);
        setCurrentPage("LOBBY");
    };

    // 2. Navigation Handlers safely defined AFTER state exists
    const handleViewAbout = () => setCurrentPage("ABOUT");
    const handleViewHowToPlay = () => setCurrentPage("HOW_TO_PLAY");
    const handleViewTutorial = () => setCurrentPage("TUTORIAL");
    const handleViewLeaderboard = () => setCurrentPage("LEADERBOARD");
    const handleBackToLobby = () => setCurrentPage("LOBBY");

    return (
        <div className="app-root min-h-screen bg-gray-900 relative">
            <audio
                ref={audioRef}
                src="/playlistsons-wild-west-466301.mp3"
                loop
            />

            <button
                onClick={toggleMusic}
                className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-60 text-yellow-500 hover:text-white border-2 border-yellow-700 px-4 py-2 rounded-full font-mono transition-colors shadow-lg"
            >
                {isPlaying ? "🔊 Music: ON" : "🔇 Music: OFF"}
            </button>

            {currentPage === "LOBBY" && (
                <QueueLobby
                    onMatchFound={handleMatchFound}
                    eloAdjustment={eloAdjustment}
                    onViewAbout={handleViewAbout}
                    onViewHowToPlay={handleViewHowToPlay}
                    onViewTutorial={handleViewTutorial}
                    onViewLeaderboard={handleViewLeaderboard}
                />
            )}

            {currentPage === "TUTORIAL" && (
                <TutorialPage onBack={handleBackToLobby} />
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
                <ResultPage
                    isWinner={didWin}
                    eloChange={eloChange}
                    onRequeue={handleRequeue}
                />
            )}
            
            {currentPage === "ABOUT" && (
                <AboutPage onBack={handleBackToLobby} />
            )}
            
            {currentPage === "HOW_TO_PLAY" && (
                <HowToPlayPage onBack={handleBackToLobby} />
            )}
            
            {currentPage === "LEADERBOARD" && (
                <LeaderboardPage onBack={handleBackToLobby} />
            )}
            
        </div>
    );
}

export default App;