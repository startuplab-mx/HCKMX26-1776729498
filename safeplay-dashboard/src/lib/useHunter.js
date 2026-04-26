import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export function useHunter() {
  const [hunting, setHunting] = useState(false);
  const [lastHunt, setLastHunt] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const launchHunt = useCallback(async (hashtags, maxPerTag = 15) => {
    setHunting(true);
    setError(null);
    setProgress({
      status: "initializing",
      message: "Inicializando agente de cacería...",
      hashtags: hashtags
    });

    try {
      const keyParam = API_KEY ? `&code=${API_KEY}` : "";
      const url = `${API_BASE}/hunt-tiktok${keyParam ? `?${keyParam.slice(1)}` : ""}`;

      setProgress({
        status: "scanning",
        message: `Escaneando TikTok: ${hashtags.join(", ")}...`,
        hashtags: hashtags
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtags: hashtags,
          max_per_tag: maxPerTag
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLastHunt(data);
      setProgress({
        status: "complete",
        message: `Cacería completa: ${data.findings_detected} amenazas detectadas`,
        ...data
      });

      return data;
    } catch (err) {
      console.error("Error en cacería:", err);
      setError(err.message);
      setProgress({
        status: "error",
        message: err.message
      });
      return null;
    } finally {
      setHunting(false);
    }
  }, []);

  return {
    hunting,
    lastHunt,
    error,
    progress,
    launchHunt
  };
}