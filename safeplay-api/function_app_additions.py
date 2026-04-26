"""
=============================================================
NETWORK INTELLIGENCE ENDPOINTS
=============================================================
PEGAR AL FINAL DEL function_app.py EXISTENTE.
NO borrar los endpoints que ya tienes (analyze_message, hunt_tiktok, etc).

Asegurate de tener arriba del archivo:
    from network_intelligence import (
        scrape_tiktok_comments,
        classify_comment_intent,
        search_instagram_profile,
        calculate_confidence_score,
        build_user_node,
        build_video_node,
        build_comment_node,
        build_external_profile_node,
        save_node_to_cosmos,
        get_user_network,
    )
=============================================================
"""

import azure.functions as func
import json
import logging
from datetime import datetime, timezone

# Si no tienes el "app" definido, usa el que ya tienes en function_app.py:
# app = func.FunctionApp()


# ============================================================
# 1. EXPAND USER NETWORK
# Endpoint principal: scrapea comentarios y construye grafo
# ============================================================

@app.route(route="expand_user_network", auth_level=func.AuthLevel.FUNCTION)
def expand_user_network(req: func.HttpRequest) -> func.HttpResponse:
    """
    POST /api/expand_user_network
    Body: {
        "root_username": "@usuario",
        "video_urls": ["https://tiktok.com/...", ...],
        "max_comments_per_video": 30
    }

    Output: {
        "root_username": "...",
        "videos_processed": N,
        "comments_analyzed": N,
        "suspicious_count": N,
        "graph_summary": {...}
    }
    """
    logging.info("expand_user_network called")

    try:
        body = req.get_json()
        root_username = body.get("root_username", "").lstrip("@").strip()
        video_urls = body.get("video_urls", [])
        max_comments = body.get("max_comments_per_video", 30)

        if not root_username:
            return func.HttpResponse(
                json.dumps({"error": "root_username es requerido"}),
                status_code=400,
                mimetype="application/json"
            )

        if not video_urls or not isinstance(video_urls, list):
            return func.HttpResponse(
                json.dumps({"error": "video_urls debe ser lista no vacia"}),
                status_code=400,
                mimetype="application/json"
            )

        # Crear nodo raiz del usuario
        root_node = build_user_node(
            username=root_username,
            root_username=root_username,
            platform="tiktok",
            metadata={"source": "expand_user_network", "scan_date": datetime.now(timezone.utc).isoformat()}
        )
        save_node_to_cosmos(root_node)

        videos_processed = 0
        total_comments = 0
        suspicious_count = 0

        for video_url in video_urls[:5]:  # Limite de 5 videos por scan
            # Extraer video_id de URL (tiktok.com/@user/video/1234567890)
            video_id = video_url.rstrip("/").split("/")[-1] if "/" in video_url else video_url

            # Crear nodo de video
            video_node = build_video_node(
                video_id=video_id,
                video_url=video_url,
                root_username=root_username,
                metadata={"posted_by": root_username}
            )
            video_node["edges"].append({"to": root_node["id"], "type": "posted_by"})
            save_node_to_cosmos(video_node)

            # Scrapear comentarios
            comments = scrape_tiktok_comments(video_url, max_comments=max_comments)
            videos_processed += 1

            # Clasificar cada comentario y guardar nodo
            for comment in comments:
                classification = classify_comment_intent(comment["text"])
                comment_node = build_comment_node(
                    comment=comment,
                    video_id=video_id,
                    root_username=root_username,
                    classification=classification
                )
                save_node_to_cosmos(comment_node)
                total_comments += 1

                if classification.get("intent_score", 0) >= 60:
                    suspicious_count += 1

        # Devolver resumen
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "root_username": root_username,
                "videos_processed": videos_processed,
                "comments_analyzed": total_comments,
                "suspicious_count": suspicious_count,
                "suspicious_ratio": round(suspicious_count / total_comments, 2) if total_comments else 0,
                "next_step": f"GET /api/get_user_network?username={root_username}"
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Error en expand_user_network: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================================
# 2. CROSS-PLATFORM SEARCH (Instagram con Confidence Score)
# ============================================================

