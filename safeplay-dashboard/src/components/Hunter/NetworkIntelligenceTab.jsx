/**
 * NetworkIntelligenceTab.jsx (DARK MODE)
 * 707 PREDATOR HUNTER - Tab principal de inteligencia de red
 */

import React, { useState } from "react";
import { Network, Instagram, AlertTriangle, Target } from "lucide-react";
import NetworkGraph from "./NetworkGraph";
import ActivityHeatmap from "./ActivityHeatmap";

function NetworkIntelligenceTab(props) {
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;

  const [username, setUsername] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [activeUsername, setActiveUsername] = useState(null);
  const [igMatch, setIgMatch] = useState(null);
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState(null);

  function handleExpandNetwork() {
    if (!username.trim()) {
      alert("Ingresa un username de TikTok (ej: @chapizza_sinaloa)");
      return;
    }
    const urls = videoUrls.split("\n")
      .map(function (u) { return u.trim(); })
      .filter(function (u) { return u.length > 0; });

    if (urls.length === 0) {
      alert("Ingresa al menos una URL de video de TikTok");
      return;
    }

    setScanning(true);
    setScanResult(null);

    const url = apiBaseUrl + "/expand_user_network" + (functionKey ? "?code=" + functionKey : "");
    const body = {
      root_username: username.replace("@", "").trim(),
      video_urls: urls,
      max_comments_per_video: 30
    };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setScanResult(data);
        setScanning(false);
        if (data.success) {
          setActiveUsername(data.root_username);
        }
      })
      .catch(function (err) {
        setScanResult({ error: err.message });
        setScanning(false);
      });
  }

  function handleCrossPlatform() {
    if (!activeUsername) {
      alert("Primero expande la red de un usuario");
      return;
    }
    setIgLoading(true);
    setIgMatch(null);
    setIgError(null);

    const url = apiBaseUrl + "/cross_platform_search" + (functionKey ? "?code=" + functionKey : "");
    const body = {
      tiktok_username: activeUsername,
      tiktok_bio: "",
      tiktok_hashtags: []
    };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          setIgError(data.error);
        } else {
          setIgMatch(data);
        }
        setIgLoading(false);
      })
      .catch(function (err) {
        setIgError(err.message);
        setIgLoading(false);
      });
  }

  function getConfidenceColor(level) {
    if (level === "HIGH") return "text-red-400";
    if (level === "MEDIUM") return "text-yellow-400";
    if (level === "LOW") return "text-blue-400";
    return "text-slate-400";
  }

  function getConfidenceBorder(level) {
    if (level === "HIGH") return "border-l-red-500";
    if (level === "MEDIUM") return "border-l-yellow-500";
    if (level === "LOW") return "border-l-blue-500";
    return "border-l-slate-600";
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
          <Network size={24} className="text-red-400" />
          Network Intelligence
        </h2>
        <p className="text-slate-400">
          Cazamos al reclutador. Decodificamos al que está levantando la mano.
        </p>
      </div>

      {/* Input panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Username sospechoso (TikTok)
            </label>
            <input
              type="text"
              value={username}
              onChange={function (e) { setUsername(e.target.value); }}
              placeholder="@chapizza_sinaloa"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-red-500 focus:outline-none text-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              URLs de videos (una por línea, máx 5)
            </label>
            <textarea
              value={videoUrls}
              onChange={function (e) { setVideoUrls(e.target.value); }}
              placeholder="https://www.tiktok.com/@user/video/123456..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-red-500 focus:outline-none text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExpandNetwork}
            disabled={scanning}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition " + (scanning ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white")}
          >
            <Target size={16} />
            {scanning ? "Cazando..." : "Expandir red de comentarios"}
          </button>

          <button
            onClick={handleCrossPlatform}
            disabled={!activeUsername || igLoading}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition " + ((!activeUsername || igLoading) ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white")}
          >
            <Instagram size={16} />
            {igLoading ? "Buscando IG..." : "Cross-platform: Instagram"}
          </button>
        </div>

        {/* Resultado del scan */}
        {scanResult ? (
          <div className={"mt-4 p-3 rounded-lg text-sm " + (scanResult.error ? "bg-red-950/50 border border-red-800 text-red-300" : "bg-emerald-950/50 border border-emerald-800 text-emerald-300")}>
            {scanResult.error ? (
              <span>Error: {scanResult.error}</span>
            ) : (
              <span>
                ✓ Cacería exitosa: <strong>{scanResult.videos_processed}</strong> videos,{" "}
                <strong>{scanResult.comments_analyzed}</strong> comentarios analizados,{" "}
                <strong className="text-red-300">{scanResult.suspicious_count}</strong> sospechosos detectados
                ({Math.round(scanResult.suspicious_ratio * 100)}% del total)
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Cross-platform match panel */}
      {igMatch ? (
        <div className={"bg-slate-900/50 border border-slate-800 border-l-4 rounded-xl p-6 mb-6 " + getConfidenceBorder(igMatch.confidence_level)}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Instagram size={18} />
                Match cross-platform: Instagram
              </h3>
              {igMatch.instagram_profile ? (
                <div className="mt-3 space-y-2">
                  <div className="text-lg font-semibold text-slate-100">
                    @{igMatch.instagram_profile.username}
                  </div>
                  <div className="text-sm text-slate-400">
                    {igMatch.instagram_profile.followers} followers ·{" "}
                    {igMatch.instagram_profile.posts_count} posts
                    {igMatch.instagram_profile.is_verified ? " · ✓ verificado" : ""}
                    {igMatch.instagram_profile.is_private ? " · 🔒 privado" : ""}
                  </div>
                  {igMatch.instagram_profile.bio ? (
                    <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm italic text-slate-300">
                      "{igMatch.instagram_profile.bio}"
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-slate-400 mt-2">{igMatch.message}</div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Confidence</div>
              <div className={"text-4xl font-bold " + getConfidenceColor(igMatch.confidence_level)}>
                {igMatch.confidence_score}
              </div>
              <div className={"text-xs font-bold " + getConfidenceColor(igMatch.confidence_level)}>
                {igMatch.confidence_level}
              </div>
            </div>
          </div>

          {igMatch.match_indicators && igMatch.match_indicators.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Indicadores del match
              </div>
              <ul className="space-y-1">
                {igMatch.match_indicators.map(function (ind, i) {
                  return (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{ind}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg flex items-start gap-2 text-xs text-yellow-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Match probabilístico - requiere validación humana antes de acción legal</span>
          </div>
        </div>
      ) : null}

      {igError ? (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-300">
          Error en cross-platform search: {igError}
        </div>
      ) : null}

      {/* Grafo + Heatmap */}
      {activeUsername ? (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden" style={{ height: 600 }}>
            <NetworkGraph
              username={activeUsername}
              apiBaseUrl={apiBaseUrl}
              functionKey={functionKey}
            />
          </div>

          <ActivityHeatmap
            username={activeUsername}
            apiBaseUrl={apiBaseUrl}
            functionKey={functionKey}
          />
        </div>
      ) : (
        <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl p-16 text-center">
          <Target size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Sin red activa</h3>
          <p className="text-slate-500 text-sm">
            Ingresa un username y URLs de videos arriba para empezar a cazar.
          </p>
        </div>
      )}
    </div>
  );
}

export default NetworkIntelligenceTab;
