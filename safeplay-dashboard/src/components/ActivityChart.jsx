import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";
import { parseISO } from "date-fns";

export default function ActivityChart({ events }) {
  // Agrupar eventos por hora del día
  const hourlyData = events.reduce((acc, e) => {
    try {
      const date = parseISO(e.timestamp);
      const hour = date.getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, total: 0, bloqueados: 0 };
      }
      acc[hour].total += 1;
      if (e.action === "BLOQUEAR") {
        acc[hour].bloqueados += 1;
      }
    } catch {
      // timestamp inválido, lo ignoramos
    }
    return acc;
  }, {});

  // Llenar las horas que no tienen datos (0h a 23h) con valores en 0
  const data = [];
  for (let h = 0; h < 24; h++) {
    data.push(hourlyData[h] || { hour: h, total: 0, bloqueados: 0 });
  }
  
  // Formatear la hora para display
  const chartData = data.map(d => ({
    ...d,
    label: `${String(d.hour).padStart(2, "0")}h`
  }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Actividad por hora
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></div>
            <span className="text-slate-400">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
            <span className="text-slate-400">Bloqueados</span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#475569"
              tick={{ fill: "#64748b", fontSize: 10 }}
              interval={3}
            />
            <YAxis 
              stroke="#475569"
              tick={{ fill: "#64748b", fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0"
              }}
              labelStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
            />
            <Bar 
              dataKey="total" 
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="bloqueados" 
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}