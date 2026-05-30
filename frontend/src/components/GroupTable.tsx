import { useTournamentStore } from "../services/useTournamentStore";

interface GroupTableProps {
  groupLetter: string;
}

export default function GroupTable({ groupLetter }: GroupTableProps) {
  const { groupStandings } = useTournamentStore();

  // Retrieve standings for the specified group letter from the Zustand map
  const standings = groupStandings.get(groupLetter.toLowerCase()) || [];

  const getFlagUrl = (code: string) => {
    if (!code) return "";
    return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code.toUpperCase()}`;
  };

  return (
    <div className="relative bg-zinc-900 border-[3px] border-black p-4 select-none shadow-[6px_6px_0px_#1A1916]">
      {/* Group header section */}
      <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
        <h3 className="text-sm font-black tracking-[0.2em] text-white">
          GRUP {groupLetter.toUpperCase()} STANDINGS
        </h3>
        <span className="font-mono text-[9px] text-[#00E5FF] font-bold tracking-widest uppercase">
          LIVE STANDING
        </span>
      </div>

      {/* Spacious Infographic Table Layout */}
      <div className="flex flex-col space-y-3">
        {/* Table Header Row */}
        <div className="flex items-center justify-between text-[9px] font-mono font-black text-zinc-500 tracking-wider px-2 uppercase pb-1 border-b border-zinc-800">
          <div className="flex-1 flex items-center">
            <span className="w-6 text-center">#</span>
            <span>TAKIM</span>
          </div>
          <div className="flex items-center space-x-6 text-right">
            <span className="w-10">O / G / B / M</span>
            <span className="w-12">AV</span>
            <span className="w-10 text-[#00FF87]">PTS</span>
          </div>
        </div>

        {/* Standings List Items */}
        {standings.map((team, idx) => {
          const isQualifiedDirect = idx < 2; // Direct qualification (Top 2)
          const isThirdPlacePotential = idx === 2; // Potential wildcard (3rd)

          return (
            <div
              key={team.teamCode}
              className={`flex items-center justify-between p-3 border-2 transition-all duration-150 relative ${
                isQualifiedDirect
                  ? "bg-zinc-900/80 border-zinc-800 hover:border-[#00FF87] hover:bg-zinc-900"
                  : isThirdPlacePotential
                  ? "bg-zinc-900/60 border-zinc-800 hover:border-[#00E5FF] hover:bg-zinc-900"
                  : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800"
              }`}
              style={{ borderRadius: "0" }}
            >
              {/* Left indicator tags */}
              {isQualifiedDirect && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00FF87] shadow-[2px_0_8px_#00FF87]" />
              )}
              {isThirdPlacePotential && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00E5FF] shadow-[2px_0_8px_#00E5FF]" />
              )}

              {/* Team Information */}
              <div className="flex-1 flex items-center space-x-3.5 min-w-0">
                {/* Ranking order number */}
                <span className={`w-6 text-center font-mono text-xs font-black ${
                  isQualifiedDirect ? "text-[#00FF87]" : isThirdPlacePotential ? "text-[#00E5FF]" : "text-zinc-500"
                }`}>
                  {idx + 1}
                </span>

                {/* Flag Widget */}
                <img
                  src={getFlagUrl(team.teamCode)}
                  alt={team.teamNameTr}
                  className="w-7 h-7 object-cover border border-black shadow-[1.5px_1.5px_0px_#000]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/30x30/222/00FF87?text=${team.teamCode}`;
                  }}
                />

                {/* Team naming and huge initials */}
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono text-xs font-black tracking-tight text-white select-all">
                    {team.teamCode.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-300 hidden sm:inline-block truncate">
                    {team.teamNameTr.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Statistical details */}
              <div className="flex items-center space-x-6 font-mono text-xs text-right">
                {/* Matches Breakdown: Oynanan / Galibiyet / Beraberlik / Mağlubiyet */}
                <div className="w-10 flex flex-col items-end">
                  <span className="text-[10px] font-bold text-white tracking-tight">
                    {team.played}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-medium">
                    {team.won}/{team.drawn}/{team.lost}
                  </span>
                </div>

                {/* Goal Difference (Averaj) Column */}
                <span className={`w-12 text-center font-black ${
                  team.goalDifference > 0 
                    ? "text-[#00E5FF]" 
                    : team.goalDifference < 0 
                    ? "text-[#FF2D78]" 
                    : "text-zinc-400"
                }`}>
                  {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                </span>

                {/* Total Points (PTS) Highlight */}
                <div className="w-10 flex flex-col items-end">
                  <span className="text-sm font-black text-[#00FF87] drop-shadow-[0_0_4px_rgba(0,255,135,0.2)]">
                    {team.points}
                  </span>
                  <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">
                    PUAN
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info indicator panel at bottom */}
      <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-zinc-800/80 font-mono text-[8px] tracking-wider text-zinc-500">
        <div className="flex items-center space-x-1">
          <span className="w-2 h-1 bg-[#00FF87]" />
          <span>DOĞRUDAN ELEMELER</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2 h-1 bg-[#00E5FF]" />
          <span>EN İYİ 3.LER ADAYI</span>
        </div>
      </div>
    </div>
  );
}
