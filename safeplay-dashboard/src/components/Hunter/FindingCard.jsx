import { Eye, ExternalLink, Shield, Flame, Skull, Crown } from "lucide-react";

function getScoreStyle(score) {
  if (score >= 85) {
    return {
      badge: "bg-red-500/20 text-red-300 border-red-500/40",
      label: "CRITICAL",
      dot: "bg-red-500 animate-pulse"
    };
  }
  if (score >= 70) {
    return {
      badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
      label: "HIGH",
      dot: "bg-orange-500"
    };
  }
  if (score >= 50) {
    return {
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      label: "MEDIUM",
      dot: "bg-amber-500"
    };
  }
  return {
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    label: "LOW",
    dot: "bg-slate-500"
  };
}

function getCategoryLabel(cat) {
  const labels = {
    NARCOCULTURA_ROMANTIZADA: "Narcocultura",
    RECLUTAMIENTO_CRIMINAL: "Reclutamiento",
    PROPAGANDA_DELICTIVA: "Propaganda Delictiva",
    GROOMING: "Grooming",
    CONTACTO_MENORES: "Contacto Menores",
    VIOLENCIA_EXTREMA: "Violencia",
    VENTA_ARMAS: "Venta de Armas",
    CRUCES_FRONTERIZOS: "Cruces Fronterizos",
    PII_PUBLICA: "Datos Personales",
    CONTENIDO_EXTREMO_AZURE_FILTRADO: "Azure Bloqueo",
    SEGURO: "Seguro",
    UNKNOWN: "Desconocido"
  };
  return labels[cat] || cat;
}

function getCartelBadge(cartel) {
  const cartelMap = {
    CJNG: {
      label: "CJNG",
      desc: "Cartel Jalisco Nueva Generacion",
      color: "bg-red-600/30 text-red-200 border-red-500/60",
      icon: "🐓"
    },
    CARTEL_SINALOA: {
      label: "SINALOA",
      desc: "Cartel de Sinaloa",
      color: "bg-purple-600/30 text-purple-200 border-purple-500/60",
      icon: "🍕"
    },
    "LA_MAÑA": {
      label: "LA MAÑA",
      desc: "Referencia general a cartel",
      color: "bg-amber-600/30 text-amber-200 border-amber-500/60",
      icon: "🧿"
    },
    CARTEL_GOLFO: {
      label: "CDG",
      desc: "Cartel del Golfo",
      color: "bg-blue-600/30 text-blue-200 border-blue-500/60",
      icon: "⚓"
    },
    FAMILIA: {
      label: "FAMILIA MICH.",
      desc: "La Familia Michoacana",
      color: "bg-green-600/30 text-green-200 border-green-500/60",
      icon: "🌿"
    },
    ZETAS: {
      label: "ZETAS",
      desc: "Los Zetas",
      color: "bg-slate-600/30 text-slate-200 border-slate-500/60",
      icon: "Z"
    },
    OTRO: {
      label: "OTRO",
      desc: "Cartel no identificado",
      color: "bg-fuchsia-600/30 text-fuchsia-200 border-fuchsia-500/60",
      icon: "?"
    }
  };
  return cartelMap[cartel] || null;
}

