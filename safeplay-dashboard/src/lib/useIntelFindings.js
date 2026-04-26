import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export function useIntelFindings(minScore = 30) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keyParam = API_KEY ? `&code=${API_KEY}` : "";
      const url = `${API_BASE}/get-intel-findings?min_score=${minScore}&limit=100${keyParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFindings(data.findings || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching findings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [minScore]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  return {
    findings,
    loading,
    error,
    lastRefresh,
    refresh: fetchFindings
  };
}