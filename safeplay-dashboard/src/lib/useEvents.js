import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export function useEvents(limit = 50) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construir URL con key si existe (producción) o sin key (localhost)
      const keyParam = API_KEY ? `&code=${API_KEY}` : "";
      const url = `${API_BASE}/get-events?limit=${limit}${keyParam}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEvents(data.events || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Cargar eventos al montar el componente
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { 
    events, 
    loading, 
    error, 
    lastRefresh,
    refresh: fetchEvents 
  };
}