function getOfficialCategoryBadge(cat) {
  const map = {
    RECLUTAMIENTO: { label: "RECLUTAMIENTO", color: "bg-red-500/20 text-red-300 border-red-500/40" },
    CRUCES_FRONTERIZOS: { label: "FRONTERA", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    NEGOCIOS_SOSPECHOSOS: { label: "NEGOCIOS", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    PROPAGANDA_DELICTIVA: { label: "PROPAGANDA", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
    VENTA_ARMAS: { label: "ARMAS", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" }
  };
  return map[cat] || null;
}

function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function FindingCard(props) {
  const finding = props.finding;
  const onOpenDossier = props.onOpenDossier;
  const style = getScoreStyle(finding.score);
  const categoryLabel = getCategoryLabel(finding.category);
  const hasThumbnail = finding.video_thumbnail && !finding.azure_filter_triggered;
  const cartelBadge = getCartelBadge(finding.cartel_attribution);
  const officialCatBadge = getOfficialCategoryBadge(finding.official_category);
  const detectedEmojis = finding.detected_emojis || [];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 hover:border-fuchsia-500/40 transition-all duration-200 shadow-lg">
      
      {/* Cartel ribbon - solo si hay atribucion */}
      {cartelBadge ? (
        <div className={"absolute top-0 right-0 z-10 px-3 py-1.5 text-xs font-bold border-l border-b rounded-bl-lg " + cartelBadge.color}>
          <span className="mr-1">{cartelBadge.icon}</span>
          {cartelBadge.label}
        </div>
      ) : null}
      
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-40 h-40 sm:h-auto flex-shrink-0 bg-slate-950">
          {hasThumbnail ? (
            <img
              src={finding.video_thumbnail}
              alt="TikTok thumbnail"
              className="w-full h-full object-cover"
              onError={function(e) { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/40 to-slate-950">
              <div className="text-center">
                <Shield className="mx-auto mb-2 text-red-400" size={32} />
                <div className="text-xs text-red-300 font-semibold">CONTENIDO</div>
                <div className="text-xs text-red-400 font-bold">BLOQUEADO</div>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <div className={"px-2 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 " + style.badge}>
              <div className={"w-1.5 h-1.5 rounded-full " + style.dot}></div>
              {finding.score}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={"px-2 py-0.5 rounded text-xs font-bold border " + style.badge}>
                  {style.label}
                </span>
                <span className="text-xs text-slate-400">{categoryLabel}</span>
                {officialCatBadge ? (
                  <span className={"px-2 py-0.5 rounded text-xs font-bold border " + officialCatBadge.color}>
                    {officialCatBadge.label}
                  </span>
                ) : null}
              </div>
              <h3 className="text-base font-bold text-slate-100">
                {"@" + finding.author_name}
              </h3>
              {finding.author_verified ? (
                <span className="text-xs text-cyan-400">Verificado</span>
              ) : null}
            </div>
          </div>

          {/* SEMIOTIC DECODER - Emojis detectados */}
          {detectedEmojis.length > 0 ? (
            <div className="mb-3 px-3 py-2 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={12} className="text-fuchsia-400" />
                <span className="text-xs text-fuchsia-300 font-bold tracking-wider">CODIGO SEMIOTICO DECODIFICADO</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{detectedEmojis.join(" ")}</span>
                {cartelBadge ? (
                  <span className="text-xs text-slate-400">
                    = Firma {cartelBadge.desc}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
            <span>{formatNumber(finding.author_followers)} followers</span>
            <span>{formatNumber(finding.engagement_plays)} vistas</span>
            <span>{formatNumber(finding.engagement_likes)} likes</span>
          </div>

          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {finding.reason || "Analisis en proceso..."}
          </p>

          {/* Pedagogia criminal si aplica */}
          {finding.pedagogia_criminal && finding.pedagogia_criminal !== "NINGUNA" ? (
            <div className="mb-3">
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-300 text-xs rounded border border-orange-500/30">
                Pedagogia: {finding.pedagogia_criminal.replace(/_/g, " ")}
              </span>
            </div>
          ) : null}

          {finding.indicators && finding.indicators.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {finding.indicators.slice(0, 3).map(function(ind, i) {
                return (
                  <span key={i} className="px-2 py-0.5 bg-fuchsia-500/10 text-fuchsia-300 text-xs rounded border border-fuchsia-500/20">
                    {ind}
                  </span>
                );
              })}
              {finding.indicators.length > 3 ? (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                  {"+" + (finding.indicators.length - 3)}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={function() { onOpenDossier(finding); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-sm rounded-lg border border-fuchsia-500/30 transition"
            >
              <Eye size={14} />
              Ver Dossier
            </button>
            {finding.video_url ? (
              <a
                href={finding.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition"
              >
                <ExternalLink size={14} />
                Ver en TikTok
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
