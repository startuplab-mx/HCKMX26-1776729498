import { MessageCircle, ShieldAlert, Users, TrendingUp } from "lucide-react";

export default function MetricsCards({ events }) {
  // Calcular métricas a partir de los eventos
  const total = events.length;
  
  const bloqueados = events.filter(e => e.action === "BLOQUEAR").length;
  const porcentajeBloqueados = total > 0 
    ? Math.round((bloqueados / total) * 100) 
    : 0;
  
  const jugadoresUnicos = new Set(events.map(e => e.player_id)).size;
  
  // Contar categorías y encontrar la más frecuente (excluyendo SEGURO)
  const categoriasCounts = events.reduce((acc, e) => {
    if (e.categoria !== "SEGURO") {
      acc[e.categoria] = (acc[e.categoria] || 0) + 1;
    }
    return acc;
  }, {});
  
  const categoriaTop = Object.entries(categoriasCounts)
    .sort((a, b) => b[1] - a[1])[0];
  const topCategoriaNombre = categoriaTop ? categoriaTop[0] : "—";
  const topCategoriaCount = categoriaTop ? categoriaTop[1] : 0;

  const metrics = [
    {
      label: "Mensajes analizados",
      value: total,
      sublabel: "Total histórico",
      icon: MessageCircle,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
      glow: "shadow-cyan-500/20"
    },
    {
      label: "Bloqueados",
      value: bloqueados,
      sublabel: `${porcentajeBloqueados}% del total`,
      icon: ShieldAlert,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
      glow: "shadow-red-500/20"
    },
    {
      label: "Jugadores únicos",
      value: jugadoresUnicos,
      sublabel: "Activos en período",
      icon: Users,
      iconColor: "text-fuchsia-400",
      iconBg: "bg-fuchsia-500/10",
      glow: "shadow-fuchsia-500/20"
    },
    {
      label: "Categoría principal",
      value: topCategoriaNombre,
      sublabel: `${topCategoriaCount} detecciones`,
      icon: TrendingUp,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
      glow: "shadow-amber-500/20",
      isText: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur p-5 hover:border-slate-700 transition-all shadow-lg ${metric.glow}`}
          >
            {/* Efecto decorativo de fondo */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${metric.iconBg} blur-2xl opacity-50`}></div>
            
            {/* Contenido */}
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${metric.iconBg}`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {metric.label}
                </p>
                <p className={`font-black text-slate-100 ${metric.isText ? 'text-2xl' : 'text-4xl'}`}>
                  {metric.value}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {metric.sublabel}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}