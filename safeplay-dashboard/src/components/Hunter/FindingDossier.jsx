import { useState } from "react";
import { X, Shield, AlertOctagon, FileText, Send, CheckCircle2, ExternalLink, Eye, Loader2, Flame, Mail } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

const SEMIOTIC_DICT = {
  "🥷": { name: "NINJA", meaning: "Operadores cartel encapuchados" },
  "🪖": { name: "CASCO", meaning: "Personas armadas, vestimenta militar" },
  "😈": { name: "DIABLO", meaning: "Amenaza / CJNG / 4 letras / la maña" },
  "👹": { name: "OGRO", meaning: "Variante diablo, asociado Makabelico" },
  "🧿": { name: "OJO TURCO", meaning: "Referencia a la maña" },
  "🍕": { name: "PIZZA", meaning: "Cartel Sinaloa - faccion Chapo (CHAPIZZA)" },
  "🐓": { name: "GALLO", meaning: "CJNG - El Mencho / 4 letras / la maña" },
  "🆖": { name: "NG", meaning: "CJNG (Nueva Generacion)" }
};

const CARTEL_INFO = {
  CJNG: {
    name: "Cartel Jalisco Nueva Generacion",
    leader: "Nemesio Oseguera Cervantes 'El Mencho'",
    color: "from-red-700 to-red-900"
  },
  CARTEL_SINALOA: {
    name: "Cartel de Sinaloa",
    leader: "Joaquin Guzman 'El Chapo' / Los Chapitos",
    color: "from-purple-700 to-purple-900"
  },
  "LA_MAÑA": {
    name: "Referencia general 'La Maña'",
    leader: "Termino genérico para cartel",
    color: "from-amber-700 to-amber-900"
  }
};

function getScoreColor(score) {
  if (score >= 85) return "text-red-400";
  if (score >= 70) return "text-orange-400";
  if (score >= 50) return "text-amber-400";
  return "text-slate-400";
}

function getScoreBarColor(score) {
  if (score >= 85) return "bg-red-500";
  if (score >= 70) return "bg-orange-500";
  return "bg-amber-500";
}

function getSeverityBadge(severity) {
  const map = {
    CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    MEDIUM: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    LOW: "bg-slate-500/20 text-slate-300 border-slate-500/40"
  };
  return map[severity] || map.LOW;
}

