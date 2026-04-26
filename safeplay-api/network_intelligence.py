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


# ============================================================
# SCRAPING DE PERFIL COMPLETO DE TIKTOK
# (Agregado para Hackathon404 - Analisis de perfil)
# ============================================================

APIFY_PROFILE_ACTOR = os.environ.get("APIFY_PROFILE_ACTOR", "clockworks/tiktok-scraper")


def scrape_tiktok_profile(username: str, max_videos: int = 10) -> dict:
    """
    Scrapea los ultimos N videos de un perfil de TikTok via Apify.
    Devuelve dict con info del perfil y lista de videos.

    Returns:
    {
        "profile": {
            "username": "...",
            "bio": "...",
            "followers": N,
            "following": N,
            "video_count": N,
            "is_verified": bool,
            "avatar_url": "..."
        },
        "videos": [
            {
                "video_id": "...",
                "video_url": "...",
                "description": "...",
                "hashtags": [...],
                "create_time": "...",
                "play_count": N,
                "like_count": N,
                "comment_count": N
            }
        ]
    }
    """
    if not username:
        return {"profile": None, "videos": []}

    clean_handle = username.lstrip("@").strip()

    try:
        client = get_apify_client()
        run_input = {
            "profiles": [clean_handle],
            "resultsPerPage": max_videos,
            "shouldDownloadVideos": False,
            "shouldDownloadCovers": False,
            "shouldDownloadSubtitles": False
        }

        run = client.actor(APIFY_PROFILE_ACTOR).call(run_input=run_input, timeout_secs=180)

        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())

        if not items:
            logging.warning(f"Sin resultados para perfil {clean_handle}")
            return {"profile": None, "videos": []}

        # El primer item suele tener metadata del autor
        first = items[0]
        author = first.get("authorMeta", {}) or {}

        profile = {
            "username": author.get("name", clean_handle),
            "nickname": author.get("nickName", ""),
            "bio": author.get("signature", ""),
            "followers": author.get("fans", 0),
            "following": author.get("following", 0),
            "video_count": author.get("video", 0),
            "heart_count": author.get("heart", 0),
            "is_verified": author.get("verified", False),
            "avatar_url": author.get("avatar", "")
        }

        videos = []
        for item in items[:max_videos]:
            # Extraer hashtags del texto
            text = item.get("text", "") or ""
            hashtags = []
            for word in text.split():
                if word.startswith("#"):
                    hashtags.append(word.lstrip("#").lower())

            video = {
                "video_id": item.get("id", ""),
                "video_url": item.get("webVideoUrl", "") or f"https://www.tiktok.com/@{clean_handle}/video/{item.get('id', '')}",
                "description": text[:300],
                "hashtags": hashtags,
                "create_time": item.get("createTimeISO", ""),
                "play_count": item.get("playCount", 0),
                "like_count": item.get("diggCount", 0),
                "comment_count": item.get("commentCount", 0),
                "share_count": item.get("shareCount", 0)
            }
            if video["video_id"]:
                videos.append(video)

        logging.info(f"Profile scrape: {clean_handle} - {len(videos)} videos")
        return {"profile": profile, "videos": videos}

    except Exception as e:
        logging.error(f"Error scraping profile {clean_handle}: {e}")
        return {"profile": None, "videos": [], "error": str(e)}


# ============================================================
# DETECTOR GEOGRAFICO MEXICANO
# Infiere estado mexicano del bio, hashtags y texto del comentario
# ============================================================

