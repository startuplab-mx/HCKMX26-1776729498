import { Search, AlertTriangle, AlertOctagon, TrendingUp } from "lucide-react";

export default function HunterStats({ findings, lastHunt }) {
  const totalScanned = lastHunt?.videos_analyzed || 0;
  const totalFindings = findings.length;
  const criticalCount = findings.filter(f => f.score >= 85).length;
  const azureFilteredCount = findings.filter(f => f.azure_filter_triggered).length;

  const stats = [
    {
      icon: Search,
      label: "VIDEOS ESCANEADOS",
      value: totalScanned,
      sublabel: lastHunt ? "última cacería" : "sin cacerías aún",
      color: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-400",
      glow: "shadow-cyan-500/10"
    },
    {
      icon: AlertOctagon,
      label: "AMENAZAS DETECTADAS",
      value: totalFindings,
      sublabel: "total en sistema",
      color: "from-red-500/20 to-red-500/5",
      iconColor: "text-red-400",
      glow: "shadow-red-500/10"
    },
    {
      icon: AlertTriangle,
      label: "CRÍTICAS",
      value: criticalCount,
      sublabel: "score ≥ 85",
      color: "from-orange-500/20 to-orange-500/5",
      iconColor: "text-orange-400",
      glow: "shadow-orange-500/10"
    },
    {
      icon: TrendingUp,
      label: "BLOQUEADAS POR AZURE",
      value: azureFilteredCount,
      sublabel: "contenido extremo",
      color: "from-fuchsia-500/20 to-fuchsia-500/5",
      iconColor: "text-fuchsia-400",
      glow: "shadow-fuchsia-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br ${stat.color} p-5 shadow-lg ${stat.glow}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg bg-slate-900/60 ${stat.iconColor}`}>
                <Icon size={22} />
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-400 mb-1 tracking-wider">
              {stat.label}
            </div>
            <div className="text-3xl font-bold text-slate-100 mb-1">
              {stat.value}
            </div>
            <div className="text-xs text-slate-500">
              {stat.sublabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}