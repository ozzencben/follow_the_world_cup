import { useEffect, useState, useCallback, lazy, Suspense } from "react";
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

const VALID_ROUTES = [
  "home", "teams", "groups", "matches", "about",
  "contact", "elo", "simulator",
  // simulator sub-tabs — these are handled internally by Simulator
  // but Simulator's MainLayout may fire them via onRouteChange
  "analytics", "guide",
] as const;

const PageLoading = () => (
  <div
    className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 space-y-4"
  >
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid #00FF87",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <p
      style={{ color: "#5C5A54", letterSpacing: "0.15em", fontSize: 11, fontFamily: "monospace" }}
    >
      Sayfa Yükleniyor...
    </p>
  </div>
);

export default function App() {
  const { initializeStore } = useTournamentStore();

  const getRouteFromHash = () => {
    const raw = window.location.hash.replace("#/", "").split("?")[0].trim();
    // Simulator-only sub-tabs (never standalone pages)
    if (["analytics", "guide", "creators"].includes(raw)) return "simulator";
    return (VALID_ROUTES as readonly string[]).includes(raw) ? raw : "home";
  };

  const [route, setRoute] = useState<string>(getRouteFromHash);

  // Global Modal State Management
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };

  /**
   * Central navigation function — ALWAYS use this.
   * Sets both the hash AND React state atomically to prevent desync.
   * Note: Simulator internal sub-tabs (groups/matches/analytics/guide) are handled
   * by Simulator's own setSubTab and never reach this function.
   */
  const handleRouteChange = useCallback((newRoute: string) => {
    window.location.hash = `#/${newRoute}`;
    setRoute(newRoute);
  }, []);

  useEffect(() => {
    initializeStore();

    // Set initial hash if not set
    if (!window.location.hash || window.location.hash === "#") {
      window.location.hash = "#/home";
    }

    /**
     * Fallback hashchange listener — catches any external hash change
     * (browser back/forward, direct URL entry, etc.)
     */
    const handleHashChange = () => {
      const newRoute = getRouteFromHash();
      setRoute(newRoute);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Only simulator is fullscreen dark mode now
  const isFullscreen = route === "simulator";

  if (isFullscreen) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Simulator onRouteChange={handleRouteChange} />
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
      style={{
        fontFamily: "'Inter', Helvetica Neue, Arial, sans-serif",
        color: "#1A1916",
        background: "#F8F7F2",
      }}
    >
      {/* 1. Swiss-Retro Pitch Background */}
      <WorldCupBackground />

      {/* 2. Sticky Swiss Navbar */}
      <Navbar
        currentRoute={route}
        onRouteChange={handleRouteChange}
        onSelectTeam={handleSelectTeam}
      />

      {/* 3. Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 z-10">
        <div className="min-h-[50vh]">{renderPage()}</div>
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
