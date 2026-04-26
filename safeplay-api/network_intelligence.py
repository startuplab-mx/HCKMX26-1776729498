"""
707 PREDATOR HUNTER - Network Intelligence Module
=================================================
Modulo de inteligencia de red para construir grafos de actividad sospechosa.

Funcionalidades:
- Scraping de comentarios de TikTok via Apify
- Clasificacion de intencion con Azure OpenAI (deteccion de "yo jalo")
- Cross-platform matching con Instagram + Confidence Score
- Persistencia de nodos y aristas en Cosmos DB

Author: Poncho (Hackathon404 - 707 Predator Hunter + Decoder)
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from apify_client import ApifyClient
from openai import AzureOpenAI
from azure.cosmos import CosmosClient

# ============================================================
# CONFIGURACION
# ============================================================

APIFY_TOKEN = os.environ.get("APIFY_TOKEN")
APIFY_COMMENTS_ACTOR = os.environ.get("APIFY_COMMENTS_ACTOR", "clockworks/tiktok-comments-scraper")
APIFY_INSTAGRAM_ACTOR = os.environ.get("APIFY_INSTAGRAM_ACTOR", "apify/instagram-scraper")

AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "safeplay-openai-dev")

COSMOS_ENDPOINT = os.environ.get("COSMOS_ENDPOINT")
COSMOS_KEY = os.environ.get("COSMOS_KEY")
COSMOS_DATABASE = "safeplay"
COSMOS_NETWORK_CONTAINER = os.environ.get("COSMOS_NETWORK_CONTAINER", "network_nodes")

# ============================================================
# CLIENTES
# ============================================================

def get_apify_client():
    return ApifyClient(APIFY_TOKEN)

def get_openai_client():
    return AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        api_version="2024-08-01-preview",
        azure_endpoint=AZURE_OPENAI_ENDPOINT
    )

def get_cosmos_container():
    client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
    database = client.get_database_client(COSMOS_DATABASE)
    return database.get_container_client(COSMOS_NETWORK_CONTAINER)


# ============================================================
# PROMPT DE CLASIFICACION DE INTENCION
# ============================================================

INTENT_CLASSIFICATION_PROMPT = """Eres un analista de inteligencia especializado en deteccion de reclutamiento DIGITAL de menores por crimen organizado mexicano.

Vas a clasificar UN comentario de TikTok escrito en espanol mexicano. Tu salida debe ser SOLO un JSON valido, sin markdown ni explicaciones.

CATEGORIAS:

1. RECRUITING_INTENT (score 80-100): El comentarista esta LEVANTANDO LA MANO para ser reclutado.
   Frases tipicas:
   - "yo jalo", "yo le entro", "como le entro", "donde jalo"
   - "info", "info al privado", "pasame el dato", "datos"
   - "me apunto", "estoy listo", "necesito chamba"
   - "donde reporto", "donde voy", "cuanto pagan"
   - "quiero entrar", "estoy disponible", "soy de [ciudad]"

2. RECRUITER_OUTREACH (score 80-100): El comentarista ES el reclutador.
   Frases tipicas:
   - "manda DM", "escribeme al privado", "WhatsApp [numero]"
   - "se busca personal", "hay chamba", "tenemos vacantes"
   - "corte de agave", "trabajo bien pagado", "viajes pagados"

3. CARTEL_AFFILIATION (score 60-80): El comentarista muestra afiliacion clara.
   Indicadores:
   - Emojis cartelarios: 🍕🐓🆖🥷🪖😈👹🧿
   - Hashtags narco: #chapizza, #4letras, #wakala, #mencho, #makabelico
   - Saludos cartelarios: "puro [cartel]", "arriba [cartel]"

4. SUSPICIOUS_OTHER (score 40-60): Algo sospechoso pero no encaja arriba.

5. NORMAL (score 0-30): Comentario inofensivo (fan, broma, opinion).

FORMATO DE SALIDA (JSON estricto):
{
  "classification": "RECRUITING_INTENT|RECRUITER_OUTREACH|CARTEL_AFFILIATION|SUSPICIOUS_OTHER|NORMAL",
  "intent_score": 0-100,
  "detected_phrases": ["frase1", "frase2"],
  "detected_emojis": ["🍕"],
  "cartel_attribution": "CJNG|CARTEL_SINALOA|LA_MANA|DESCONOCIDO|NA",
  "reasoning_brief": "Una linea max 80 caracteres en espanol"
}

