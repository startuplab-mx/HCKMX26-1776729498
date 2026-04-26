/**
 * NetworkGraph.jsx (3D VERSION)
 * 707 PREDATOR HUNTER - Visualizacion del grafo de inteligencia EN 3D
 *
 * Usa react-force-graph-3d (Three.js)
 */

import React, { useState, useEffect, useRef } from "react";
import ForceGraph3D from "react-force-graph-3d";

function NetworkGraph(props) {
  const username = props.username;
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;
  const onNodeClick = props.onNodeClick;

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ total: 0, suspicious: 0, external: 0 });
  const fgRef = useRef();

  function getNodeColor(node) {
    if (node.type === "user") return "#dc2626";
    if (node.type === "video") return "#f97316";
    if (node.type === "comment") {
      const score = node.intent_score || 0;
      if (score >= 80) return "#dc2626";
      if (score >= 60) return "#eab308";
      if (score >= 40) return "#fbbf24";
      return "#64748b";
    }
    if (node.type === "external_profile") return "#a855f7";
    return "#64748b";
  }

  function getNodeSize(node) {
    if (node.type === "user") return 8;
    if (node.type === "video") return 5;
    if (node.type === "external_profile") return 6;
    if (node.type === "comment") {
      const score = node.intent_score || 0;
      return 2 + (score / 100) * 4;
    }
    return 3;
  }

  function loadGraph() {
    if (!username) return;
    setLoading(true);
    const cleanUsername = username.replace("@", "").trim();
    const url = apiBaseUrl + "/get-user-network?username=" + cleanUsername + (functionKey ? "&code=" + functionKey : "");

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          console.error("Error grafo:", data.error);
          setLoading(false);
          return;
        }
        const nodes = data.nodes || [];
        const links = (data.edges || []).map(function (edge) {
          return { source: edge.source, target: edge.target, type: edge.type };
        });
        const nodeIds = new Set(nodes.map(function (n) { return n.id; }));
        const validLinks = links.filter(function (l) {
          return nodeIds.has(l.source) && nodeIds.has(l.target);
        });
        setGraphData({ nodes: nodes, links: validLinks });

        const suspicious = nodes.filter(function (n) { return (n.intent_score || 0) >= 60; }).length;
        const external = nodes.filter(function (n) { return n.type === "external_profile"; }).length;
        setStats({ total: nodes.length, suspicious: suspicious, external: external });
        setLoading(false);
      })
      .catch(function (err) {
        console.error("Error fetch graph:", err);
        setLoading(false);
      });
  }

  useEffect(function () {
    loadGraph();
  }, [username]);

  function handleNodeClick(node) {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
    // Centrar camara en el nodo
    if (fgRef.current && node.x !== undefined) {
      const distance = 80;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        2000
      );
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Stats overlay */}
      <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800 px-4 py-3 rounded-lg z-10 text-xs backdrop-blur-md">
        <div className="font-semibold text-red-400 mb-1">Network Intelligence · 3D</div>
        <div className="text-slate-300">Nodos: <strong className="text-slate-100">{stats.total}</strong></div>
        <div className="text-slate-300">Sospechosos: <strong className="text-red-400">{stats.suspicious}</strong></div>
        <div className="text-slate-300">Cross-platform: <strong className="text-fuchsia-400">{stats.external}</strong></div>
      </div>

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 px-3 py-2.5 rounded-lg z-10 text-[11px] backdrop-blur-md">
        <div className="font-semibold text-slate-200 mb-1.5">Leyenda</div>
        <LegendItem color="#dc2626" label="Usuario / Crítico" />
        <LegendItem color="#f97316" label="Video" />
        <LegendItem color="#eab308" label="Comentario sospechoso" />
        <LegendItem color="#a855f7" label="Cross-platform (IG)" />
        <LegendItem color="#64748b" label="Comentario neutro" />
      </div>

      {/* Controles ayuda */}
      <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-800 px-3 py-2 rounded-lg z-10 text-[10px] text-slate-400 backdrop-blur-md">
        🖱 Drag = rotar · Scroll = zoom · Click = enfocar
      </div>

      {/* Loading */}
      {loading ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 border border-slate-800 px-6 py-4 rounded-lg z-20 text-sm text-slate-300">
          Cargando grafo 3D...
        </div>
      ) : null}

      {/* Panel detalle de nodo */}
      {selectedNode ? (
        <div className="absolute top-3 right-3 bg-slate-950/95 border border-slate-800 p-4 rounded-lg z-10 max-w-xs text-xs backdrop-blur-md">
          <div className="flex justify-between items-center mb-2">
            <strong className="text-slate-100 text-sm">Detalle del nodo</strong>
            <button
              onClick={function () { setSelectedNode(null); }}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            >×</button>
          </div>
          <NodeDetail node={selectedNode} />
        </div>
      ) : null}

      {/* Grafo 3D */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={function (node) {
          return node.label || node.id;
        }}
        nodeColor={getNodeColor}
        nodeVal={getNodeSize}
        nodeOpacity={0.9}
        nodeResolution={16}
        linkColor={function () { return "rgba(148, 163, 184, 0.3)"; }}
        linkWidth={0.5}
        linkOpacity={0.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        backgroundColor="#0f172a"
        showNavInfo={false}
        controlType="orbit"
        cooldownTime={3000}
      />
    </div>
  );
}

