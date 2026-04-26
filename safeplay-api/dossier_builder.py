"""
707 PREDATOR HUNTER - Dossier Builder
======================================
Genera el dossier ejecutivo completo en HTML con 6 secciones:
1. Análisis del perfil
2. Comentarios críticos detectados
3. Distribución por cártel
4. Cross-platform validation
5. Distribución geográfica
6. Recomendaciones

Tono: formal gubernamental
Idioma: encabezados bilingues ES/EN, contenido en español
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timezone


# ============================================================
# UTILIDADES
# ============================================================

def generate_folio(username: str) -> str:
    """Genera folio único tipo 707-MX-2026-0427-A04F"""
    today = datetime.now(timezone.utc)
    date_part = today.strftime("%Y-%m%d")
    hash_part = hashlib.md5(username.encode()).hexdigest()[:4].upper()
    return f"707-MX-{date_part}-{hash_part}"


def get_risk_label(score: int) -> dict:
    """Devuelve label, color y nivel según score 0-100"""
    if score >= 80:
        return {"label": "CRÍTICO", "label_en": "CRITICAL", "color": "#dc2626"}
    if score >= 60:
        return {"label": "ALTO", "label_en": "HIGH", "color": "#ea580c"}
    if score >= 40:
        return {"label": "MEDIO", "label_en": "MEDIUM", "color": "#f59e0b"}
    if score >= 20:
        return {"label": "BAJO", "label_en": "LOW", "color": "#84cc16"}
    return {"label": "NORMAL", "label_en": "NORMAL", "color": "#22c55e"}


def get_cartel_label(code: str) -> str:
    """Mapea code interno a nombre legible"""
    mapping = {
        "CJNG": "Cártel Jalisco Nueva Generación (CJNG)",
        "CARTEL_SINALOA": "Cártel de Sinaloa",
        "LA_MANA": "La Maña (Cártel del Golfo / Zetas)",
        "DESCONOCIDO": "Sin atribución clara",
        "NA": "No aplicable",
        "OTROS": "Otros cárteles"
    }
    return mapping.get(code, code)


def get_state_label(code: str) -> str:
    """Mapea code interno a nombre del estado"""
    mapping = {
        "AGUASCALIENTES": "Aguascalientes",
        "BAJA_CALIFORNIA": "Baja California",
        "BAJA_CALIFORNIA_SUR": "Baja California Sur",
        "CAMPECHE": "Campeche",
        "CHIAPAS": "Chiapas",
        "CHIHUAHUA": "Chihuahua",
        "CIUDAD_DE_MEXICO": "Ciudad de México",
        "COAHUILA": "Coahuila",
        "COLIMA": "Colima",
        "DURANGO": "Durango",
        "ESTADO_DE_MEXICO": "Estado de México",
        "GUANAJUATO": "Guanajuato",
        "GUERRERO": "Guerrero",
        "HIDALGO": "Hidalgo",
        "JALISCO": "Jalisco",
        "MICHOACAN": "Michoacán",
        "MORELOS": "Morelos",
        "NAYARIT": "Nayarit",
        "NUEVO_LEON": "Nuevo León",
        "OAXACA": "Oaxaca",
        "PUEBLA": "Puebla",
        "QUERETARO": "Querétaro",
        "QUINTANA_ROO": "Quintana Roo",
        "SAN_LUIS_POTOSI": "San Luis Potosí",
        "SINALOA": "Sinaloa",
        "SONORA": "Sonora",
        "TABASCO": "Tabasco",
        "TAMAULIPAS": "Tamaulipas",
        "TLAXCALA": "Tlaxcala",
        "VERACRUZ": "Veracruz",
        "YUCATAN": "Yucatán",
        "ZACATECAS": "Zacatecas",
        "DESCONOCIDO": "Sin geolocalización"
    }
    return mapping.get(code, code)


def get_classification_label(code: str) -> str:
    mapping = {
        "RECRUITING_INTENT": "Intención de reclutamiento",
        "RECRUITER_OUTREACH": "Reclutador activo",
        "CARTEL_AFFILIATION": "Afiliación cartelaria",
        "SUSPICIOUS_OTHER": "Actividad sospechosa",
        "NORMAL": "Sin riesgo"
    }
    return mapping.get(code, code)


# ============================================================
# CONSTRUCCIÓN DEL DOSSIER
# ============================================================

def build_full_dossier_html(
    username: str,
    profile: dict,
    bio_analysis: dict,
    videos: list,
    top_comments: list,
    cartel_distribution: dict,
    geo_distribution: dict,
    instagram_match: dict = None,
    network_stats: dict = None,
    embed_videos: bool = False
) -> str:
    """
    Construye el HTML completo del dossier.

    Args:
        username: handle TikTok del sujeto
        profile: dict con datos del perfil (followers, bio, etc)
        bio_analysis: clasificación de la bio
        videos: lista de videos analizados con stats
        top_comments: top comentarios con score >= 80
        cartel_distribution: dict de aggregate_by_cartel
        geo_distribution: dict de aggregate_by_state
        instagram_match: dict de cross_platform_search (opcional)
        network_stats: dict con conteos del grafo (opcional)
        embed_videos: si True, embebe iframes (solo para vista web, NO email)
    """

    folio = generate_folio(username)
    fecha_es = datetime.now(timezone.utc).strftime("%d de %B de %Y, %H:%M UTC")
    fecha_en = datetime.now(timezone.utc).strftime("%B %d, %Y, %H:%M UTC")

    profile = profile or {}
    bio = profile.get("bio", "")
    followers = profile.get("followers", 0)
    video_count = profile.get("video_count", 0)
    is_verified = profile.get("is_verified", False)

    bio_score = (bio_analysis or {}).get("intent_score", 0)
    bio_risk = get_risk_label(bio_score)

    # Cartel principal (el más detectado)
    cartel_counts = (cartel_distribution or {}).get("counts", {})
    main_cartel = "DESCONOCIDO"
    if cartel_counts:
        sorted_cartels = sorted(cartel_counts.items(), key=lambda x: x[1], reverse=True)
        for code, count in sorted_cartels:
            if count > 0 and code not in ["DESCONOCIDO", "OTROS"]:
                main_cartel = code
                break

    # Estado base (el más detectado)
    state_counts = (geo_distribution or {}).get("counts", {})
    main_state = "DESCONOCIDO"
    if state_counts:
        sorted_states = sorted(state_counts.items(), key=lambda x: x[1], reverse=True)
        for code, count in sorted_states:
            if count > 0 and code != "DESCONOCIDO":
                main_state = code
                break

    # Calcular riesgo global (promedio ponderado)
    total_threats = (cartel_distribution or {}).get("total", 0)
    coverage_pct = (geo_distribution or {}).get("coverage_percentage", 0)

    # Score global = max(bio_score, top_comment_score promedio)
    if top_comments:
        avg_comment_score = sum(c.get("intent_score", 0) for c in top_comments[:5]) / min(len(top_comments), 5)
        global_score = max(bio_score, int(avg_comment_score))
    else:
        global_score = bio_score
    global_risk = get_risk_label(global_score)

    # ========== HTML ==========
    html = f"""<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dossier 707 · {folio}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1f2937;
    background: #f9fafb;
    line-height: 1.6;
    font-size: 14px;
  }}
  .dossier {{
    max-width: 900px;
    margin: 0 auto;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }}
  .header {{
    background: #18181b;
    color: white;
    padding: 28px 32px;
  }}
  .header-top {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
    gap: 16px;
    flex-wrap: wrap;
  }}
  .logo-block {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .logo {{
    width: 42px;
    height: 42px;
    background: #dc2626;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
  }}
  .logo-text-eyebrow {{
    font-size: 10px;
    color: #a1a1aa;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }}
  .logo-text-title {{
    font-size: 20px;
    font-weight: 600;
    margin-top: 2px;
  }}
  .header-meta {{
    text-align: right;
    font-size: 11px;
    color: #a1a1aa;
    line-height: 1.6;
  }}
  .header-meta strong {{ color: white; }}
  .badge-confidential {{
    display: inline-block;
    margin-top: 6px;
    padding: 4px 10px;
    background: #dc2626;
    color: white;
    border-radius: 3px;
    font-size: 9px;
    letter-spacing: 1.5px;
    font-weight: 600;
  }}
  .header-stats {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding-top: 16px;
    border-top: 0.5px solid #3f3f46;
  }}
  .header-stat-label {{
    font-size: 9px;
    color: #a1a1aa;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }}
  .header-stat-value {{
    font-size: 14px;
    font-weight: 600;
    margin-top: 3px;
  }}
  .section {{
    padding: 26px 32px;
    border-bottom: 0.5px solid #e5e7eb;
  }}
  .section:last-child {{ border-bottom: 0; }}
  .section-eyebrow {{
    font-size: 10px;
    color: #6b7280;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
    font-weight: 600;
  }}
  .section-eyebrow-en {{
    color: #9ca3af;
    font-weight: 400;
  }}
  .summary {{
    font-size: 13.5px;
    line-height: 1.75;
    color: #374151;
  }}
  .summary strong {{ color: #18181b; }}
  .grid-2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }}
  .data-box {{
    background: #f9fafb;
    border: 0.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 14px 16px;
  }}
  .data-box-danger {{
    background: #fef2f2;
    border: 0.5px solid #fecaca;
  }}
  .data-box-title {{
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 10px;
    font-weight: 500;
  }}
  .data-box-danger .data-box-title {{ color: #991b1b; }}
  .data-row {{
    font-size: 12.5px;
    line-height: 1.9;
  }}
  .data-row strong {{ color: #18181b; }}
  .comment-card {{
    border-radius: 5px;
    padding: 12px 16px;
    margin-bottom: 10px;
  }}
  .comment-critical {{
    background: #fef2f2;
    border-left: 3px solid #dc2626;
  }}
  .comment-warning {{
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
  }}
  .comment-header {{
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }}
  .comment-author {{
    font-size: 12.5px;
    font-weight: 600;
  }}
  .comment-author-critical {{ color: #991b1b; }}
  .comment-author-warning {{ color: #92400e; }}
  .comment-score {{
    font-size: 11px;
    font-weight: 600;
  }}
  .comment-text {{
    font-size: 12.5px;
    color: #374151;
    font-style: italic;
    margin-bottom: 5px;
  }}
  .comment-meta {{
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
  }}
  .comment-meta-critical {{ color: #991b1b; }}
  .comment-meta-warning {{ color: #92400e; }}
  .bar-row {{ margin-bottom: 14px; }}
  .bar-row:last-child {{ margin-bottom: 0; }}
  .bar-header {{
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 12.5px;
  }}
  .bar-track {{
    background: #e5e7eb;
    border-radius: 3px;
    height: 8px;
    overflow: hidden;
  }}
  .bar-fill {{
    height: 100%;
    border-radius: 3px;
  }}
  .recommendations {{
    list-style: none;
    padding: 0;
  }}
  .recommendations li {{
    padding: 6px 0;
    font-size: 12.5px;
    color: #374151;
    line-height: 1.7;
  }}
  .recommendations li::before {{
    content: "▸ ";
    color: #dc2626;
    font-weight: 600;
    margin-right: 4px;
  }}
  .footer {{
    background: #f9fafb;
    padding: 20px 32px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6b7280;
    flex-wrap: wrap;
    gap: 8px;
  }}
  .video-card {{
    background: #f9fafb;
    border: 0.5px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }}
  .video-info {{ flex: 1; min-width: 0; }}
  .video-link {{
    color: #2563eb;
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 500;
    word-break: break-all;
  }}
  .video-link:hover {{ text-decoration: underline; }}
  .video-meta {{
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
  }}
  .video-score {{
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    text-align: right;
  }}
  .alert-warning {{
    background: #fffbeb;
    border: 0.5px solid #fde68a;
    border-radius: 4px;
    padding: 10px 14px;
    font-size: 11.5px;
    color: #92400e;
    margin-top: 10px;
  }}
  .geo-states-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }}
  .geo-state-card {{
    padding: 12px;
    border-radius: 6px;
    color: white;
  }}
  .geo-state-name {{
    font-size: 11.5px;
    opacity: 0.95;
    font-weight: 500;
  }}
  .geo-state-count {{
    font-size: 22px;
    font-weight: 700;
    line-height: 1.1;
    margin-top: 3px;
  }}
  .ig-match-card {{
    background: #fef2f2;
    border: 0.5px solid #fecaca;
    border-left: 3px solid #dc2626;
    border-radius: 6px;
    padding: 16px;
  }}
  .video-embed {{
    margin-top: 10px;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
  }}
  @media print {{
    body {{ background: white; }}
    .dossier {{ box-shadow: none; max-width: 100%; }}
    .section {{ page-break-inside: avoid; }}
    .video-embed {{ display: none; }}
  }}
</style>
</head>
<body>

<div class="dossier">

<!-- HEADER -->
<div class="header">
  <div class="header-top">
    <div class="logo-block">
      <div class="logo">707</div>
      <div>
        <div class="logo-text-eyebrow">Dossier de Inteligencia / Intelligence Report</div>
        <div class="logo-text-title">Reporte de Actividad Sospechosa</div>
      </div>
    </div>
    <div class="header-meta">
      <div>Folio: <strong>{folio}</strong></div>
      <div>Generado / Generated: <strong>{fecha_es}</strong></div>
      <div><span class="badge-confidential">CONFIDENCIAL · CLASSIFIED</span></div>
    </div>
  </div>
  <div class="header-stats">
    <div>
      <div class="header-stat-label">Sujeto / Subject</div>
      <div class="header-stat-value">@{username}</div>
    </div>
    <div>
      <div class="header-stat-label">Riesgo Global / Global Risk</div>
      <div class="header-stat-value" style="color: {global_risk['color']};">{global_risk['label']} · {global_score}/100</div>
    </div>
    <div>
      <div class="header-stat-label">Cártel Probable / Probable Cartel</div>
      <div class="header-stat-value">{get_cartel_label(main_cartel)}</div>
    </div>
    <div>
      <div class="header-stat-label">Estado Base / Base State</div>
      <div class="header-stat-value">{get_state_label(main_state)}</div>
    </div>
  </div>
</div>

<!-- RESUMEN EJECUTIVO -->
<div class="section">
  <div class="section-eyebrow">Resumen Ejecutivo · <span class="section-eyebrow-en">Executive Summary</span></div>
  <p class="summary">
    El sujeto bajo análisis <strong>@{username}</strong> presenta indicadores consistentes con actividad de reclutamiento digital de menores asociada a <strong>{get_cartel_label(main_cartel)}</strong>, con base de operación probable en <strong>{get_state_label(main_state)}</strong>. El análisis automatizado de los últimos {len(videos)} videos publicados detectó <strong>{total_threats}</strong> indicadores de amenaza en comentarios, de los cuales <strong>{len([c for c in top_comments if c.get('intent_score', 0) >= 80])}</strong> han sido clasificados como críticos. Se recomienda revisión manual y coordinación con autoridades competentes.
  </p>
</div>

<!-- SECCIÓN 1: ANÁLISIS DEL PERFIL -->
<div class="section">
  <div class="section-eyebrow">Sección 1 · Análisis del Perfil / <span class="section-eyebrow-en">Profile Analysis</span></div>
  <div class="grid-2">
    <div class="data-box">
      <div class="data-box-title">Datos del perfil TikTok</div>
      <div class="data-row"><strong>Handle:</strong> @{username}</div>
      <div class="data-row"><strong>Followers:</strong> {followers:,}</div>
      <div class="data-row"><strong>Videos totales:</strong> {video_count}</div>
      <div class="data-row"><strong>Verificado:</strong> {"Sí" if is_verified else "No"}</div>
      <div class="data-row"><strong>Bio Risk Score:</strong> <span style="color: {bio_risk['color']}; font-weight: 600;">{bio_score}/100 · {bio_risk['label']}</span></div>
    </div>
    <div class="data-box data-box-danger">
      <div class="data-box-title">Indicadores semióticos detectados</div>
"""

    # Detectados de la bio + de los comentarios top
    all_emojis = set((bio_analysis or {}).get("detected_emojis", []))
    all_phrases = set((bio_analysis or {}).get("detected_phrases", []))
    for c in top_comments[:10]:
        all_emojis.update(c.get("detected_emojis", []) or [])
        all_phrases.update(c.get("detected_phrases", []) or [])

    if all_emojis:
        for emoji in list(all_emojis)[:5]:
            html += f'      <div class="data-row">{emoji} emoji cartelario detectado</div>\n'
    if all_phrases:
        for phrase in list(all_phrases)[:5]:
            html += f'      <div class="data-row">"{phrase}" · frase identificada</div>\n'

    if not all_emojis and not all_phrases:
        html += '      <div class="data-row" style="color: #6b7280;">Sin indicadores semióticos directos</div>\n'

    if bio:
        bio_excerpt = bio[:200].replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
        html += f"""    </div>
  </div>
  <div style="margin-top: 14px; padding: 12px 14px; background: #f9fafb; border: 0.5px solid #e5e7eb; border-radius: 6px; font-size: 12.5px; color: #374151; font-style: italic;">
    Bio: "{bio_excerpt}"
  </div>
</div>
"""
    else:
        html += "    </div>\n  </div>\n</div>\n"

    # ========== SECCIÓN 2: COMENTARIOS CRÍTICOS ==========
    html += f"""
<!-- SECCIÓN 2: COMENTARIOS CRÍTICOS -->
<div class="section">
  <div class="section-eyebrow">Sección 2 · Comentarios Críticos Detectados / <span class="section-eyebrow-en">Critical Comments Detected</span></div>
  <div style="font-size: 11.5px; color: #6b7280; margin-bottom: 12px;">Top {min(len(top_comments), 5)} comentarios con score ≥ 80 (de {total_threats} detectados en total)</div>
"""

    if top_comments:
        for comment in top_comments[:5]:
            score = comment.get("intent_score", 0)
            text = comment.get("text", "")[:200].replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
            author = comment.get("username", "anonimo")
            classification = comment.get("classification", "")
            cartel = comment.get("cartel_attribution", "")

            css_card = "comment-critical" if score >= 80 else "comment-warning"
            css_author = "comment-author-critical" if score >= 80 else "comment-author-warning"
            css_meta = "comment-meta-critical" if score >= 80 else "comment-meta-warning"
            score_color = "#dc2626" if score >= 80 else "#b45309"

            meta_parts = [get_classification_label(classification)]
            if cartel and cartel not in ["NA", "DESCONOCIDO"]:
                meta_parts.append(get_cartel_label(cartel))

            html += f"""  <div class="comment-card {css_card}">
    <div class="comment-header">
      <span class="comment-author {css_author}">@{author}</span>
      <span class="comment-score" style="color: {score_color};">SCORE {score}</span>
    </div>
    <div class="comment-text">"{text}"</div>
    <div class="comment-meta {css_meta}">{' · '.join(meta_parts)}</div>
  </div>
"""
    else:
        html += '  <div style="font-size: 12px; color: #6b7280; padding: 16px; text-align: center;">Sin comentarios críticos detectados en este análisis.</div>\n'

    html += "</div>\n"

    # ========== SECCIÓN 3: VIDEOS ANALIZADOS ==========
    html += f"""
<!-- SECCIÓN 3: VIDEOS ANALIZADOS -->
<div class="section">
  <div class="section-eyebrow">Sección 3 · Videos Analizados / <span class="section-eyebrow-en">Analyzed Videos</span></div>
  <div style="font-size: 11.5px; color: #6b7280; margin-bottom: 12px;">{len(videos)} videos del sujeto fueron procesados con análisis semántico e identificación de patrones</div>
"""

    if videos:
        for v in videos[:10]:
            v_score = v.get("video_intent_score", 0)
            v_class = v.get("video_classification", "NORMAL")
            v_url = v.get("video_url", "#")
            v_id = v.get("video_id", "")
            v_desc = v.get("description", "")[:100].replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
            v_likes = v.get("like_count", 0)
            v_comments = v.get("comment_count", 0)

            score_color = "#dc2626" if v_score >= 80 else "#f59e0b" if v_score >= 60 else "#6b7280"

            html += f"""  <div class="video-card">
    <div class="video-info">
      <a href="{v_url}" class="video-link" target="_blank" rel="noopener">{v_url}</a>
      <div class="video-meta">{v_likes:,} likes · {v_comments:,} comentarios{' · ' + v_desc if v_desc else ''}</div>
    </div>
    <div class="video-score" style="color: {score_color};">{v_score}<div style="font-size: 9px; font-weight: 500; letter-spacing: 1px; opacity: 0.8;">SCORE</div></div>
  </div>
"""
            # Embed solo si embed_videos=True (versión web)
            if embed_videos and v_id:
                html += f"""  <div class="video-embed">
    <blockquote class="tiktok-embed" cite="{v_url}" data-video-id="{v_id}" style="max-width: 605px; min-width: 325px; margin: 0;">
      <section><a target="_blank" href="{v_url}">Ver video en TikTok</a></section>
    </blockquote>
  </div>
"""
    else:
        html += '  <div style="font-size: 12px; color: #6b7280; padding: 16px; text-align: center;">Sin videos en el análisis.</div>\n'

    if embed_videos:
        html += '  <script async src="https://www.tiktok.com/embed.js"></script>\n'

    html += "</div>\n"

    # ========== SECCIÓN 4: DISTRIBUCIÓN POR CÁRTEL ==========
    html += f"""
<!-- SECCIÓN 4: DISTRIBUCIÓN POR CÁRTEL -->
<div class="section">
  <div class="section-eyebrow">Sección 4 · Distribución por Cártel / <span class="section-eyebrow-en">Cartel Distribution</span></div>
  <div class="data-box" style="background: #f9fafb;">
"""

    cartel_colors = {
        "CJNG": "#dc2626",
        "CARTEL_SINALOA": "#f97316",
        "LA_MANA": "#eab308",
        "OTROS": "#94a3b8",
        "DESCONOCIDO": "#64748b"
    }

    cartel_total = sum(cartel_counts.values()) or 1
    cartel_max = max(cartel_counts.values()) if cartel_counts else 1

    if cartel_counts and any(c > 0 for c in cartel_counts.values()):
        sorted_cartels = sorted(cartel_counts.items(), key=lambda x: x[1], reverse=True)
        for code, count in sorted_cartels:
            if count == 0:
                continue
            label = get_cartel_label(code)
            color = cartel_colors.get(code, "#64748b")
            pct = round((count / cartel_total) * 100)
            width_pct = round((count / cartel_max) * 100)

            html += f"""    <div class="bar-row">
      <div class="bar-header">
        <span><strong>{label}</strong></span>
        <span><strong>{count}</strong> detecciones · {pct}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background: {color}; width: {width_pct}%;"></div>
      </div>
    </div>
"""
    else:
        html += '    <div style="font-size: 12px; color: #6b7280; padding: 16px; text-align: center;">Sin datos de atribución cartelaria.</div>\n'

    html += "  </div>\n</div>\n"

    # ========== SECCIÓN 5: CROSS-PLATFORM ==========
    if instagram_match:
        ig_profile = instagram_match.get("instagram_profile") or {}
        ig_score = instagram_match.get("confidence_score", 0)
        ig_level = instagram_match.get("confidence_level", "NONE")
        ig_indicators = instagram_match.get("match_indicators", [])

        if ig_profile:
            ig_username_val = ig_profile.get("username", "")
            ig_followers_val = ig_profile.get("followers", 0)
            ig_posts_val = ig_profile.get("posts_count", 0)
            ig_bio_val = (ig_profile.get("bio", "") or "")[:200].replace('"', '&quot;')

            html += f"""
<!-- SECCIÓN 5: CROSS-PLATFORM -->
<div class="section">
  <div class="section-eyebrow">Sección 5 · Validación Cross-Platform / <span class="section-eyebrow-en">Cross-Platform Validation</span></div>
  <div class="ig-match-card">
    <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 12px;">
      <div style="flex: 1;">
        <div style="font-size: 13.5px; font-weight: 600; margin-bottom: 4px;">Match en Instagram / Instagram Match</div>
        <div style="font-size: 12.5px; color: #18181b; font-weight: 500;">@{ig_username_val}</div>
        <div style="font-size: 11.5px; color: #6b7280;">{ig_followers_val:,} followers · {ig_posts_val} posts</div>
        {f'<div style="margin-top: 8px; font-size: 12px; color: #374151; font-style: italic;">"{ig_bio_val}"</div>' if ig_bio_val else ''}
      </div>
      <div style="text-align: right; flex-shrink: 0;">
        <div style="font-size: 28px; font-weight: 700; color: #dc2626; line-height: 1;">{ig_score}</div>
        <div style="font-size: 10px; color: #dc2626; font-weight: 600; letter-spacing: 1px; margin-top: 2px;">CONFIDENCE {ig_level}</div>
      </div>
    </div>
"""
            if ig_indicators:
                html += '    <div style="font-size: 11.5px; color: #374151; line-height: 1.7;"><strong>Indicadores del match:</strong>\n'
                for ind in ig_indicators:
                    html += f'      <div>• {ind}</div>\n'
                html += '    </div>\n'

            html += """  </div>
  <div class="alert-warning">
    ⚠ Match probabilístico. Requiere validación humana antes de cualquier acción legal. / Probabilistic match. Requires human validation before any legal action.
  </div>
</div>
"""

    # ========== SECCIÓN 6: DISTRIBUCIÓN GEOGRÁFICA ==========
    html += f"""
<!-- SECCIÓN 6: DISTRIBUCIÓN GEOGRÁFICA -->
<div class="section">
  <div class="section-eyebrow">Sección 6 · Distribución Geográfica / <span class="section-eyebrow-en">Geographic Distribution</span></div>
  <div style="font-size: 11.5px; color: #6b7280; margin-bottom: 10px;">Estados con mayor incidencia · Cobertura de geolocalización: <strong>{coverage_pct}%</strong></div>
  <div class="geo-states-grid">
"""

    geo_colors = ["#dc2626", "#ea580c", "#f97316", "#f59e0b", "#fbbf24", "#84cc16"]
    if state_counts:
        sorted_states = [(k, v) for k, v in sorted(state_counts.items(), key=lambda x: x[1], reverse=True) if v > 0 and k != "DESCONOCIDO"]
        for i, (code, count) in enumerate(sorted_states[:6]):
            color = geo_colors[min(i, len(geo_colors) - 1)]
            label = get_state_label(code)
            text_color = "white" if i < 4 else "#78350f"
            html += f"""    <div class="geo-state-card" style="background: {color}; color: {text_color};">
      <div class="geo-state-name">{label}</div>
      <div class="geo-state-count">{count}</div>
    </div>
"""

    if not state_counts or all(v == 0 for v in state_counts.values()):
        html += '    <div style="font-size: 12px; color: #6b7280; padding: 16px; text-align: center;">Sin datos geográficos disponibles.</div>\n'

    html += "  </div>\n</div>\n"

    # ========== SECCIÓN 7: RECOMENDACIONES ==========
    html += f"""
<!-- SECCIÓN 7: RECOMENDACIONES -->
<div class="section">
  <div class="section-eyebrow">Sección 7 · Recomendaciones / <span class="section-eyebrow-en">Recommendations</span></div>
  <ul class="recommendations">
    <li>Notificar a Fiscalía General de la República (FGR) · UEIDDAPI / Notify Federal Attorney General's Office</li>
    <li>Reportar handle a TikTok México vía canal oficial de denuncia / Report handle to TikTok Mexico through official complaint channel</li>
    <li>Cruzar @{username} contra base de datos de Comisión Nacional de Búsqueda (CNB) / Cross-reference against National Search Commission database</li>
"""

    if instagram_match and instagram_match.get("instagram_profile"):
        html += '    <li>Validar manualmente el match cross-platform de Instagram identificado / Manually validate the identified Instagram cross-platform match</li>\n'

    if main_state != "DESCONOCIDO":
        html += f'    <li>Coordinar con Fiscalía Estatal de {get_state_label(main_state)} / Coordinate with {get_state_label(main_state)} State Attorney</li>\n'

    html += f"""    <li>Mantener vigilancia activa sobre la red identificada · re-escaneo recomendado en 7 días / Maintain active surveillance over the identified network · re-scan recommended in 7 days</li>
  </ul>
</div>

<!-- FOOTER -->
<div class="footer">
  <span>707 Predator Hunter + Decoder · Hackathon404 CDMX 2026 · Equipo 08</span>
  <span>v4.2 · Powered by Azure OpenAI · CONFIDENCIAL · CLASSIFIED</span>
</div>

</div>
</body>
</html>"""

    return html
