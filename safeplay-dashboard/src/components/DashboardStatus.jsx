import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardStatus({ loading, error, lastRefresh, onRefresh, eventCount }) {
  
  // Estado visual según condición
  let statusConfig;
  if (error) {
    statusConfig = {
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "Error de conexión"
    };
  } else if (loading) {
    statusConfig = {
      icon: Loader2,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      label: "Cargando eventos...",
      spin: true
    };
  } else {
    statusConfig = {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Conectado a Cosmos DB"
    };
  }

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/30">
      
      {/* Estado de conexión */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.bg} ${statusConfig.border}`}>
          <StatusIcon 
            className={`w-4 h-4 ${statusConfig.color} ${statusConfig.spin ? "animate-spin" : ""}`}
            strokeWidth={2.5}
          />
          <span className={`text-xs font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        {!loading && !error && (
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{eventCount}</span> eventos cargados
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono">
            {error}
          </div>
        )}
      </div>

      {/* Controles derecha */}
      <div className="flex items-center gap-3">
        {lastRefresh && !error && (
          <div className="text-xs text-slate-500">
            Actualizado {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: es })}
          </div>
        )}
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-pink-500/50 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>
      
    </div>
  );
}