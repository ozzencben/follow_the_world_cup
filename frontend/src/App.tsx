import { useEffect, useState, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WorldCupBackground from "./components/WorldCupBackground";
import TeamDetailModal from "./components/TeamDetailModal";
import { useTournamentStore } from "./services/useTournamentStore";

// Lazy-loaded pages for bundle splitting
const Home = lazy(() => import("./pages/Home"));
const Teams = lazy(() => import("./pages/Teams"));
const Groups = lazy(() => import("./pages/Groups"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Matches = lazy(() => import("./pages/Matches"));
const EloPage = lazy(() => import("./pages/EloPage"));
const Simulator = lazy(() => import("./pages/Simulator"));

const PageLoading = () => (
  <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-up"
    style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
    <div style={{ width: 36, height: 36, border: "3px solid #00FF87", strokeDasharray: "4 4", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54", letterSpacing: "0.15em" }}>Sayfa Yükleniyor...</p>
  </div>
);

export default function App() {
  const { initializeStore } = useTournamentStore();

  // Simple, robust hash router implementation supporting simulator cockpit
  const [route, setRoute] = useState<string>(() => {
    const hash = window.location.hash.replace("#/", "");
    return ["home", "teams", "groups", "matches", "about", "contact", "elo", "simulator"].includes(hash) ? hash : "home";
  });

  // Global Modal State Management
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };

  useEffect(() => {
    // Silently initialize simulation engine store on app boot
    initializeStore();

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "");
      if (["home", "teams", "groups", "matches", "about", "contact", "elo", "simulator"].includes(hash)) {
        setRoute(hash);
      }
    };
    
    // Set initial hash if not set
    if (!window.location.hash) {
      window.location.hash = "#/home";
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [initializeStore]);

  const handleRouteChange = (newRoute: string) => {
    window.location.hash = `#/${newRoute}`;
    setRoute(newRoute);
  };

  // Render active page component wrapped in Suspense boundary
  const renderPage = () => {
    return (
      <Suspense fallback={<PageLoading />}>
        {(() => {
          switch (route) {
            case "home":
              return <Home onSelectTeam={handleSelectTeam} />;
            case "teams":
              return <Teams onSelectTeam={handleSelectTeam} />;
            case "groups":
              return <Groups onSelectTeam={handleSelectTeam} />;
            case "matches":
              return <Matches onSelectTeam={handleSelectTeam} />;
            case "about":
              return <About onSelectTeam={handleSelectTeam} />;
            case "contact":
              return <Contact />;
            case "elo":
              return <EloPage onSelectTeam={handleSelectTeam} />;
            default:
              return <Home onSelectTeam={handleSelectTeam} />;
          }
        })()}
      </Suspense>
    );
  };

  const isSimulator = route === "simulator";

  // Fullscreen isolated Simulator Cockpit view
  if (isSimulator) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Simulator />
        {selectedTeamName && (
          <TeamDetailModal
            teamName={selectedTeamName}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSelectTeam={handleSelectTeam}
          />
        )}
      </Suspense>
    );
  }

  // Pure, pristine, original Light-themed layouts for normal page routes
  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ fontFamily: "'Inter', Helvetica Neue, Arial, sans-serif", color: "#1A1916", background: "#F8F7F2" }}
    >
      {/* 1. Swiss-Retro Pitch Background */}
      <WorldCupBackground />

      {/* 2. Sticky Swiss Navbar */}
      <Navbar currentRoute={route} onRouteChange={handleRouteChange} onSelectTeam={handleSelectTeam} />

      {/* 3. Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 z-10">
        <div className="min-h-[50vh]">
          {renderPage()}
        </div>
      </main>

      {/* 4. Swiss-Retro Footer */}
      <Footer />

      {/* 5. Global Team Modal */}
      {selectedTeamName && (
        <TeamDetailModal
          teamName={selectedTeamName}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectTeam={handleSelectTeam}
        />
      )}
    </div>
  );
}
