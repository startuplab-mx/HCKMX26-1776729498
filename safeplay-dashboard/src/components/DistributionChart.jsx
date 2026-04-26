import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { categoriaColor, categoriaLabel } from "../lib/formatters";

export default function DistributionChart({ events }) {
  // Agrupar eventos por categoría
  const counts = events.reduce((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + 1;
    return acc;
  }, {});

  // Convertir a formato que Recharts entiende
  const data = Object.entries(counts)
    .map(([categoria, count]) => ({
      name: categoriaLabel(categoria),
      categoria,
      value: count,
      color: categoriaColor(categoria)
    }))
    .sort((a, b) => b.value - a.value);

  const total = events.length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-fuchsia-500/10">
          <PieIcon className="w-4 h-4 text-fuchsia-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Distribución por categoría
        </h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Gráfica */}
        <div className="w-1/2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell 
                    key={entry.categoria} 
                    fill={entry.color}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0"
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda con conteos */}
        <div className="w-1/2 space-y-2">
          {data.map((entry) => {
            const percent = ((entry.value / total) * 100).toFixed(0);
            return (
              <div
                key={entry.categoria}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs text-slate-300">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    {entry.value}
                  </span>
                  <span className="text-xs text-slate-500 w-8 text-right">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}