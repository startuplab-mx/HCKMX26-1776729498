// Funciones para formatear datos visualmente en el dashboard
// Colores, labels amigables, fechas relativas, etc.

import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Formatea timestamp ISO a "hace 3 minutos" en español
export function timeAgo(isoTimestamp) {
  try {
    return formatDistanceToNow(parseISO(isoTimestamp), {
      addSuffix: true,
      locale: es
    });
  } catch {
    return isoTimestamp;
  }
}

// Formatea timestamp a hora corta "00:36:22"
export function shortTime(isoTimestamp) {
  try {
    const date = parseISO(isoTimestamp);
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return isoTimestamp;
  }
}

// Devuelve clases Tailwind según la acción (colores de severidad)
export function actionStyles(action) {
  switch (action) {
    case "BLOQUEAR":
      return {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        dot: "bg-red-500"
      };
    case "ADVERTIR":
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        dot: "bg-amber-500"
      };
    case "PERMITIR":
    default:
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-500"
      };
  }
}

// Devuelve el color asociado a cada categoría (para charts y badges)
export function categoriaColor(categoria) {
  const colors = {
    SEGURO: "#10b981",        // emerald
    PROFANIDAD: "#f59e0b",    // amber
    PII: "#f97316",           // orange
    PLATAFORMA_EXTERNA: "#8b5cf6", // violet
    GROOMING: "#ef4444",      // red
    AGRESION: "#ec4899"       // pink
  };
  return colors[categoria] || "#64748b"; // slate por default
}

// Label más amigable para mostrar al usuario
export function categoriaLabel(categoria) {
  const labels = {
    SEGURO: "Seguro",
    PROFANIDAD: "Profanidad",
    PII: "Info Personal",
    PLATAFORMA_EXTERNA: "Plataforma Externa",
    GROOMING: "Grooming",
    AGRESION: "Agresión"
  };
  return labels[categoria] || categoria;
}