Comentario a analizar:
"""


def classify_comment_intent(comment_text: str) -> dict:
    """
    Clasifica un comentario usando Azure OpenAI.
    Devuelve dict con classification, intent_score, etc.
    """
    if not comment_text or len(comment_text.strip()) < 2:
        return {
            "classification": "NORMAL",
            "intent_score": 0,
            "detected_phrases": [],
            "detected_emojis": [],
            "cartel_attribution": "NA",
            "reasoning_brief": "Comentario vacio"
        }

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "Responde SOLO con JSON valido. Sin markdown."},
                {"role": "user", "content": INTENT_CLASSIFICATION_PROMPT + comment_text}
            ],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)

        # Validacion defensiva
        valid_classes = ["RECRUITING_INTENT", "RECRUITER_OUTREACH", "CARTEL_AFFILIATION", "SUSPICIOUS_OTHER", "NORMAL"]
        if parsed.get("classification") not in valid_classes:
            parsed["classification"] = "NORMAL"
        if not isinstance(parsed.get("intent_score"), (int, float)):
            parsed["intent_score"] = 0
        return parsed

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error en classify_comment_intent: {e}")
        return {
            "classification": "NORMAL",
            "intent_score": 0,
            "detected_phrases": [],
            "detected_emojis": [],
            "cartel_attribution": "NA",
            "reasoning_brief": f"Error de parseo: {str(e)[:60]}"
        }
    except Exception as e:
        # Azure Content Filter bloquea = score 100 automatico (es senal fuerte)
        error_str = str(e).lower()
        if "content_filter" in error_str or "responsibleaipolicy" in error_str:
            return {
                "classification": "SUSPICIOUS_OTHER",
                "intent_score": 100,
                "detected_phrases": [],
                "detected_emojis": [],
                "cartel_attribution": "DESCONOCIDO",
                "reasoning_brief": "Azure Content Filter bloqueo el contenido"
            }
        logging.error(f"Error en classify_comment_intent: {e}")
        return {
            "classification": "NORMAL",
            "intent_score": 0,
            "detected_phrases": [],
            "detected_emojis": [],
            "cartel_attribution": "NA",
            "reasoning_brief": f"Error: {str(e)[:60]}"
        }


# ============================================================
# SCRAPING DE COMENTARIOS DE TIKTOK
# ============================================================

def scrape_tiktok_comments(video_url: str, max_comments: int = 50) -> list:
    """
    Scrapea comentarios de un video de TikTok via Apify.
    Devuelve lista de dicts con autor, texto, likes, fecha.
    """
    if not video_url:
        return []

    try:
        client = get_apify_client()
        run_input = {
            "postURLs": [video_url],
            "commentsPerPost": max_comments,
            "maxRepliesPerComment": 0
        }
        run = client.actor(APIFY_COMMENTS_ACTOR).call(run_input=run_input, timeout_secs=120)

        comments = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            comment = {
                "comment_id": item.get("cid", str(uuid.uuid4())),
                "username": item.get("uniqueId") or item.get("user", {}).get("uniqueId", "unknown"),
                "user_id": item.get("uid") or item.get("user", {}).get("id", ""),
                "text": item.get("text", ""),
                "likes": item.get("diggCount", 0),
                "created_at": item.get("createTime", ""),
                "avatar_url": item.get("user", {}).get("avatarThumb", ""),
            }
            if comment["text"]:
                comments.append(comment)

        logging.info(f"Scraped {len(comments)} comments from {video_url}")
        return comments

    except Exception as e:
        logging.error(f"Error scraping comments: {e}")
        return []


# ============================================================
# CROSS-PLATFORM: INSTAGRAM
# ============================================================

def search_instagram_profile(username: str) -> Optional[dict]:
    """
    Busca un perfil de Instagram con el mismo handle.
    Devuelve None si no existe, o dict con info del perfil.
    """
    if not username:
        return None

    # Limpiar el handle (quitar @ si lo trae)
    clean_handle = username.lstrip("@").strip()
    if not clean_handle:
        return None

    try:
        client = get_apify_client()
        run_input = {
            "usernames": [clean_handle],
            "resultsLimit": 1,
            "resultsType": "details"
        }
        run = client.actor(APIFY_INSTAGRAM_ACTOR).call(run_input=run_input, timeout_secs=90)

        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        if not items:
            return None

        profile = items[0]
        # Validar que sea un perfil real
        if not profile.get("username"):
            return None

        return {
            "username": profile.get("username"),
            "full_name": profile.get("fullName", ""),
            "bio": profile.get("biography", ""),
            "followers": profile.get("followersCount", 0),
            "following": profile.get("followsCount", 0),
            "posts_count": profile.get("postsCount", 0),
            "is_private": profile.get("private", False),
            "is_verified": profile.get("verified", False),
            "profile_pic": profile.get("profilePicUrl", ""),
            "external_url": profile.get("externalUrl", ""),
        }

    except Exception as e:
        logging.error(f"Error searching Instagram profile {clean_handle}: {e}")
        return None


# ============================================================
# CONFIDENCE SCORE para cross-platform matching
# ============================================================

# Indicadores semioticos del crimen organizado
CARTEL_EMOJIS = {"🍕", "🐓", "🆖", "🥷", "🪖", "😈", "👹", "🧿"}
CARTEL_HASHTAGS = ["chapizza", "4letras", "wakala", "mencho", "makabelico",
                   "puroplebe", "trabajoparalamana", "cjng", "cds", "elmencho"]
CARTEL_KEYWORDS = ["puro plebe", "arriba el", "corte de agave", "personal valiente",
                   "apoyo a madres", "trabajo bien pagado"]


def calculate_confidence_score(tiktok_username: str,
                                tiktok_bio: str,
                                tiktok_hashtags: list,
                                instagram_profile: dict) -> dict:
    """
    Calcula Confidence Score (0-100) de que el perfil de IG es la misma persona del TikTok.

    Indicadores:
    - Coincidencia de handle (peso 30)
    - Coincidencia de bio (peso 25)
    - Hashtags/keywords cartelarios en bio IG (peso 20)
    - Emojis cartelarios en bio IG (peso 15)
    - Cantidad de posts/followers (peso 10) - perfiles activos > inactivos
    """
    if not instagram_profile:
        return {"confidence": 0, "level": "NONE", "indicators": []}

    score = 0
    indicators = []

    # 1. Coincidencia de handle (30 pts)
    tt_handle = (tiktok_username or "").lstrip("@").lower().strip()
    ig_handle = (instagram_profile.get("username") or "").lower().strip()
    if tt_handle and ig_handle and tt_handle == ig_handle:
        score += 30
        indicators.append("Handle identico en TikTok e Instagram")

    # 2. Coincidencia de bio (25 pts)
    tt_bio = (tiktok_bio or "").lower()
    ig_bio = (instagram_profile.get("bio") or "").lower()
    if tt_bio and ig_bio:
        # Calcular palabras en comun (excluyendo stopwords)
        tt_words = set(w for w in tt_bio.split() if len(w) > 3)
        ig_words = set(w for w in ig_bio.split() if len(w) > 3)
        if tt_words and ig_words:
            overlap = len(tt_words & ig_words)
            if overlap >= 3:
                score += 25
                indicators.append(f"Bio similar ({overlap} palabras coinciden)")
            elif overlap >= 1:
                score += 12
                indicators.append(f"Bio parcialmente similar ({overlap} coincidencia)")

    # 3. Hashtags/keywords cartelarios en bio IG (20 pts)
    cartel_in_bio = []
    for kw in CARTEL_KEYWORDS:
        if kw in ig_bio:
            cartel_in_bio.append(kw)
    for ht in CARTEL_HASHTAGS:
        if ht in ig_bio:
            cartel_in_bio.append(f"#{ht}")
    if cartel_in_bio:
        score += 20
        indicators.append(f"Keywords cartelarios en bio IG: {', '.join(cartel_in_bio[:3])}")

    # 4. Emojis cartelarios en bio IG (15 pts)
    emojis_found = [e for e in CARTEL_EMOJIS if e in ig_bio]
    if emojis_found:
        score += 15
        indicators.append(f"Emojis cartelarios en bio: {' '.join(emojis_found)}")

    # 5. Perfil activo (10 pts)
    posts = instagram_profile.get("posts_count", 0)
    followers = instagram_profile.get("followers", 0)
    if posts > 5 and followers > 50:
        score += 10
        indicators.append(f"Perfil activo ({posts} posts, {followers} followers)")

    # Determinar nivel
    if score >= 70:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"
    elif score >= 20:
        level = "LOW"
    else:
        level = "VERY_LOW"

    return {
        "confidence": min(score, 100),
        "level": level,
        "indicators": indicators
    }


# ============================================================
# CONSTRUCCION DE NODOS Y ARISTAS DEL GRAFO
# ============================================================

def build_user_node(username: str, root_username: str, platform: str = "tiktok",
                    metadata: dict = None) -> dict:
    """Construye nodo de tipo usuario."""
    return {
        "id": f"user_{platform}_{username}",
        "node_type": "user",
        "username": username,
        "platform": platform,
        "root_username": root_username,
        "metadata": metadata or {},
        "edges": [],
        "intent_score": 0,
        "classification": "ROOT",
        "created_at": datetime.now(timezone.utc).isoformat()
    }


def build_video_node(video_id: str, video_url: str, root_username: str,
                     metadata: dict = None) -> dict:
    """Construye nodo de tipo video."""
    return {
        "id": f"video_{video_id}",
        "node_type": "video",
        "video_url": video_url,
        "platform": "tiktok",
        "root_username": root_username,
        "metadata": metadata or {},
        "edges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


def build_comment_node(comment: dict, video_id: str, root_username: str,
                       classification: dict) -> dict:
    """Construye nodo de tipo comentario con clasificacion IA."""
    return {
        "id": f"comment_{comment['comment_id']}",
        "node_type": "comment",
        "username": comment["username"],
        "platform": "tiktok",
        "root_username": root_username,
        "video_id": video_id,
        "text": comment["text"],
        "likes": comment["likes"],
        "intent_score": classification.get("intent_score", 0),
        "classification": classification.get("classification", "NORMAL"),
        "detected_phrases": classification.get("detected_phrases", []),
        "detected_emojis": classification.get("detected_emojis", []),
        "cartel_attribution": classification.get("cartel_attribution", "NA"),
        "reasoning_brief": classification.get("reasoning_brief", ""),
        "edges": [{"to": f"video_{video_id}", "type": "commented_on"}],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


def build_external_profile_node(ig_profile: dict, root_username: str,
                                 confidence: dict) -> dict:
    """Construye nodo de perfil externo (Instagram) con Confidence Score."""
    return {
        "id": f"external_instagram_{ig_profile['username']}",
        "node_type": "external_profile",
        "username": ig_profile["username"],
        "platform": "instagram",
        "root_username": root_username,
        "profile_data": ig_profile,
        "confidence_score": confidence["confidence"],
        "confidence_level": confidence["level"],
        "match_indicators": confidence["indicators"],
        "edges": [{"to": f"user_tiktok_{root_username}", "type": "possible_match"}],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


def save_node_to_cosmos(node: dict) -> bool:
    """Guarda un nodo en Cosmos DB. Devuelve True si exitoso."""
    try:
        container = get_cosmos_container()
        container.upsert_item(node)
        return True
    except Exception as e:
        logging.error(f"Error guardando nodo {node.get('id')}: {e}")
        return False


def get_user_network(root_username: str) -> dict:
    """
    Recupera todos los nodos del grafo de un usuario raiz.
    Devuelve dict con nodes y edges para react-force-graph.
    """
    try:
        container = get_cosmos_container()
        query = "SELECT * FROM c WHERE c.root_username = @username"
        items = list(container.query_items(
            query=query,
            parameters=[{"name": "@username", "value": root_username}],
            partition_key=root_username
        ))

        nodes = []
        edges = []

        for item in items:
            # Nodo para react-force-graph
            node = {
                "id": item["id"],
                "label": item.get("username") or item.get("video_url", "")[:30],
                "type": item["node_type"],
                "intent_score": item.get("intent_score", 0),
                "classification": item.get("classification", ""),
                "platform": item.get("platform", ""),
                "metadata": item.get("metadata", {}),
                "data": item  # data completa para click expand
            }
            nodes.append(node)

            # Aristas
            for edge in item.get("edges", []):
                edges.append({
                    "source": item["id"],
                    "target": edge["to"],
                    "type": edge["type"]
                })

        return {"nodes": nodes, "edges": edges, "count": len(nodes)}

    except Exception as e:
        logging.error(f"Error recuperando red de {root_username}: {e}")
        return {"nodes": [], "edges": [], "count": 0, "error": str(e)}
