import { useState, useMemo } from "react";
import { Table2, Filter } from "lucide-react";
import { shortTime, timeAgo, actionStyles, categoriaColor, categoriaLabel } from "../lib/formatters";

export default function EventsTable({ events, onEventClick }) {
  const [filterAction, setFilterAction] = useState("TODOS");
  const [filterCategoria, setFilterCategoria] = useState("TODOS");

  // Extraer valores únicos para los filtros
  const acciones = ["TODOS", ...new Set(events.map(e => e.action))];
  const categorias = ["TODOS", ...new Set(events.map(e => e.categoria))];

  // Filtrar eventos según selección
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterAction !== "TODOS" && e.action !== filterAction) return false;
      if (filterCategoria !== "TODOS" && e.categoria !== filterCategoria) return false;
      return true;
    });
  }, [events, filterAction, filterCategoria]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
      
      {/* Header de la tabla con filtros */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Table2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Eventos recientes
          </h3>
          <span className="text-xs text-slate-500 ml-2">
            {filteredEvents.length} de {events.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          
          {/* Filtro por acción */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1.5 hover:border-slate-600 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            {acciones.map(a => (
              <option key={a} value={a}>
                {a === "TODOS" ? "Todas las acciones" : a}
              </option>
            ))}
          </select>

          {/* Filtro por categoría */}
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1.5 hover:border-slate-600 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            {categorias.map(c => (
              <option key={c} value={c}>
                {c === "TODOS" ? "Todas las categorías" : categoriaLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 font-semibold">Hora</th>
              <th className="px-6 py-3 font-semibold">Jugador</th>
              <th className="px-6 py-3 font-semibold">Mensaje</th>
              <th className="px-6 py-3 font-semibold">Categoría</th>
              <th className="px-6 py-3 font-semibold">Score</th>
              <th className="px-6 py-3 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Sin eventos que coincidan con el filtro
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => {
                const style = actionStyles(event.action);
                return (
                  <tr 
                    key={event.id}
                    onClick={() => onEventClick && onEventClick(event)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Hora */}
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-slate-300 font-mono">
                        {shortTime(event.timestamp)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {timeAgo(event.timestamp)}
                      </div>
                    </td>

                    {/* Jugador */}
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                          {event.player_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            {event.player_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {event.player_id.substring(0, 10)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mensaje */}
                    <td className="px-6 py-3">
                      <div className="text-sm text-slate-300 max-w-xs truncate" title={event.message}>
                        {event.message}
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoriaColor(event.categoria) }}
                        ></div>
                        <span className="text-xs text-slate-300">
                          {categoriaLabel(event.categoria)}
                        </span>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
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
                        <span className="text-xs font-mono font-semibold text-slate-300 w-6">
                          {event.score}
                        </span>
                      </div>
                    </td>

                    {/* Acción */}
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${style.bg} ${style.border} ${style.text}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></div>
                        {event.action}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}