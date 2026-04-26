/**
 * NetworkIntelligenceTab.jsx (V4 - DARK MODE)
 * 707 PREDATOR HUNTER - Tab principal de inteligencia de red
 *
 * V4: Integra todo
 * - Profile analysis completo
 * - Cross-platform IG con Confidence Score
 * - Grafo 3D + CartelDistribution + GeographicHeatmap
 * - FullDossierModal (HTML + PDF + Email)
 */

import React, { useState } from "react";
import { Network, Search, AlertTriangle, Target, User, FileText } from "lucide-react";
import NetworkGraph from "./NetworkGraph";
import CartelDistribution from "./CartelDistribution";
import GeographicHeatmap from "./GeographicHeatmap";
import FullDossierModal from "./FullDossierModal";

function NetworkIntelligenceTab(props) {
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;

  const [username, setUsername] = useState("");
  const [maxVideos, setMaxVideos] = useState(10);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [activeUsername, setActiveUsername] = useState(null);
  const [igMatch, setIgMatch] = useState(null);
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState(null);
  const [dossierOpen, setDossierOpen] = useState(false);

  function handleAnalyzeProfile() {
    if (!username.trim()) {
      alert("Ingresa un username de TikTok (ej: @chapizza_sinaloa)");
      return;
    }

    setScanning(true);
    setScanResult(null);

    const url = apiBaseUrl + "/analyze-full-profile" + (functionKey ? "?code=" + functionKey : "");
    const body = {
      username: username.replace("@", "").trim(),
      max_videos: maxVideos,
      max_comments_per_video: 20
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
          setActiveUsername(data.username);
        }
      })
      .catch(function (err) {
        setScanResult({ error: err.message });
        setScanning(false);
      });
  }

  function handleCrossPlatform() {
    if (!activeUsername) {
      alert("Primero analiza un perfil");
      return;
    }
    setIgLoading(true);
    setIgMatch(null);
    setIgError(null);

    const url = apiBaseUrl + "/cross-platform-search" + (functionKey ? "?code=" + functionKey : "");
    const bio = (scanResult && scanResult.profile && scanResult.profile.bio) || "";
    const body = {
      tiktok_username: activeUsername,
      tiktok_bio: bio,
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

  function getRiskColor(score) {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-yellow-400";
    return "text-emerald-400";
  }

  function getRiskLabel(score) {
    if (score >= 80) return "ALTO RIESGO";
    if (score >= 60) return "RIESGO MEDIO";
    if (score >= 40) return "RIESGO BAJO";
    return "NORMAL";
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
          <Network size={24} className="text-red-400" />
          Network Intelligence · Profile Analysis
        </h2>
        <p className="text-slate-400">
          Análisis completo de perfil: bio + últimos videos + comentarios. Mapeo automático de red.
        </p>
      </div>

      {/* Input panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Username TikTok a investigar
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={function (e) { setUsername(e.target.value); }}
                placeholder="@chapizza_sinaloa"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-red-500 focus:outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Videos a analizar
            </label>
            <select
              value={maxVideos}
              onChange={function (e) { setMaxVideos(parseInt(e.target.value)); }}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-red-500 focus:outline-none text-sm"
            >
              <option value={5}>Últimos 5 videos (rápido)</option>
              <option value={10}>Últimos 10 videos (recomendado)</option>
              <option value={15}>Últimos 15 videos (profundo)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAnalyzeProfile}
            disabled={scanning}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition " + (scanning ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white")}
          >
            <Target size={16} />
            {scanning ? "Analizando perfil completo..." : "Analizar perfil completo"}
          </button>

          <button
            onClick={handleCrossPlatform}
            disabled={!activeUsername || igLoading}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition " + ((!activeUsername || igLoading) ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white")}
          >
            <Search size={16} />
            {igLoading ? "Buscando IG..." : "Cross-platform: Instagram"}
          </button>

          <button
            onClick={function () { setDossierOpen(true); }}
            disabled={!activeUsername}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition " + (!activeUsername ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white")}
          >
            <FileText size={16} />
            Generar dossier completo
          </button>
        </div>

        {scanning ? (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-300">
            ⏳ Esto puede tardar 30-90 segundos. Estamos scrapeando perfil → videos → comentarios → analizando con IA...
          </div>
        ) : null}

        {scanResult ? (
          <div className={"mt-4 p-4 rounded-lg text-sm " + (scanResult.error || !scanResult.success ? "bg-red-950/50 border border-red-800 text-red-300" : "bg-emerald-950/50 border border-emerald-800 text-emerald-200")}>
            {scanResult.error || !scanResult.success ? (
              <span>Error: {scanResult.error || "Análisis falló"}</span>
            ) : (
              <div>
                <div className="font-semibold mb-2">✓ Análisis completo del perfil @{scanResult.username}</div>
                {scanResult.stats ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                    <div className="bg-slate-950 p-2 rounded">
                      <div className="text-[10px] text-slate-500 uppercase">Videos</div>
                      <div className="text-lg font-bold text-slate-100">{scanResult.stats.videos_processed}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded">
                      <div className="text-[10px] text-slate-500 uppercase">Comentarios</div>
                      <div className="text-lg font-bold text-slate-100">{scanResult.stats.comments_analyzed}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded">
                      <div className="text-[10px] text-slate-500 uppercase">Vids sospechosos</div>
                      <div className="text-lg font-bold text-red-400">{scanResult.stats.suspicious_videos}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded">
                      <div className="text-[10px] text-slate-500 uppercase">Coms sospechosos</div>
                      <div className="text-lg font-bold text-red-400">{scanResult.stats.suspicious_comments}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Profile card */}
      {scanResult && scanResult.success && scanResult.profile ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {scanResult.profile.avatar_url ? (
              <img
                src={scanResult.profile.avatar_url}
                alt={scanResult.profile.username}
                className="w-16 h-16 rounded-full border-2 border-slate-700"
                onError={function (e) { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                <User size={28} className="text-slate-500" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  @{scanResult.profile.username}
                </h3>
                {scanResult.profile.is_verified ? (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">✓ Verificado</span>
                ) : null}
              </div>
              {scanResult.profile.nickname ? (
                <div className="text-sm text-slate-400">{scanResult.profile.nickname}</div>
              ) : null}
              <div className="text-sm text-slate-400 mt-1">
                <strong className="text-slate-200">{scanResult.profile.followers}</strong> followers ·{" "}
                <strong className="text-slate-200">{scanResult.profile.heart_count}</strong> likes
              </div>
              {scanResult.profile.bio ? (
                <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 italic">
                  "{scanResult.profile.bio}"
                </div>
              ) : null}
            </div>
            {scanResult.bio_analysis && scanResult.bio_analysis.intent_score ? (
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-500 uppercase">Bio Risk</div>
                <div className={"text-3xl font-bold " + getRiskColor(scanResult.bio_analysis.intent_score)}>
                  {scanResult.bio_analysis.intent_score}
                </div>
                <div className={"text-[10px] font-bold " + getRiskColor(scanResult.bio_analysis.intent_score)}>
                  {getRiskLabel(scanResult.bio_analysis.intent_score)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Cross-platform match panel */}
      {igMatch ? (
        <div className={"bg-slate-900/50 border border-slate-800 border-l-4 rounded-xl p-6 mb-6 " + getConfidenceBorder(igMatch.confidence_level)}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Search size={18} />
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

      {/* Grafo + Distribuciones */}
      {activeUsername ? (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden" style={{ height: 600 }}>
            <NetworkGraph
              username={activeUsername}
              apiBaseUrl={apiBaseUrl}
              functionKey={functionKey}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CartelDistribution
              username={activeUsername}
              apiBaseUrl={apiBaseUrl}
              functionKey={functionKey}
            />
            <GeographicHeatmap
              username={activeUsername}
              apiBaseUrl={apiBaseUrl}
              functionKey={functionKey}
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl p-16 text-center">
          <Target size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Sin perfil activo</h3>
          <p className="text-slate-500 text-sm">
            Ingresa un username de TikTok arriba para empezar el análisis completo.
          </p>
        </div>
      )}

      {/* Modal del dossier */}
      <FullDossierModal
        username={activeUsername}
        apiBaseUrl={apiBaseUrl}
        functionKey={functionKey}
        isOpen={dossierOpen}
        onClose={function () { setDossierOpen(false); }}
      />
    </div>
  );
}

export default NetworkIntelligenceTab;