function getStatusBadge(status) {
  const map = {
    new: { label: "NUEVO", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
    reviewed: { label: "REVISADO", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
    false_positive: { label: "FALSO POSITIVO", color: "bg-green-500/20 text-green-300 border-green-500/40" },
    escalated: { label: "ESCALADO", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
    reported: { label: "REPORTADO", color: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40" }
  };
  return map[status] || map.new;
}

function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  } catch (e) { return iso; }
}

export default function FindingDossier(props) {
  const finding = props.finding;
  const onClose = props.onClose;
  const onUpdate = props.onUpdate;

  const [loadingAction, setLoadingAction] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(finding ? finding.status || "new" : "new");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");

  if (!finding) return null;

  const scoreColor = getScoreColor(finding.score);
  const scoreBarColor = getScoreBarColor(finding.score);
  const severityBadge = getSeverityBadge(finding.severity);
  const statusInfo = getStatusBadge(currentStatus);
  const hasThumbnail = finding.video_thumbnail && !finding.azure_filter_triggered;
  const detectedEmojis = finding.detected_emojis || [];
  const cartelInfo = CARTEL_INFO[finding.cartel_attribution] || null;
  const fraseDisfrazada = finding.frase_disfrazada_detectada;
  const hasFraseDisfrazada = fraseDisfrazada && fraseDisfrazada !== "NINGUNA";

  function showToast(type, message) {
    setToast({ type: type, message: message });
    setTimeout(function() { setToast(null); }, 4000);
  }

  async function updateStatus(newStatus, actionLabel) {
    setLoadingAction(newStatus);
    try {
      const keyParam = API_KEY ? "?code=" + API_KEY : "";
      const response = await fetch(API_BASE + "/update-finding-status" + keyParam, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_id: finding.id, new_status: newStatus, reviewed_by: "admin" })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      setCurrentStatus(newStatus);
      showToast("success", actionLabel);
      if (onUpdate) setTimeout(function() { onUpdate(); }, 800);
    } catch (err) {
      showToast("error", "Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  }

  function generateDossier() {
    const keyParam = API_KEY ? "&code=" + API_KEY : "";
    const url = API_BASE + "/generate-dossier?finding_id=" + finding.id + keyParam;
    window.open(url, "_blank");
    showToast("info", "Dossier generado en nueva pestana");
  }

  function reportToTikTok() {
    if (finding.video_url) {
      window.open(finding.video_url, "_blank");
      showToast("info", "Abriendo TikTok para reportar");
      setTimeout(function() {
        updateStatus("reported", "Marcado como reportado a TikTok");
      }, 1000);
    } else {
      showToast("error", "No hay URL del video");
    }
  }

  function markFalsePositive() {
    updateStatus("false_positive", "Marcado como falso positivo");
  }

  async function sendEmailToAuthorities() {
    setLoadingAction("email");
    try {
      const keyParam = API_KEY ? "?code=" + API_KEY : "";
      const body = { finding_id: finding.id };
      if (emailRecipient.trim()) {
        body.recipient_email = emailRecipient.trim();
      }
      
      const response = await fetch(API_BASE + "/send-dossier-email" + keyParam, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error desconocido");
      }
      
      const recipients = data.recipients || [];
      showToast("success", "Email enviado a: " + recipients.join(", "));
      setCurrentStatus("escalated");
      setShowEmailInput(false);
      setEmailRecipient("");
      
      if (onUpdate) setTimeout(function() { onUpdate(); }, 1000);
    } catch (err) {
      console.error("Error email:", err);
      showToast("error", "Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
        onClick={function(e) { e.stopPropagation(); }}
      >
        {toast ? (
          <div className={"fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl border max-w-md " + (
            toast.type === "success" ? "bg-green-500/90 border-green-400 text-white" :
            toast.type === "error" ? "bg-red-500/90 border-red-400 text-white" :
            "bg-cyan-500/90 border-cyan-400 text-white"
          )}>
            <div className="font-semibold text-sm">{toast.message}</div>
          </div>
        ) : null}

        <div className="sticky top-0 z-10 bg-gradient-to-r from-fuchsia-900/40 via-slate-950 to-cyan-900/30 backdrop-blur-md border-b border-slate-800 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-fuchsia-400" size={18} />
                <span className="text-xs text-fuchsia-300 font-bold tracking-widest">
                  707 PREDATOR HUNTER + DECODER
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-100">
                {"@" + finding.author_name}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={"px-2 py-0.5 rounded text-xs font-bold border " + severityBadge}>
                  {finding.severity || "-"}
                </span>
                <span className={"px-2 py-0.5 rounded text-xs font-bold border " + statusInfo.color}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-slate-400">
                  Detectado: {formatDate(finding.detected_at)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {cartelInfo ? (
            <div className={"rounded-xl border-2 p-5 bg-gradient-to-br " + cartelInfo.color + " border-red-500/60"}>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="text-yellow-400" size={20} />
                <span className="text-xs text-white font-bold tracking-widest">
                  ATRIBUCION DE CARTEL CONFIRMADA
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{cartelInfo.name}</h3>
              <p className="text-sm text-white/80 mb-3">Lider/Estructura: {cartelInfo.leader}</p>
              {detectedEmojis.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-xs text-white/70 mb-2 font-semibold">FIRMA SEMIOTICA:</div>
                  <div className="text-3xl tracking-widest">{detectedEmojis.join("  ")}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* FRASE DISFRAZADA - Nueva alerta critica */}
          {hasFraseDisfrazada ? (
            <div className="rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10 p-5">
              <div className="flex items-start gap-3">
                <AlertOctagon className="text-yellow-400 flex-shrink-0 mt-0.5" size={24} />
                <div>
                  <div className="text-sm font-bold text-yellow-300 mb-2 tracking-widest">
                    FRASE DISFRAZADA DETECTADA
                  </div>
                  <div className="text-lg text-yellow-100 italic mb-2">
                    "{fraseDisfrazada}"
                  </div>
                  <div className="text-xs text-yellow-200/80">
                    Esta frase aparenta ser una oferta laboral legitima pero contiene indicadores de reclutamiento criminal encubierto (gancho social emocional + lenguaje cartelario).
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {detectedEmojis.length > 0 ? (
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-fuchsia-400" size={18} />
                <h3 className="text-sm font-bold text-fuchsia-300 tracking-wider">
                  CODIGO SEMIOTICO DECODIFICADO
                </h3>
                <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-200 text-xs font-bold rounded border border-fuchsia-500/30">
                  {detectedEmojis.length} emojis cartelarios
                </span>
              </div>
              <div className="space-y-2">
                {detectedEmojis.map(function(emoji, i) {
                  const info = SEMIOTIC_DICT[emoji];
                  if (!info) return null;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-3xl">{emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-fuchsia-200">{info.name}</div>
                        <div className="text-xs text-slate-400">{info.meaning}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-xs text-slate-400 font-semibold tracking-wider mb-2">SCORE DE RIESGO</div>
              <div className={"text-6xl font-bold mb-2 " + scoreColor}>{finding.score}</div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className={"h-full " + scoreBarColor} style={{ width: finding.score + "%" }}></div>
              </div>
              <div className="text-xs text-slate-500">{finding.category}</div>
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {hasThumbnail ? (
                <img src={finding.video_thumbnail} alt="Thumbnail" className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-red-900/40 to-slate-950">
                  <div className="text-center">
                    <Shield className="mx-auto mb-3 text-red-400" size={48} />
                    <div className="text-sm text-red-300 font-bold">CONTENIDO EXTREMO</div>
                    <div className="text-xs text-red-400 mt-1">Azure Content Filter</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/10 to-slate-900/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="text-fuchsia-400" size={18} />
              <h3 className="text-sm font-bold text-fuchsia-300 tracking-wider">ANALISIS 707 AI</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {finding.reason || "Sin analisis disponible"}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs text-slate-500 mb-1">Followers</div>
              <div className="text-lg font-bold text-slate-100">{formatNumber(finding.author_followers)}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs text-slate-500 mb-1">Views</div>
              <div className="text-lg font-bold text-slate-100">{formatNumber(finding.engagement_plays)}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs text-slate-500 mb-1">Likes</div>
              <div className="text-lg font-bold text-slate-100">{formatNumber(finding.engagement_likes)}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs text-slate-500 mb-1">Comentarios</div>
              <div className="text-lg font-bold text-slate-100">{formatNumber(finding.engagement_comments)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">DETALLES DEL POST</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">Descripcion:</div>
                <div className="text-slate-300">{finding.video_description || "-"}</div>
              </div>
              {finding.video_url ? (
                <div>
                  <a href={finding.video_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm">
                    <ExternalLink size={14} />
                    Ver video original en TikTok
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* Email input area - aparece cuando se hace click en Email */}
          {showEmailInput ? (
            <div className="rounded-xl border-2 border-cyan-500/40 bg-cyan-950/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="text-cyan-400" size={18} />
                <h3 className="text-sm font-bold text-cyan-300">ENVIAR DOSSIER POR EMAIL</h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                El email se enviara con el dossier completo adjunto al destinatario que indiques + autoridades configuradas por defecto.
              </p>
              <input
                type="email"
                value={emailRecipient}
                onChange={function(e) { setEmailRecipient(e.target.value); }}
                placeholder="email-de-prueba@ejemplo.com (opcional)"
                className="w-full px-3 py-2 mb-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendEmailToAuthorities}
                  disabled={loadingAction !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                >
                  {loadingAction === "email" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Enviar Email Ahora
                </button>
                <button
                  onClick={function() { setShowEmailInput(false); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 bg-slate-950 border-t border-slate-800 p-4 flex flex-wrap gap-2">
          <button
            onClick={generateDossier}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            <FileText size={16} />
            Ver Dossier PDF
          </button>
          <button
            onClick={function() { setShowEmailInput(!showEmailInput); }}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            <Mail size={16} />
            Enviar a Autoridades
          </button>
          <button
            onClick={reportToTikTok}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {loadingAction === "reported" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Reportar a TikTok
          </button>
          <button
            onClick={markFalsePositive}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm rounded-lg transition"
          >
            {loadingAction === "false_positive" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Falso Positivo
          </button>
        </div>
      </div>
    </div>
  );
}
