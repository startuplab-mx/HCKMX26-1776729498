/**
 * CartelDistribution.jsx (DARK MODE)
 * 707 PREDATOR HUNTER - Distribución de detecciones por cártel
 */

import React, { useState, useEffect } from "react";
import { Shield, AlertTriangle } from "lucide-react";

function CartelDistribution(props) {
  const username = props.username;
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cartelMeta = {
    CJNG: { label: "CJNG", subtitle: "Cártel Jalisco Nueva Generación", color: "#dc2626", bg: "bg-red-500" },
    CARTEL_SINALOA: { label: "Cártel de Sinaloa", subtitle: "Los Chapitos · La Mayiza", color: "#f97316", bg: "bg-orange-500" },
    LA_MANA: { label: "La Maña", subtitle: "Cártel del Golfo · Zetas", color: "#eab308", bg: "bg-yellow-500" },
    OTROS: { label: "Otros cárteles", subtitle: "Identificados pero no clasificados", color: "#94a3b8", bg: "bg-slate-500" },
    DESCONOCIDO: { label: "Sin atribución", subtitle: "Sospechoso pero sin cártel claro", color: "#475569", bg: "bg-slate-700" }
  };

  function loadData() {
    if (!username) return;
    setLoading(true);
    setError(null);

    const cleanUsername = username.replace("@", "").trim();
    const url = apiBaseUrl + "/get-cartel-distribution?username=" + cleanUsername + (functionKey ? "&code=" + functionKey : "");

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(function (err) {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(function () {
    loadData();
  }, [username]);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        Cargando distribución por cártel...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-900 rounded-xl p-4 text-sm text-red-300">
        Error: {error}
      </div>
    );
  }

  if (!data || !data.counts || data.total === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
        <Shield size={32} className="text-slate-600 mx-auto mb-3" />
        <div className="text-slate-400 text-sm">Sin detecciones de cártel para @{username}</div>
        <div className="text-slate-600 text-xs mt-1">Las detecciones aparecen al analizar comentarios sospechosos</div>
      </div>
    );
  }

  const counts = data.counts || {};
  const total = data.total || 1;
  const maxCount = Math.max.apply(null, Object.values(counts).concat([1]));

  // Ordenar por cantidad descendente
  const orderedKeys = Object.keys(counts).sort(function (a, b) {
    return (counts[b] || 0) - (counts[a] || 0);
  });

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-red-400" />
            Distribución por cártel
          </h3>
          <div className="text-xs text-slate-500 mt-1">
            Detecciones con score ≥ 40 · Total: <strong className="text-slate-300">{total}</strong>
          </div>
        </div>
        {counts.DESCONOCIDO > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700 rounded-md text-[11px] text-slate-400">
            <AlertTriangle size={12} />
            <span>{counts.DESCONOCIDO} sin atribución clara</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {orderedKeys.map(function (key) {
          const count = counts[key] || 0;
          if (count === 0) return null;

          const meta = cartelMeta[key] || { label: key, subtitle: "", color: "#94a3b8" };
          const percentage = Math.round((count / total) * 100);
          const widthPct = Math.round((count / maxCount) * 100);

          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: meta.color }}></div>
                  <span className="text-sm font-medium text-slate-200">{meta.label}</span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">{meta.subtitle}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: meta.color }}>{count}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">({percentage}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-sm overflow-hidden h-2">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: widthPct + "%",
                    background: meta.color
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CartelDistribution;