function LegendItem(props) {
  return (
    <div className="flex items-center gap-2 mb-1 text-slate-300">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: props.color }}></div>
      <span>{props.label}</span>
    </div>
  );
}

function NodeDetail(props) {
  const node = props.node;
  const data = node.data || {};

  if (node.type === "user") {
    return (
      <div className="space-y-1 text-slate-300">
        <div><span className="text-slate-500">Tipo:</span> Usuario raíz</div>
        <div><span className="text-slate-500">Handle:</span> @{node.label}</div>
        <div><span className="text-slate-500">Plataforma:</span> {node.platform}</div>
      </div>
    );
  }

  if (node.type === "comment") {
    const scoreColor = node.intent_score >= 60 ? "text-red-400" : "text-slate-400";
    return (
      <div className="space-y-1 text-slate-300">
        <div><span className="text-slate-500">Tipo:</span> Comentario</div>
        <div><span className="text-slate-500">Autor:</span> @{node.label}</div>
        <div>
          <span className="text-slate-500">Score:</span>{" "}
          <span className={scoreColor + " font-semibold"}>{node.intent_score}/100</span>
        </div>
        <div><span className="text-slate-500">Clase:</span> {node.classification}</div>
        <div className="mt-2 p-2 bg-slate-900 border border-slate-800 rounded italic text-slate-300">
          "{(data.text || "").substring(0, 150)}"
        </div>
        {data.detected_phrases && data.detected_phrases.length > 0 ? (
          <div className="mt-2">
            <span className="text-slate-500">Frases:</span>{" "}
            <span className="text-yellow-400">{data.detected_phrases.join(", ")}</span>
          </div>
        ) : null}
        {data.cartel_attribution && data.cartel_attribution !== "NA" ? (
          <div className="mt-2 text-red-400 font-semibold">
            ⚠ Cartel: {data.cartel_attribution}
          </div>
        ) : null}
      </div>
    );
  }

  if (node.type === "external_profile") {
    const profile = data.profile_data || {};
    const confColor = data.confidence_score >= 70 ? "text-red-400" : data.confidence_score >= 40 ? "text-yellow-400" : "text-slate-400";
    return (
      <div className="space-y-1 text-slate-300">
        <div><span className="text-slate-500">Tipo:</span> Instagram (cross-platform)</div>
        <div><span className="text-slate-500">Handle:</span> @{profile.username}</div>
        <div><span className="text-slate-500">Followers:</span> {profile.followers}</div>
        <div><span className="text-slate-500">Posts:</span> {profile.posts_count}</div>
        <div className="mt-2">
          <span className="text-slate-500">Confidence:</span>{" "}
          <span className={confColor + " font-semibold"}>
            {data.confidence_score}/100 ({data.confidence_level})
          </span>
        </div>
      </div>
    );
  }

  if (node.type === "video") {
    return (
      <div className="space-y-1 text-slate-300">
        <div><span className="text-slate-500">Tipo:</span> Video TikTok</div>
        <div className="break-all text-[10px] mt-1 text-slate-400">{data.video_url}</div>
      </div>
    );
  }

  return <div className="text-slate-400">{JSON.stringify(node, null, 2)}</div>;
}

export default NetworkGraph;