# Estados de Mexico con aliases comunes y abreviaciones
MEXICAN_STATES = {
    "AGUASCALIENTES": ["aguascalientes", "ags"],
    "BAJA_CALIFORNIA": ["baja california", "tijuana", "mexicali", "bc", "bcn"],
    "BAJA_CALIFORNIA_SUR": ["baja california sur", "los cabos", "la paz bcs", "bcs"],
    "CAMPECHE": ["campeche", "camp"],
    "CHIAPAS": ["chiapas", "tuxtla", "san cristobal", "chs"],
    "CHIHUAHUA": ["chihuahua", "ciudad juarez", "cd juarez", "juarez", "chih"],
    "CIUDAD_DE_MEXICO": ["cdmx", "ciudad de mexico", "df", "mexico df", "ciudad mexico"],
    "COAHUILA": ["coahuila", "saltillo", "torreon", "monclova", "coah"],
    "COLIMA": ["colima", "manzanillo", "col"],
    "DURANGO": ["durango", "dgo"],
    "ESTADO_DE_MEXICO": ["edomex", "estado de mexico", "ecatepec", "naucalpan", "toluca", "edo mex"],
    "GUANAJUATO": ["guanajuato", "leon", "irapuato", "celaya", "gto"],
    "GUERRERO": ["guerrero", "acapulco", "chilpancingo", "iguala", "gro"],
    "HIDALGO": ["hidalgo", "pachuca", "hgo"],
    "JALISCO": ["jalisco", "guadalajara", "gdl", "puerto vallarta", "vallarta", "tlaquepaque", "zapopan", "jal"],
    "MICHOACAN": ["michoacan", "morelia", "uruapan", "lazaro cardenas", "apatzingan", "mich"],
    "MORELOS": ["morelos", "cuernavaca", "mor"],
    "NAYARIT": ["nayarit", "tepic", "nay"],
    "NUEVO_LEON": ["nuevo leon", "monterrey", "mty", "san pedro", "garza garcia", "nl"],
    "OAXACA": ["oaxaca", "huatulco", "puerto escondido", "oax"],
    "PUEBLA": ["puebla", "tehuacan", "pue"],
    "QUERETARO": ["queretaro", "qro"],
    "QUINTANA_ROO": ["quintana roo", "cancun", "playa del carmen", "tulum", "qroo"],
    "SAN_LUIS_POTOSI": ["san luis potosi", "slp"],
    "SINALOA": ["sinaloa", "culiacan", "mazatlan", "los mochis", "guasave", "guamuchil", "sin"],
    "SONORA": ["sonora", "hermosillo", "ciudad obregon", "nogales", "son"],
    "TABASCO": ["tabasco", "villahermosa", "tab"],
    "TAMAULIPAS": ["tamaulipas", "reynosa", "matamoros", "nuevo laredo", "tampico", "victoria", "tamps"],
    "TLAXCALA": ["tlaxcala", "tlax"],
    "VERACRUZ": ["veracruz", "xalapa", "coatzacoalcos", "poza rica", "boca del rio", "ver"],
    "YUCATAN": ["yucatan", "merida", "yuc"],
    "ZACATECAS": ["zacatecas", "fresnillo", "zac"]
}

# Hashtags y frases que IMPLICAN un cartel (mapeo a estado base del cartel)
CARTEL_TO_STATE = {
    "CARTEL_SINALOA": "SINALOA",
    "CJNG": "JALISCO",
    "LA_MANA": "TAMAULIPAS"
}

# Hashtags narco que apuntan a region (incluso sin mencion explicita)
HASHTAG_REGION_HINTS = {
    "chapizza": "SINALOA",
    "puroplebe": "SINALOA",
    "puroculiacan": "SINALOA",
    "mencho": "JALISCO",
    "4letras": "JALISCO",
    "cjng": "JALISCO",
    "wakala": "TAMAULIPAS",
    "trabajoparalamana": "TAMAULIPAS",
    "lafrontera": "TAMAULIPAS",
    "matamoros": "TAMAULIPAS",
    "reynosa": "TAMAULIPAS"
}


def detect_mexican_state(text: str, cartel_attribution: str = None, hashtags: list = None) -> str:
    """
    Detecta estado mexicano del texto.
    Estrategia (en orden de prioridad):
    1. Mencion explicita del estado o ciudad
    2. Hashtag con hint regional
    3. Atribucion de cartel (mapea al estado base)

    Returns: nombre del estado en MAYUSCULAS o "DESCONOCIDO"
    """
    if not text:
        text_lower = ""
    else:
        text_lower = text.lower()

    # Estrategia 1: mencion explicita
    for state, aliases in MEXICAN_STATES.items():
        for alias in aliases:
            # Buscar como palabra completa para evitar falsos positivos
            if alias in text_lower:
                # Validacion extra: si el alias es muy corto (como "bc"), exigir contexto
                if len(alias) <= 3:
                    if f" {alias} " in f" {text_lower} " or text_lower.startswith(alias + " ") or text_lower.endswith(" " + alias):
                        return state
                else:
                    return state

    # Estrategia 2: hashtags
    if hashtags:
        for ht in hashtags:
            ht_clean = ht.lower().lstrip("#")
            if ht_clean in HASHTAG_REGION_HINTS:
                return HASHTAG_REGION_HINTS[ht_clean]

    # Estrategia 3: cartel attribution
    if cartel_attribution and cartel_attribution in CARTEL_TO_STATE:
        return CARTEL_TO_STATE[cartel_attribution]

    return "DESCONOCIDO"


