import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LandingPage from "./components/LandingPage";
import QueueLobby from "./components/QueueLobby";
import MatchPage from "./components/MatchPage";
import ResultPage from "./components/ResultPage";

type PageState = "LOBBY" | "MATCH" | "RESULT";

interface MatchInfo {
    roomId: string;
    opponentId: string;
    isInitiator: boolean;
}

function App() {
    const { isAuthenticated, isLoading } = useAuth0();
    const [currentPage, setCurrentPage] = useState<PageState>("LOBBY");
    const [didWin, setDidWin] = useState(false);
    const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

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
        <div className="app-root min-h-screen bg-gray-900">
            {currentPage === "LOBBY" && (
                <QueueLobby onMatchFound={handleMatchFound} />
            )}
            {currentPage === "MATCH" && matchInfo && (
                <MatchPage
                    roomId={matchInfo.roomId}
                    opponentId={matchInfo.opponentId}
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
