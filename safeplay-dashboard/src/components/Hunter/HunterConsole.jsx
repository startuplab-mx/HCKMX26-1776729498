import { useState, useEffect } from "react";
import { useHunter } from "../../lib/useHunter";
import { useIntelFindings } from "../../lib/useIntelFindings";
import HunterStats from "./HunterStats";
import FindingCard from "./FindingCard";
import HuntLauncher from "./HuntLauncher";
import FindingDossier from "./FindingDossier";
import { RefreshCw, Target, Filter } from "lucide-react";

export default function HunterConsole() {
  const { hunting, lastHunt, progress, launchHunt } = useHunter();
  const { findings, loading, refresh, lastRefresh } = useIntelFindings(30);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Auto-refresh después de una cacería exitosa
  useEffect(() => {
    if (progress?.status === "complete" && !hunting) {
      const t = setTimeout(() => refresh(), 1000);
      return () => clearTimeout(t);
    }
  }, [progress, hunting, refresh]);

  const handleLaunch = async (hashtags, maxPerTag) => {
    await launchHunt(hashtags, maxPerTag);
  };

  // Filtrar findings por severidad
  const filteredFindings = findings.filter((f) => {
    if (severityFilter === "ALL") return true;
    if (severityFilter === "CRITICAL") return f.score >= 85;
    if (severityFilter === "HIGH") return f.score >= 70 && f.score < 85;
    if (severityFilter === "MEDIUM") return f.score >= 50 && f.score < 70;
    return true;
  });

  // Ordenar por score desc y fecha desc
  const sortedFindings = [...filteredFindings].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.detected_at || 0) - new Date(a.detected_at || 0);
  });

  return (
    <div>
      {/* Title bar */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500">
            <Target className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Intelligence · Predator Hunter
            </h2>
            <p className="text-sm text-slate-400">
              Monitoreo OSINT 24/7 de plataformas públicas · Detección proactiva de amenazas a menores
            </p>
          </div>
        </div>
      </div>

      {/* Launcher */}
      <HuntLauncher
        onLaunch={handleLaunch}
        hunting={hunting}
        progress={progress}
      />

      {/* Stats */}
      <HunterStats findings={findings} lastHunt={lastHunt} />

      {/* Findings header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-100">
            Amenazas detectadas
          </h3>
          <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold rounded-md border border-fuchsia-500/30">
            {sortedFindings.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {[
              { value: "ALL", label: "Todos" },
              { value: "CRITICAL", label: "🚨 Críticos" },
              { value: "HIGH", label: "⚠️ Altos" },
              { value: "MEDIUM", label: "🟡 Medios" }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeverityFilter(opt.value)}
                className={`px-3 py-1 text-xs rounded font-medium transition ${
                  severityFilter === opt.value
                    ? "bg-fuchsia-500/30 text-fuchsia-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-sm transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Findings grid */}
      {loading && findings.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-xl">
          <RefreshCw className="mx-auto mb-3 animate-spin text-fuchsia-400" size={24} />
          <p className="text-slate-400">Cargando findings...</p>
        </div>
      ) : sortedFindings.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-xl">
          <Filter className="mx-auto mb-3 text-slate-600" size={32} />
          <p className="text-slate-400 text-lg mb-2">No hay findings con este filtro</p>
          <p className="text-slate-600 text-sm">
            {findings.length === 0
              ? "Inicia tu primera cacería para detectar amenazas"
              : `Cambia el filtro o inicia una nueva cacería`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onOpenDossier={setSelectedFinding}
            />
          ))}
        </div>
      )}

      {/* Dossier modal */}
      <FindingDossier
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  );
}