@app.route(route="cross_platform_search", auth_level=func.AuthLevel.FUNCTION)
def cross_platform_search(req: func.HttpRequest) -> func.HttpResponse:
    """
    POST /api/cross_platform_search
    Body: {
        "tiktok_username": "@usuario",
        "tiktok_bio": "...",
        "tiktok_hashtags": ["chapizza", "mencho"]
    }

    Output: {
        "instagram_profile": {...} or null,
        "confidence_score": 0-100,
        "confidence_level": "HIGH|MEDIUM|LOW|VERY_LOW|NONE",
        "match_indicators": [...]
    }
    """
    logging.info("cross_platform_search called")

    try:
        body = req.get_json()
        tt_username = body.get("tiktok_username", "").lstrip("@").strip()
        tt_bio = body.get("tiktok_bio", "")
        tt_hashtags = body.get("tiktok_hashtags", [])

        if not tt_username:
            return func.HttpResponse(
                json.dumps({"error": "tiktok_username es requerido"}),
                status_code=400,
                mimetype="application/json"
            )

        # Buscar en Instagram
        ig_profile = search_instagram_profile(tt_username)

        if not ig_profile:
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "instagram_profile": None,
                    "confidence_score": 0,
                    "confidence_level": "NONE",
                    "match_indicators": [],
                    "message": f"@{tt_username} no encontrado en Instagram"
                }),
                status_code=200,
                mimetype="application/json"
            )

        # Calcular Confidence Score
        confidence = calculate_confidence_score(
            tiktok_username=tt_username,
            tiktok_bio=tt_bio,
            tiktok_hashtags=tt_hashtags,
            instagram_profile=ig_profile
        )

        # Guardar nodo externo en Cosmos
        external_node = build_external_profile_node(
            ig_profile=ig_profile,
            root_username=tt_username,
            confidence=confidence
        )
        save_node_to_cosmos(external_node)

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "instagram_profile": ig_profile,
                "confidence_score": confidence["confidence"],
                "confidence_level": confidence["level"],
                "match_indicators": confidence["indicators"],
                "node_id": external_node["id"]
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Error en cross_platform_search: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================================
# 3. GET USER NETWORK (devuelve grafo completo)
# ============================================================

@app.route(route="get_user_network", auth_level=func.AuthLevel.FUNCTION)
def get_user_network_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """
    GET /api/get_user_network?username=@xxx
    Output: { nodes: [...], edges: [...], count: N }
    """
    logging.info("get_user_network called")

    try:
        username = req.params.get("username", "").lstrip("@").strip()
        if not username:
            return func.HttpResponse(
                json.dumps({"error": "username es requerido en query string"}),
                status_code=400,
                mimetype="application/json"
            )

        graph = get_user_network(username)

        return func.HttpResponse(
            json.dumps(graph),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Error en get_user_network: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================================
# 4. GET ACTIVITY HEATMAP (cuando postea/comenta el sospechoso)
# ============================================================

@app.route(route="get_activity_heatmap", auth_level=func.AuthLevel.FUNCTION)
def get_activity_heatmap(req: func.HttpRequest) -> func.HttpResponse:
    """
    GET /api/get_activity_heatmap?username=@xxx
    Output: matrix de 7 dias x 24 horas con conteo de actividad
    """
    logging.info("get_activity_heatmap called")

    try:
        username = req.params.get("username", "").lstrip("@").strip()
        if not username:
            return func.HttpResponse(
                json.dumps({"error": "username es requerido"}),
                status_code=400,
                mimetype="application/json"
            )

        graph = get_user_network(username)

        # Construir matriz 7x24 (dia de semana x hora)
        # Indices: 0=lunes, 6=domingo / 0-23 horas
        heatmap = [[0 for _ in range(24)] for _ in range(7)]

        for node in graph["nodes"]:
            created = node.get("data", {}).get("created_at", "")
            if not created:
                continue
            try:
                # Parse ISO datetime
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                day = dt.weekday()  # 0=lunes
                hour = dt.hour
                heatmap[day][hour] += 1
            except Exception:
                continue

        return func.HttpResponse(
            json.dumps({
                "success": True,
                "username": username,
                "heatmap": heatmap,
                "days": ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
                "total_activity": sum(sum(row) for row in heatmap)
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Error en get_activity_heatmap: {e}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
