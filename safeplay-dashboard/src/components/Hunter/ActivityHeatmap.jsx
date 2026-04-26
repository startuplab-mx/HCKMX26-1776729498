/**
 * ActivityHeatmap.jsx (DARK MODE)
 * 707 PREDATOR HUNTER - Heatmap de actividad temporal
 */

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

function ActivityHeatmap(props) {
  const username = props.username;
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;

  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]);
  const [totalActivity, setTotalActivity] = useState(0);

  function loadHeatmap() {
    if (!username) return;
    setLoading(true);
    const cleanUsername = username.replace("@", "").trim();
    const url = apiBaseUrl + "/get-activity-heatmap?username=" + cleanUsername + (functionKey ? "&code=" + functionKey : "");

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          console.error("Error heatmap:", data.error);
          setLoading(false);
          return;
        }
        setHeatmap(data.heatmap);
        setDays(data.days || days);
        setTotalActivity(data.total_activity || 0);
        setLoading(false);
      })
      .catch(function (err) {
        console.error("Error fetch heatmap:", err);
        setLoading(false);
      });
  }

  useEffect(function () {
    loadHeatmap();
  }, [username]);

  function getMaxValue() {
    if (!heatmap) return 1;
    let max = 1;
    for (let i = 0; i < heatmap.length; i++) {
      for (let j = 0; j < heatmap[i].length; j++) {
        if (heatmap[i][j] > max) max = heatmap[i][j];
      }
    }
    return max;
  }

  function getCellColor(value, max) {
    if (value === 0) return "#1e293b";
    const intensity = value / max;
    if (intensity < 0.2) return "#7f1d1d";
    if (intensity < 0.4) return "#991b1b";
    if (intensity < 0.6) return "#b91c1c";
    if (intensity < 0.8) return "#dc2626";
    return "#ef4444";
  }

  function isSchoolHour(hour) {
    return hour >= 8 && hour <= 15;
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Cargando heatmap...
      </div>
    );
  }

  if (!heatmap) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        Sin datos de actividad para @{username}
      </div>
    );
  }

  const max = getMaxValue();
  const hours = [];
  for (let h = 0; h < 24; h++) hours.push(h);

  let schoolHourActivity = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (isSchoolHour(h)) schoolHourActivity += heatmap[d][h] || 0;
    }
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-red-400" />
            Heatmap de actividad - @{username}
          </h3>
          <div className="text-sm text-slate-400 mt-1">
            Total: <strong className="text-slate-200">{totalActivity}</strong> eventos analizados
          </div>
        </div>
        {schoolHourActivity > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/50 border border-red-900 rounded-lg text-xs text-red-300">
            <AlertTriangle size={14} />
            <span><strong>{schoolHourActivity}</strong> eventos en horario escolar (8am-3pm)</span>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1 text-right text-slate-500"></th>
              {hours.map(function (h) {
                return (
                  <th key={h} className={"px-0.5 font-normal text-[10px] " + (isSchoolHour(h) ? "text-red-400" : "text-slate-500")}>
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {days.map(function (day, dIdx) {
              return (
                <tr key={dIdx}>
                  <td className="px-2 py-0.5 text-right text-slate-400 font-medium">{day}</td>
                  {hours.map(function (h) {
                    const val = (heatmap[dIdx] && heatmap[dIdx][h]) || 0;
                    return (
                      <td key={h} className="p-0.5">
                        <div
                          title={day + " " + h + ":00 - " + val + " eventos"}
                          className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] cursor-pointer"
                          style={{
                            background: getCellColor(val, max),
                            color: val > max * 0.5 ? "white" : "#94a3b8",
                            border: isSchoolHour(h) && val > 0 ? "1px solid rgba(220,38,38,0.5)" : "none"
                          }}
                        >
                          {val > 0 ? val : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span>Menos</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-4 rounded-sm" style={{ background: "#1e293b" }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: "#7f1d1d" }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: "#991b1b" }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: "#b91c1c" }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: "#dc2626" }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: "#ef4444" }}></div>
        </div>
        <span>Más</span>
        <span className="ml-4 text-red-400">⚠ Borde rojo = horario escolar</span>
      </div>
    </div>
  );
}

export default ActivityHeatmap;