# ============================================================
# AGREGACIONES PARA HEATMAPS
# ============================================================

def aggregate_by_cartel(root_username: str = None) -> dict:
    """
    Cuenta detecciones agrupadas por cartel.
    Si root_username = None, agrega TODOS los nodos en la base.
    Returns: {"CJNG": 47, "CARTEL_SINALOA": 31, ...}
    """
    try:
        container = get_cosmos_container()

        if root_username:
            query = "SELECT * FROM c WHERE c.root_username = @username AND c.node_type = 'comment'"
            params = [{"name": "@username", "value": root_username}]
            items = list(container.query_items(
                query=query, parameters=params,
                partition_key=root_username
            ))
        else:
            query = "SELECT * FROM c WHERE c.node_type = 'comment'"
            items = list(container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))

        cartel_counts = {
            "CJNG": 0,
            "CARTEL_SINALOA": 0,
            "LA_MANA": 0,
            "DESCONOCIDO": 0,
            "OTROS": 0
        }

        for item in items:
            cartel = item.get("cartel_attribution", "DESCONOCIDO")
            score = item.get("intent_score", 0)

            # Solo contamos si el score es relevante (>= 40)
            if score < 40:
                continue

            if cartel in cartel_counts:
                cartel_counts[cartel] += 1
            elif cartel and cartel != "NA":
                cartel_counts["OTROS"] += 1
            else:
                cartel_counts["DESCONOCIDO"] += 1

        total = sum(cartel_counts.values())

        return {
            "counts": cartel_counts,
            "total": total,
            "scope": "global" if not root_username else f"@{root_username}"
        }

    except Exception as e:
        logging.error(f"Error en aggregate_by_cartel: {e}")
        return {"counts": {}, "total": 0, "error": str(e)}


def aggregate_by_state(root_username: str = None) -> dict:
    """
    Cuenta detecciones agrupadas por estado mexicano.
    Aplica el detector geografico a cada nodo.
    Returns: {"SINALOA": 52, "JALISCO": 38, ...}
    """
    try:
        container = get_cosmos_container()

        if root_username:
            query = "SELECT * FROM c WHERE c.root_username = @username"
            params = [{"name": "@username", "value": root_username}]
            items = list(container.query_items(
                query=query, parameters=params,
                partition_key=root_username
            ))
        else:
            query = "SELECT * FROM c"
            items = list(container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))

        state_counts = {state: 0 for state in MEXICAN_STATES.keys()}
        state_counts["DESCONOCIDO"] = 0
        with_geo = 0
        without_geo = 0

        for item in items:
            score = item.get("intent_score", 0)
            if score < 40:
                continue

            # Texto a analizar
            text = item.get("text", "") or item.get("metadata", {}).get("description", "")
            cartel = item.get("cartel_attribution", "")

            # Hashtags del video si los tiene
            hashtags = []
            metadata = item.get("metadata", {})
            if isinstance(metadata, dict):
                hashtags = metadata.get("hashtags", []) or []

            state = detect_mexican_state(text, cartel, hashtags)

            if state in state_counts:
                state_counts[state] += 1
                if state == "DESCONOCIDO":
                    without_geo += 1
                else:
                    with_geo += 1

        total = with_geo + without_geo
        coverage_pct = round((with_geo / total) * 100, 1) if total > 0 else 0

        return {
            "counts": state_counts,
            "total": total,
            "with_geolocation": with_geo,
            "without_geolocation": without_geo,
            "coverage_percentage": coverage_pct,
            "scope": "global" if not root_username else f"@{root_username}"
        }

    except Exception as e:
        logging.error(f"Error en aggregate_by_state: {e}")
        return {"counts": {}, "total": 0, "error": str(e)}
