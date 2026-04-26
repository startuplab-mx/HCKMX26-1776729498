import { X, AlertTriangle, CheckCircle2, ShieldX, Clock, User, Gamepad2, Hash, MessageSquare, Sparkles, Flag, ArrowUpCircle } from "lucide-react";
import { actionStyles, categoriaColor, categoriaLabel, shortTime, timeAgo } from "../lib/formatters";

export default function EventDetailModal({ event, onClose }) {
  if (!event) return null;

  const style = actionStyles(event.action);
  const categoriaCol = categoriaColor(event.categoria);

  const ActionIcon = event.action === "BLOQUEAR" 
    ? ShieldX 
    : event.action === "ADVERTIR" 
    ? AlertTriangle 
    : CheckCircle2;

  return (
    <>
      {/* Backdrop oscuro con blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header con franja de color según severidad */}
          <div className={`h-1 ${style.dot}`}></div>
          
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            
            {/* Título con acción */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${style.bg} ${style.border} border`}>
                <ActionIcon className={`w-6 h-6 ${style.text}`} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Evento {event.action.toLowerCase()}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {event.id}
                </p>
              </div>
            </div>

            {/* Mensaje analizado — caja destacada */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Mensaje analizado
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <p className="text-slate-200 text-base leading-relaxed">
                  "{event.message}"
                </p>
              </div>
            </div>

            {/* Análisis de IA */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Análisis de 707 AI
                </span>
              </div>
              <div className="bg-gradient-to-br from-fuchsia-500/5 to-cyan-500/5 border border-fuchsia-500/20 rounded-lg p-4">
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  {event.reason}
                </p>
              </div>
            </div>

            {/* Grid de metadata */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              
              {/* Score */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Score de riesgo
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-black ${style.text}`}>
                    {event.score}
                  </span>
                  <span className="text-sm text-slate-500 mb-1">/ 100</span>
                </div>
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${event.score}%`,
                      backgroundColor: event.score >= 70 
                        ? "#ef4444" 
                        : event.score >= 31 
                        ? "#f59e0b" 
                        : "#10b981"
                    }}
                  ></div>
                </div>
              </div>

              {/* Categoría */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Categoría
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoriaCol }}
                  ></div>
                  <span className="text-lg font-bold text-slate-100">
                    {categoriaLabel(event.categoria)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  {event.categoria}
                </p>
              </div>

              {/* Jugador */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Jugador
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                    {event.player_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      {event.player_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {event.player_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Momento
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-100">
                  {shortTime(event.timestamp)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {timeAgo(event.timestamp)}
                </p>
              </div>
            </div>

            {/* Juego */}
            <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Juego:</span>
              <span className="text-sm text-slate-200 font-mono">{event.game_id}</span>
            </div>

            {/* Acciones de moderación */}
            <div className="flex items-center gap-2 pt-6 border-t border-slate-800">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-semibold">
                <Flag className="w-4 h-4" />
                Marcar falso positivo
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white hover:from-pink-600 hover:to-fuchsia-600 transition-colors text-sm font-semibold shadow-lg shadow-fuchsia-500/30">
                <ArrowUpCircle className="w-4 h-4" />
                Escalar a supervisor
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}