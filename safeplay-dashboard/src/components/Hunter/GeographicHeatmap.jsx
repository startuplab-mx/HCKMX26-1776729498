/**
 * GeographicHeatmap.jsx (DARK MODE)
 * 707 PREDATOR HUNTER - Mapa de calor geográfico de México
 *
 * Usa un SVG simplificado con regiones approximadas a estados.
 */

import React, { useState, useEffect } from "react";
import { MapPin, AlertTriangle } from "lucide-react";

function GeographicHeatmap(props) {
  const username = props.username;
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);

  function loadData() {
    if (!username) return;
    setLoading(true);
    setError(null);

    const cleanUsername = username.replace("@", "").trim();
    const url = apiBaseUrl + "/get-geographic-distribution?username=" + cleanUsername + (functionKey ? "&code=" + functionKey : "");

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

  function getStateColor(count, max) {
    if (!count || count === 0) return "#1e293b";
    const intensity = max > 0 ? count / max : 0;
    if (intensity < 0.2) return "#fef3c7";
    if (intensity < 0.4) return "#fbbf24";
    if (intensity < 0.6) return "#f59e0b";
    if (intensity < 0.8) return "#ea580c";
    return "#dc2626";
  }

  function getTextColor(count, max) {
    if (!count || count === 0) return "#475569";
    const intensity = max > 0 ? count / max : 0;
    if (intensity < 0.4) return "#0f172a";
    return "white";
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        Cargando distribución geográfica...
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

  if (!data || !data.counts) {
    return (
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
        <MapPin size={32} className="text-slate-600 mx-auto mb-3" />
        <div className="text-slate-400 text-sm">Sin datos geográficos para @{username}</div>
      </div>
    );
  }

  const counts = data.counts || {};
  const max = Math.max.apply(null, Object.values(counts).concat([1]));
  const coverage = data.coverage_percentage || 0;
  const withGeo = data.with_geolocation || 0;
  const withoutGeo = data.without_geolocation || 0;

  // Estados con sus paths SVG aproximados (ordenados Norte → Sur)
  // Coordenadas aproximadas, no es un mapa exacto pero da la idea
  const states = [
    { id: "BAJA_CALIFORNIA", label: "BC", path: "M 30,40 L 50,30 L 60,90 L 50,110 L 40,100 Z", labelX: 42, labelY: 75 },
    { id: "BAJA_CALIFORNIA_SUR", label: "BCS", path: "M 50,110 L 60,90 L 75,140 L 80,180 L 65,170 Z", labelX: 67, labelY: 145 },
    { id: "SONORA", label: "Sonora", path: "M 60,40 L 110,40 L 120,90 L 80,100 L 60,90 Z", labelX: 90, labelY: 70 },
    { id: "CHIHUAHUA", label: "Chihuahua", path: "M 110,40 L 170,40 L 175,100 L 130,110 L 120,90 Z", labelX: 145, labelY: 75 },
    { id: "COAHUILA", label: "Coahuila", path: "M 170,40 L 220,40 L 230,100 L 180,105 L 175,90 Z", labelX: 200, labelY: 75 },
    { id: "NUEVO_LEON", label: "NL", path: "M 220,55 L 245,55 L 255,100 L 230,100 Z", labelX: 235, labelY: 80 },
    { id: "TAMAULIPAS", label: "Tamps", path: "M 245,55 L 290,70 L 295,140 L 255,140 L 255,100 Z", labelX: 270, labelY: 105 },
    { id: "SINALOA", label: "Sinaloa", path: "M 80,100 L 120,90 L 130,150 L 95,155 L 80,140 Z", labelX: 105, labelY: 125 },
    { id: "DURANGO", label: "Durango", path: "M 130,110 L 175,100 L 185,155 L 145,150 Z", labelX: 158, labelY: 130 },
    { id: "ZACATECAS", label: "Zac", path: "M 175,100 L 225,100 L 215,150 L 185,155 Z", labelX: 200, labelY: 125 },
    { id: "SAN_LUIS_POTOSI", label: "SLP", path: "M 215,150 L 255,140 L 250,180 L 215,180 Z", labelX: 232, labelY: 162 },
    { id: "NAYARIT", label: "Nay", path: "M 95,155 L 130,150 L 130,180 L 105,180 Z", labelX: 115, labelY: 168 },
    { id: "JALISCO", label: "Jalisco", path: "M 105,180 L 130,180 L 215,180 L 200,220 L 150,220 L 105,205 Z", labelX: 160, labelY: 200 },
    { id: "AGUASCALIENTES", label: "Ags", path: "M 175,165 L 195,165 L 195,180 L 175,180 Z", labelX: 185, labelY: 173 },
    { id: "GUANAJUATO", label: "Gto", path: "M 195,180 L 235,180 L 235,210 L 200,210 Z", labelX: 217, labelY: 195 },
    { id: "QUERETARO", label: "Qro", path: "M 235,180 L 255,180 L 255,205 L 235,210 Z", labelX: 245, labelY: 195 },
    { id: "HIDALGO", label: "Hgo", path: "M 250,180 L 280,180 L 280,210 L 255,210 Z", labelX: 265, labelY: 195 },
    { id: "VERACRUZ", label: "Veracruz", path: "M 280,180 L 320,200 L 330,260 L 295,265 L 275,225 L 280,210 Z", labelX: 305, labelY: 230 },
    { id: "PUEBLA", label: "Pue", path: "M 235,210 L 275,225 L 275,250 L 245,255 L 235,235 Z", labelX: 255, labelY: 235 },
    { id: "TLAXCALA", label: "Tlx", path: "M 245,210 L 260,210 L 260,220 L 245,220 Z", labelX: 252, labelY: 215 },
    { id: "CIUDAD_DE_MEXICO", label: "CDMX", path: "M 230,215 L 248,215 L 248,228 L 230,228 Z", labelX: 239, labelY: 222 },
    { id: "ESTADO_DE_MEXICO", label: "EdoMex", path: "M 215,205 L 250,210 L 248,235 L 215,235 Z", labelX: 232, labelY: 222 },
    { id: "MORELOS", label: "Mor", path: "M 225,235 L 250,235 L 250,250 L 225,250 Z", labelX: 237, labelY: 243 },
    { id: "MICHOACAN", label: "Michoacán", path: "M 150,220 L 215,235 L 215,265 L 175,275 L 150,255 Z", labelX: 185, labelY: 250 },
    { id: "COLIMA", label: "Col", path: "M 130,220 L 150,220 L 150,240 L 130,240 Z", labelX: 140, labelY: 230 },
    { id: "GUERRERO", label: "Guerrero", path: "M 175,275 L 235,260 L 245,295 L 200,310 Z", labelX: 210, labelY: 285 },
    { id: "OAXACA", label: "Oaxaca", path: "M 245,265 L 295,265 L 305,310 L 245,320 L 245,295 Z", labelX: 275, labelY: 290 },
    { id: "TABASCO", label: "Tabasco", path: "M 305,255 L 350,260 L 350,290 L 320,290 Z", labelX: 330, labelY: 273 },
    { id: "CHIAPAS", label: "Chiapas", path: "M 305,290 L 360,290 L 380,330 L 320,335 L 305,310 Z", labelX: 340, labelY: 315 },
    { id: "CAMPECHE", label: "Camp", path: "M 350,250 L 390,255 L 395,300 L 360,295 Z", labelX: 372, labelY: 275 },
    { id: "YUCATAN", label: "Yuc", path: "M 380,225 L 425,230 L 430,265 L 390,255 Z", labelX: 405, labelY: 245 },
    { id: "QUINTANA_ROO", label: "QRoo", path: "M 425,230 L 455,235 L 455,295 L 430,290 L 430,265 Z", labelX: 442, labelY: 260 }
  ];

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <MapPin size={16} className="text-red-400" />
            Distribución geográfica
          </h3>
          <div className="text-xs text-slate-500 mt-1">
            Estados con detecciones de actividad sospechosa
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-950/30 border border-yellow-900/50 rounded-md text-[11px] text-yellow-300">
          <AlertTriangle size={12} />
          <span>Cobertura geo: <strong>{coverage}%</strong> ({withGeo}/{withGeo + withoutGeo})</span>
        </div>
      </div>

      {/* Mapa SVG */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-4 relative">
        <svg viewBox="0 0 470 360" className="w-full" style={{ maxHeight: 400 }}>
          {states.map(function (state) {
            const count = counts[state.id] || 0;
            const fill = getStateColor(count, max);
            const textColor = getTextColor(count, max);
            const isHovered = hoveredState === state.id;

            return (
              <g key={state.id}>
                <path
                  d={state.path}
                  fill={fill}
                  stroke={isHovered ? "#fff" : "#0f172a"}
                  strokeWidth={isHovered ? "1.5" : "0.5"}
                  opacity={count > 0 ? 0.95 : 0.5}
                  style={{ cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={function () { setHoveredState(state.id); }}
                  onMouseLeave={function () { setHoveredState(null); }}
                />
                {count > 0 ? (
                  <text
                    x={state.labelX}
                    y={state.labelY}
                    fill={textColor}
                    fontSize="8"
                    fontWeight="600"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {state.label}
                  </text>
                ) : null}
                {count > 0 ? (
                  <text
                    x={state.labelX}
                    y={state.labelY + 9}
                    fill={textColor}
                    fontSize="7"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {count}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {hoveredState ? (
          <div className="absolute top-3 right-3 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs">
            <div className="font-semibold text-slate-200">{hoveredState.replace(/_/g, " ")}</div>
            <div className="text-slate-400">
              <strong className="text-red-400">{counts[hoveredState] || 0}</strong> detecciones
            </div>
          </div>
        ) : null}
      </div>

      {/* Leyenda de intensidad */}
      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 flex-wrap">
        <div className="flex items-center gap-2">
          <span>Intensidad:</span>
          <div className="flex gap-0.5">
            <div className="w-5 h-3 rounded-sm" style={{ background: "#1e293b" }}></div>
            <div className="w-5 h-3 rounded-sm" style={{ background: "#fef3c7" }}></div>
            <div className="w-5 h-3 rounded-sm" style={{ background: "#fbbf24" }}></div>
            <div className="w-5 h-3 rounded-sm" style={{ background: "#f59e0b" }}></div>
            <div className="w-5 h-3 rounded-sm" style={{ background: "#ea580c" }}></div>
            <div className="w-5 h-3 rounded-sm" style={{ background: "#dc2626" }}></div>
          </div>
          <span className="text-slate-400">0 → {max}+ detecciones</span>
        </div>

        {withoutGeo > 0 ? (
          <div className="text-yellow-400/80">
            {withoutGeo} detecciones sin geolocalizar
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default GeographicHeatmap;
