import { useState } from "react";
import { Target, Loader2, Plus, X, Hash } from "lucide-react";

const QUICK_HASHTAGS = [
  { tag: "plebes", label: "plebes", category: "narcocultura" },
  { tag: "corridosbelicos", label: "corridos belicos", category: "narcocultura" },
  { tag: "pesopluma", label: "Peso Pluma", category: "narcocultura" },
  { tag: "puroplebe", label: "puro plebe", category: "narcocultura" },
  { tag: "wakala", label: "#wakala", category: "reclutamiento" },
  { tag: "chapizza", label: "chapizza", category: "cartel_sinaloa" },
  { tag: "mencho", label: "mencho", category: "cjng" },
  { tag: "4letras", label: "4letras", category: "cjng" },
  { tag: "trabajoparalamaña", label: "trabajo la maña", category: "reclutamiento" },
  { tag: "makabelico", label: "Makabelico", category: "narcocultura" },
  { tag: "belicones", label: "belicones", category: "narcocultura" },
  { tag: "elcomandante", label: "el comandante", category: "narcocultura" }
];

function getCategoryColor(cat) {
  const colors = {
    narcocultura: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    reclutamiento: "border-red-500/40 bg-red-500/10 text-red-300",
    cartel_sinaloa: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    cjng: "border-rose-500/40 bg-rose-500/10 text-rose-300"
  };
  return colors[cat] || "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

export default function HuntLauncher(props) {
  const onLaunch = props.onLaunch;
  const hunting = props.hunting;
  const progress = props.progress;
  
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [maxPerTag, setMaxPerTag] = useState(8);

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(function(t) { return t !== tag; }));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  }

  function addCustomTag() {
    let cleanTag = customTag.trim().replace(/^#/, "").toLowerCase();
    if (!cleanTag) return;
    if (selectedTags.includes(cleanTag)) {
      setCustomTag("");
      return;
    }
    setSelectedTags([...selectedTags, cleanTag]);
    setCustomTag("");
  }

  function handleCustomKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomTag();
    }
  }

  function removeTag(tag) {
    setSelectedTags(selectedTags.filter(function(t) { return t !== tag; }));
  }

  function handleLaunch() {
    if (selectedTags.length === 0) return;
    onLaunch(selectedTags, maxPerTag);
  }

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-br from-slate-900/90 to-fuchsia-950/30 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-fuchsia-400" size={20} />
        <h3 className="text-lg font-bold text-slate-100">
          Iniciar Caceria
        </h3>
        <span className="ml-auto text-xs text-fuchsia-300 font-bold tracking-wider">
          707 PREDATOR HUNTER
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Selecciona hashtags predefinidos o escribe los tuyos. El sistema decodifica emojis, frases disfrazadas y atribuye carteles.
      </p>

      {/* Quick hashtags */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2 font-semibold tracking-wider">
          HASHTAGS RAPIDOS (click para seleccionar)
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_HASHTAGS.map(function(item) {
            const isSelected = selectedTags.includes(item.tag);
            return (
              <button
                key={item.tag}
                onClick={function() { toggleTag(item.tag); }}
                disabled={hunting}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 " + (
                  isSelected
                    ? "bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-500/60 ring-1 ring-fuchsia-500/40"
                    : getCategoryColor(item.category) + " hover:bg-opacity-30"
                )}
              >
                #{item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom hashtag input */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2 font-semibold tracking-wider">
          AGREGAR HASHTAG CUSTOM
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={customTag}
              onChange={function(e) { setCustomTag(e.target.value); }}
              onKeyDown={handleCustomKeyDown}
              disabled={hunting}
              placeholder="ej: belicones, narcoculture, sicariosmx..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/60 disabled:opacity-50"
            />
          </div>
          <button
            onClick={addCustomTag}
            disabled={hunting || !customTag.trim()}
            className="px-4 py-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-sm font-semibold rounded-lg border border-fuchsia-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 ? (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2 font-semibold tracking-wider">
            SELECCIONADOS ({selectedTags.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(function(tag) {
              return (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/20 text-fuchsia-200 text-xs rounded-lg border border-fuchsia-500/40"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={function() { removeTag(tag); }}
                    disabled={hunting}
                    className="text-fuchsia-300 hover:text-white transition disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Max per tag slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 font-semibold tracking-wider">
            VIDEOS POR HASHTAG
          </span>
          <span className="text-sm text-fuchsia-300 font-bold">{maxPerTag}</span>
        </div>
        <input
          type="range"
          min="3"
          max="20"
          value={maxPerTag}
          onChange={function(e) { setMaxPerTag(parseInt(e.target.value)); }}
          disabled={hunting}
          className="w-full"
        />
      </div>

      {/* Launch button */}
      <button
        onClick={handleLaunch}
        disabled={hunting || selectedTags.length === 0}
        className="w-full px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
      >
        {hunting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Cazando... {progress ? "(" + progress.status + ")" : ""}</span>
          </>
        ) : (
          <>
            <Target size={18} />
            <span>INICIAR CACERIA ({selectedTags.length} hashtag{selectedTags.length !== 1 ? "s" : ""})</span>
          </>
        )}
      </button>

      {hunting ? (
        <p className="text-center text-xs text-slate-400 mt-3">
          La caceria toma 60-90 segundos. Apify scrape + IA + analisis semiotico.
        </p>
      ) : null}
    </div>
  );
}
