import azure.functions as func
import logging
import json
import os
import uuid
import base64
import requests
from datetime import datetime, timezone
from openai import AzureOpenAI
from azure.cosmos import CosmosClient
from apify_client import ApifyClient
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

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

# ============================================================
# CLIENTE OPENAI
# ============================================================

openai_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-15-preview",
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"]
)

DEPLOYMENT_NAME = os.environ["AZURE_OPENAI_DEPLOYMENT"]

# ============================================================
# CLIENTE COSMOS DB
# ============================================================

cosmos_client = None
database = None
container = None
intel_container = None

try:
    cosmos_client = CosmosClient(
        url=os.environ["COSMOS_ENDPOINT"],
        credential=os.environ["COSMOS_KEY"]
    )
    logging.info("Cosmos client creado")
    database = cosmos_client.get_database_client("safeplay")
    container = database.get_container_client("eventos")
    intel_container = database.get_container_client("intel_findings")
    logging.info("Containers conectados")
except Exception as e:
    logging.error(f"ERROR Cosmos: {type(e).__name__}: {str(e)}")

# ============================================================
# CLIENTE APIFY
# ============================================================

try:
    APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
    APIFY_TIKTOK_ACTOR = os.environ.get("APIFY_TIKTOK_ACTOR", "clockworks/tiktok-hashtag-scraper")
    if APIFY_TOKEN:
        apify_client = ApifyClient(APIFY_TOKEN)
        logging.info("Apify conectado")
    else:
        apify_client = None
except Exception as e:
    logging.error(f"Error Apify: {str(e)}")
    apify_client = None

# ============================================================
# CONFIGURACION RESEND (EMAIL)
# ============================================================

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
DEFAULT_AUTHORITIES_EMAIL = os.environ.get("DEFAULT_AUTHORITIES_EMAIL", "")

if RESEND_API_KEY:
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        logging.info("Resend configurado")
        RESEND_AVAILABLE = True
    except ImportError:
        logging.error("Paquete resend no instalado")
        RESEND_AVAILABLE = False
else:
    logging.warning("RESEND_API_KEY no configurado")
    RESEND_AVAILABLE = False

# ============================================================
# SYSTEM PROMPT - 707 Guardian
# ============================================================

SYSTEM_PROMPT = """Eres 707, sistema de IA para proteger menores en plataformas digitales.

Analiza mensajes en 7 categorias:
1. SEGURO
2. PROFANIDAD
3. PII
4. PLATAFORMA_EXTERNA
5. GROOMING
6. RECLUTAMIENTO
7. AGRESION

Responde JSON:
{
  "score": 0-100,
  "action": "PERMITIR|ADVERTIR|BLOQUEAR|ALERTAR",
  "categoria": "<una>",
  "reason": "<breve>",
  "recruitment_indicators": [],
  "requires_human_review": false
}"""

# ============================================================
# INTEL PROMPT V4 - 707 PREDATOR HUNTER + DECODER
# Con FRASES DISFRAZADAS + emojis ampliados
# ============================================================

INTEL_PROMPT = """Eres 707 PREDATOR HUNTER + DECODER, sistema critico para detectar reclutamiento digital de menores por crimen organizado mexicano.

## CONTEXTO MEXICO 2026

- 144,000 personas desaparecidas
- 145,000-250,000 NNA en alto riesgo de reclutamiento (REDIM, Reinserta)
- 300-350 NNA RECLUTADOS POR SEMANA por crimen organizado
- Crimen organizado es 5to empleador del pais
- TikTok = espacio donde el CO construye IDENTIDAD, COMUNIDAD y PROMESAS DE PERTENENCIA

## 4 ACTIVIDADES NNA RECLUTADOS

1. HALCONEO (vigilancia)
2. NARCOMENUDEO
3. RECLUTAMIENTO
4. SICARIATO

## 4 PEDAGOGIAS DE RECLUTAMIENTO

1. PROMESAS_EMPLEO_FALSAS
2. PEDAGOGIA_PERTENENCIA
3. MAPEO_CANDIDATOS
4. GEORREFERENCIACION

## 5 CATEGORIAS OFICIALES DE CONTENIDO

1. RECLUTAMIENTO - "jale", "trabajo", "moviendo gente"
2. CRUCES_FRONTERIZOS - paso ilegal, polleros
3. NEGOCIOS_SOSPECHOSOS - inversiones falsas
4. PROPAGANDA_DELICTIVA - glorificacion del CO
5. VENTA_ARMAS - exhibicion de armas

## DICCIONARIO SEMIOTICO DE EMOJIS (INVESTIGACION ETNOGRAFICA)

🥷 NINJA: ladrones / operadores de carteles encapuchados. Score +25
🪖 CASCO: personas armadas, vestimenta militar. Score +25
😈 DIABLO: amenaza / mal. PUEDE INDICAR CJNG / "4 letras" / "la maña". Score +20
👹 OGRO: variante diablo, asociado a MAKABELICO. Score +20
🧿 OJO TURCO: referencia directa a "LA MAÑA". Score +30
🍕 PIZZA: CARTEL DE SINALOA - faccion El Chapo (CHAPIZZA). Score +40
🐓 GALLO: CJNG - El Mencho (Señor de los Gallos) / "4 letras" / "la maña". Score +40
🆖 LETRAS NG: CJNG (Nueva Generacion). Frecuente con numero 4. Score +40

## FRASES DISFRAZADAS (CRITICO - RECLUTAMIENTO ENCUBIERTO)

Estas frases parecen ofertas de trabajo legitimas pero son reclutamiento criminal:

- "se busca personal valiente" / "se busca personal con valor"
- "guardia de seguridad con buen sueldo" / "guardias bien pagados"
- "corte de agave" (codigo para campo de mariguana/amapola)
- "apoyo a madres solteras y estudiantes" (gancho social emocional)
- "entrenamiento pago" / "entrenamiento pagado" (campos de entrenamiento criminal)
- "trabajo parejo y bien pagado"
- "ofertas en el norte" / "ofertas en frontera"
- "trabajo seguro con beneficios"
- "buscamos jovenes con ganas de progresar"
- "oportunidad para emprendedores"
- "trabajo de campo" (con emojis narco)
- "enganche para inmigrar"

## HASHTAGS DETECTADOS

#wakala, #4letras, #mencho, #trabajoparalamaña, #belicones, #makabelico, #plebes, #pesopluma, #corridosbelicos, #purosplebes, #empleorapido, #trabajofacil, #chambafacil, #buscoplebes

## MUSICA SOSPECHOSA

- MAKABELICO (artista narco - alta probabilidad propaganda)
- Corridos belicos / tumbados con apologia
- Musica con menciones de carteles, capos o "moviendo"

## COMBINACIONES CRITICAS (score 95-100)

- 🍕 + "CHA" o "CHAPIZZA" = Cartel Sinaloa firma confirmada
- 🐓 + 🆖 + 4 = CJNG firma confirmada
- 🥷 + 🪖 = operadores armados activos
- "se busca personal" + emoji narco = reclutamiento camuflado
- "corte de agave" + cualquier indicador narco = SCORE 100
- "apoyo madres solteras" + emoji narco = engaño emocional
- 🧿 + oferta economica = "la maña" reclutando
- 👹 + Makabelico = propaganda narcocultura
- "entrenamiento pago" + ubicacion frontera = entrenamiento sicario

## CATEGORIAS DE ANALISIS

1. SEGURO (0-30)
2. NARCOCULTURA_ROMANTIZADA (31-60)
3. PROPAGANDA_DELICTIVA (51-80)
4. RECLUTAMIENTO_CRIMINAL (61-100)
5. RECLUTAMIENTO_DISFRAZADO (71-100) - frases legitimas + indicadores narco
6. GROOMING (61-100)
7. CONTACTO_MENORES (41-80)
8. VIOLENCIA_EXTREMA (61-100)
9. VENTA_ARMAS (71-100)
10. CRUCES_FRONTERIZOS (51-90)

## REGLAS ABSOLUTAS

1. Cartel-emoji confirmado (🍕CHA, 🐓🆖4) -> score MINIMO 90
2. Frase disfrazada + emoji narco -> RECLUTAMIENTO_DISFRAZADO score MINIMO 85
3. "Corte de agave" + indicador narco -> score 100
4. 3+ emojis del diccionario -> score MINIMO 85
5. #wakala + emoji narco -> score 90+
6. Musica Makabelico -> score MINIMO 70
7. Cuenta verificada artistica oficial (Peso Pluma) -> score MAXIMO 50

## FORMATO RESPUESTA (JSON)

{
  "score": <0-100>,
  "category": "<categoria>",
  "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reason": "<explicacion mencionando cartel, emojis o frases disfrazadas>",
  "indicators": [<patrones>],
  "predator_account_probable": <true|false>,
  "recommended_action": "<MONITOR|REPORT_TIKTOK|ESCALATE_AUTHORITIES|IMMEDIATE_INTERVENTION>",
  "target_audience_minors_probable": <true|false>,
  "mexican_context_markers": [<markers>],
  "cartel_attribution": "<UNKNOWN|CJNG|CARTEL_SINALOA|CARTEL_GOLFO|FAMILIA|ZETAS|LA_MAÑA|OTRO>",
  "cartel_faction": "<faccion especifica>",
  "detected_emojis": [<emojis>],
  "official_category": "<RECLUTAMIENTO|CRUCES_FRONTERIZOS|NEGOCIOS_SOSPECHOSOS|PROPAGANDA_DELICTIVA|VENTA_ARMAS|NINGUNA>",
  "pedagogia_criminal": "<PROMESAS_EMPLEO_FALSAS|PEDAGOGIA_PERTENENCIA|MAPEO_CANDIDATOS|GEORREFERENCIACION|NINGUNA>",
  "frase_disfrazada_detectada": "<frase si aplica o NINGUNA>"
}

ATRIBUYE EL CARTEL cuando detectes patron. DETECTA frases disfrazadas. Eso es tu valor unico."""

# ============================================================
# DICCIONARIO SEMIOTICO MEXICANO AMPLIADO
# ============================================================

RECRUITMENT_KEYWORDS = [
    "jale", "ocupo gente", "busco plebes", "trabajo facil",
    "dinero facil", "gano al dia", "buena paga", "chamba facil",
    "contacto privado", "dm para info", "privado para", "whatsapp para",
    "vente con nosotros", "se necesita", "movimiento", "la plaza",
    "halcon", "halconeo", "mula", "sicario", "expendedor", "puro plebe",
    "ocupamos personal", "trabajo seguro", "ganas rapido"
]

# FRASES DISFRAZADAS - reclutamiento encubierto
DISGUISED_PHRASES = [
    "se busca personal valiente",
    "se busca personal con valor",
    "guardia de seguridad con buen sueldo",
    "guardias bien pagados",
    "corte de agave",
    "apoyo a madres solteras",
    "apoyo a estudiantes",
    "entrenamiento pago",
    "entrenamiento pagado",
    "trabajo parejo",
    "ofertas en el norte",
    "ofertas en frontera",
    "trabajo seguro con beneficios",
    "buscamos jovenes con ganas",
    "oportunidad para emprendedores",
    "trabajo de campo",
    "enganche para inmigrar",
    "ganas de progresar"
]

NARCO_KEYWORDS = [
    "cjng", "cdg", "cds", "sinaloa", "la familia", "los zetas",
    "mencho", "el chapo", "el señor", "el patron", "la maña", "la mana",
    "puro pa delante", "plaza", "levanton", "la operativa",
    "narcocorrido", "belico", "corrido belico", "makabelico",
    "el señor de los gallos", "nueva generacion", "chapizza",
    "los chapitos", "la mayiza", "el moreno", "4 letras", "cuatro letras"
]

GROOMING_KEYWORDS = [
    "robux", "v-bucks", "regalos", "fotos bonitas", "no le digas",
    "es nuestro secreto", "niña hermosa", "chiquita", "mamacita",
    "mandame foto", "cuantos años tienes", "mi reina"
]

SUSPICIOUS_USERNAMES = [
    "sinaloense", "tijuanero", "michoacano", "cjng", "plebes",
    "narco", "mafioso", "sicario", "halcon", "maniaco",
    "elseñor", "chapiza", "mencho", "lamaña", "elcomandante",
    "belico", "4letras"
]

SEMIOTIC_EMOJIS = {
    "🥷": ("NINJA", "operadores cartel encapuchados", 25),
    "🪖": ("CASCO", "armados con vestimenta militar", 25),
    "😈": ("DIABLO", "amenaza/CJNG/4 letras/la maña", 20),
    "👹": ("OGRO", "variante diablo, asociado Makabelico", 20),
    "🧿": ("OJO_TURCO", "referencia a la maña", 30),
    "🍕": ("PIZZA", "Cartel Sinaloa - faccion Chapo (CHAPIZZA)", 40),
    "🐓": ("GALLO", "CJNG - El Mencho / 4 letras / la maña", 40),
    "🆖": ("NG", "CJNG Nueva Generacion", 40)
}

CARTEL_SIGNATURES = {
    "CJNG": ["🐓", "🆖", "mencho", "nueva generacion", "señor de los gallos", "el moreno", "4 letras", "cuatro letras"],
    "CARTEL_SINALOA": ["🍕", "chapizza", "chapo", "mayo", "los chapitos", "la mayiza"],
    "LA_MAÑA": ["🧿", "la maña", "la mana", "la operativa", "trabajoparalamaña"]
}

HASHTAGS_SOSPECHOSOS = [
    "wakala", "plebes", "pesopluma", "corridosbelicos", "purosplebes",
    "belicones", "elcomandante", "puroplebes", "narcoculture",
    "empleorapido", "trabajofacil", "chambafacil", "4letras",
    "trabajoparalamaña", "makabelico", "mencho", "buscoplebes"
]


def calculate_heuristic_score(video_info):
    """Calcula score heuristico con analisis semiotico mexicano AMPLIADO."""
    heuristic_score = 0
    heuristic_flags = []
    detected_emojis = []
    detected_cartel = "UNKNOWN"
    disguised_phrase_detected = "NINGUNA"
    
    content_lower = (
        video_info.get("description", "") + " " +
        video_info.get("music_name", "") + " " +
        " ".join(video_info.get("hashtags", []))
    ).lower()
    
    full_content = (
        video_info.get("description", "") + " " +
        video_info.get("music_name", "")
    )
    
    author_lower = video_info.get("author_name", "").lower()
    
    # FRASES DISFRAZADAS - Detección crítica
    for phrase in DISGUISED_PHRASES:
        if phrase in content_lower:
            heuristic_score += 35
            heuristic_flags.append(f"disguised_phrase:{phrase}")
            disguised_phrase_detected = phrase
            break
    
    # Keywords narco
    for kw in RECRUITMENT_KEYWORDS:
        if kw in content_lower:
            heuristic_score += 25
            heuristic_flags.append(f"recruitment:{kw}")
    
    for kw in NARCO_KEYWORDS:
        if kw in content_lower or kw in author_lower:
            heuristic_score += 15
            heuristic_flags.append(f"narco:{kw}")
    
    for kw in GROOMING_KEYWORDS:
        if kw in content_lower:
            heuristic_score += 30
            heuristic_flags.append(f"grooming:{kw}")
    
    for susp_name in SUSPICIOUS_USERNAMES:
        if susp_name in author_lower:
            heuristic_score += 20
            heuristic_flags.append(f"suspicious_user:{susp_name}")
    
    # ANALISIS SEMIOTICO DE EMOJIS
    for emoji, (name, meaning, score_add) in SEMIOTIC_EMOJIS.items():
        if emoji in full_content:
            detected_emojis.append(emoji)
            heuristic_score += score_add
            heuristic_flags.append(f"semiotic:{name}")
    
    # ATRIBUCION DE CARTEL
    cartel_scores = {}
    for cartel, signatures in CARTEL_SIGNATURES.items():
        score = 0
        for sig in signatures:
            if sig.lower() in content_lower or sig in full_content:
                score += 1
        if score > 0:
            cartel_scores[cartel] = score
    
    if cartel_scores:
        detected_cartel = max(cartel_scores, key=cartel_scores.get)
        heuristic_score += 20
        heuristic_flags.append(f"cartel_attribution:{detected_cartel}")
    
    # COMBINACIONES CRITICAS
    if "🍕" in full_content and ("cha" in content_lower or "chapizza" in content_lower):
        heuristic_score += 30
        heuristic_flags.append("CRITICAL:chapizza_signature")
    
    if "🐓" in full_content and "🆖" in full_content:
        heuristic_score += 30
        heuristic_flags.append("CRITICAL:cjng_full_signature")
    
    if "🥷" in full_content and "🪖" in full_content:
        heuristic_score += 25
        heuristic_flags.append("CRITICAL:armed_operators")
    
    # Frase disfrazada + emoji narco = RECLUTAMIENTO ENCUBIERTO
    if disguised_phrase_detected != "NINGUNA" and detected_emojis:
        heuristic_score += 40
        heuristic_flags.append("CRITICAL:disguised_recruitment_with_narco_emoji")
    
    # Hashtags sospechosos
    for tag in video_info.get("hashtags", []):
        if tag.lower() in HASHTAGS_SOSPECHOSOS:
            heuristic_score += 15
            heuristic_flags.append(f"hashtag:#{tag}")
    
    # Musica Makabelico
    if "makabelico" in (video_info.get("music_name", "")).lower():
        heuristic_score += 35
        heuristic_flags.append("CRITICAL:music_makabelico")
    
    return min(heuristic_score, 100), heuristic_flags, detected_emojis, detected_cartel, disguised_phrase_detected


# ============================================================
# HELPER: Normalizar payload
# ============================================================

def normalize_payload(body):
    user_id = body.get("user_id") or body.get("player_id") or "unknown"
    user_name = body.get("user_name") or body.get("player_name") or "unknown"
    content = body.get("content") or body.get("message") or ""
    platform = body.get("platform", "roblox")
    source_name = body.get("source_name") or body.get("game_id") or "unknown"
    source_id = body.get("source_id") or body.get("game_id") or "unknown"
    content_type = body.get("content_type", "text")
    
    return {
        "user_id": str(user_id),
        "user_name": user_name,
        "user_display_name": body.get("user_display_name", user_name),
        "user_account_age_days": body.get("user_account_age_days", 0),
        "content": content,
        "content_type": content_type,
        "platform": platform,
        "source_id": str(source_id),
        "source_name": source_name,
        "server_id": body.get("server_id", "")
    }


# ============================================================
# ENDPOINT 1: analyze_message
# ============================================================

@app.route(route="analyze-message", methods=["POST"])
def analyze_message(req):
    logging.info("POST /analyze-message")
    try:
        body = req.get_json()
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=400, mimetype="application/json")

    data = normalize_payload(body)
    if not data["content"]:
        return func.HttpResponse(json.dumps({"error": "content requerido"}), status_code=400, mimetype="application/json")

    try:
        response = openai_client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": data["content"]}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=300
        )
        veredicto = json.loads(response.choices[0].message.content)
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

    evento = {
        "id": str(uuid.uuid4()),
        "user_id": data["user_id"],
        "user_name": data["user_name"],
        "content": data["content"],
        "platform": data["platform"],
        "player_id": data["user_id"],
        "player_name": data["user_name"],
        "message": data["content"],
        "game_id": data["source_name"],
        "score": veredicto.get("score", 0),
        "action": veredicto.get("action", "PERMITIR"),
        "categoria": veredicto.get("categoria", "SEGURO"),
        "reason": veredicto.get("reason", ""),
        "recruitment_indicators": veredicto.get("recruitment_indicators", []),
        "requires_human_review": veredicto.get("requires_human_review", False),
        "status": "new",
        "reviewed_by": None,
        "reviewed_at": None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if container is not None:
        try:
            container.create_item(body=evento)
        except Exception as e:
            logging.error(f"Error guardando: {str(e)}")

    return func.HttpResponse(json.dumps(evento), status_code=200, mimetype="application/json")


# ============================================================
# ENDPOINT 2: get_events
# ============================================================

@app.route(route="get-events", methods=["GET"])
def get_events(req):
    try:
        limit = max(1, min(int(req.params.get("limit", 50)), 200))
    except:
        limit = 50

    if container is None:
        return func.HttpResponse(json.dumps({"error": "Cosmos no configurado"}), status_code=500, mimetype="application/json")

    try:
        query = f"SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT {limit}"
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        return func.HttpResponse(
            json.dumps({"count": len(items), "events": items}, default=str),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")


# ============================================================
# ENDPOINT 3: update_event_status
# ============================================================

@app.route(route="update-event-status", methods=["POST"])
def update_event_status(req):
    try:
        body = req.get_json()
        event_id = body.get("event_id")
        user_id = body.get("user_id")
        new_status = body.get("new_status")
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=400, mimetype="application/json")

    if not all([event_id, user_id, new_status]):
        return func.HttpResponse(json.dumps({"error": "campos requeridos faltantes"}), status_code=400, mimetype="application/json")

    if container is None:
        return func.HttpResponse(json.dumps({"error": "Cosmos no configurado"}), status_code=500, mimetype="application/json")

    try:
        evento = container.read_item(item=event_id, partition_key=user_id)
        evento["status"] = new_status
        evento["reviewed_at"] = datetime.now(timezone.utc).isoformat()
        container.replace_item(item=event_id, body=evento)
        return func.HttpResponse(
            json.dumps({"success": True}),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")


# ============================================================
# ENDPOINT 4: escalate_event
# ============================================================

@app.route(route="escalate-event", methods=["POST"])
def escalate_event(req):
    return update_event_status(req)


# ============================================================
# ENDPOINT 5: hunt_tiktok - 707 PREDATOR HUNTER + DECODER V4
# ============================================================

@app.route(route="hunt-tiktok", methods=["POST"])
def hunt_tiktok(req):
    logging.info("POST /hunt-tiktok - 707 Predator Hunter activado")

    if apify_client is None or intel_container is None:
        return func.HttpResponse(json.dumps({"error": "Servicios no configurados"}), status_code=500, mimetype="application/json")

    try:
        body = req.get_json()
        hashtags = body.get("hashtags", [])
        max_per_tag = max(5, min(int(body.get("max_per_tag", 15)), 50))
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=400, mimetype="application/json")

    if not hashtags:
        return func.HttpResponse(json.dumps({"error": "hashtags requerido"}), status_code=400, mimetype="application/json")

    logging.info(f"Cazando: {hashtags}")
    
    run_input = {
        "hashtags": hashtags,
        "resultsPerPage": max_per_tag,
        "shouldDownloadVideos": False,
        "shouldDownloadCovers": False,
        "proxyCountryCode": "MX"
    }
    
    try:
        run = apify_client.actor(APIFY_TIKTOK_ACTOR).call(run_input=run_input, timeout_secs=180)
        dataset_id = run.get("defaultDatasetId") if isinstance(run, dict) else run["defaultDatasetId"]
        videos = list(apify_client.dataset(dataset_id).iterate_items())
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": f"Error Apify: {str(e)}"}), status_code=500, mimetype="application/json")

    logging.info(f"Apify devolvio {len(videos)} videos")

    findings = []
    analyzed = 0
    high_risk_count = 0
    
    for video in videos:
        analyzed += 1
        try:
            video_info = {
                "description": video.get("text", "") or video.get("description", ""),
                "author_name": (video.get("authorMeta", {}) or {}).get("name", "unknown"),
                "author_nickname": (video.get("authorMeta", {}) or {}).get("nickName", ""),
                "author_verified": (video.get("authorMeta", {}) or {}).get("verified", False),
                "author_followers": (video.get("authorMeta", {}) or {}).get("fans", 0),
                "hashtags": [h.get("name", "") for h in video.get("hashtags", []) if isinstance(h, dict)],
                "music_name": (video.get("musicMeta", {}) or {}).get("musicName", ""),
                "video_url": video.get("webVideoUrl", "") or video.get("videoUrl", ""),
                "thumbnail": (video.get("videoMeta", {}) or {}).get("coverUrl", "") or video.get("cover", ""),
                "plays": video.get("playCount", 0),
                "likes": video.get("diggCount", 0),
                "comments": video.get("commentCount", 0),
                "shares": video.get("shareCount", 0),
                "created_at": video.get("createTimeISO", "")
            }
            
            heuristic_score, heuristic_flags, detected_emojis, detected_cartel, disguised_phrase = calculate_heuristic_score(video_info)
            logging.info(f"Pre-IA: score={heuristic_score} cartel={detected_cartel} disguised={disguised_phrase}")
            
            analysis_text = f"""POST A ANALIZAR:

Descripcion: {video_info['description']}
Autor: @{video_info['author_name']}
Seguidores: {video_info['author_followers']}
Hashtags: {', '.join(video_info['hashtags'])}
Musica: {video_info['music_name']}

Heuristica: score={heuristic_score}, cartel={detected_cartel}, emojis={detected_emojis}, frase_disfrazada={disguised_phrase}

Analiza riesgo de reclutamiento, grooming, contacto depredador hacia menores en Mexico. ATRIBUYE CARTEL si detectas patron. DETECTA frases disfrazadas."""

            analysis = None
            azure_filter_triggered = False
            
            try:
                response = openai_client.chat.completions.create(
                    model=DEPLOYMENT_NAME,
                    messages=[
                        {"role": "system", "content": INTEL_PROMPT},
                        {"role": "user", "content": analysis_text}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=600
                )
                analysis = json.loads(response.choices[0].message.content)
            except Exception as openai_err:
                err_str = str(openai_err)
                if "content_filter" in err_str.lower() or "ResponsibleAIPolicyViolation" in err_str:
                    azure_filter_triggered = True
                    analysis = {
                        "score": 100,
                        "category": "CONTENIDO_EXTREMO_AZURE_FILTRADO",
                        "severity": "CRITICAL",
                        "reason": "Contenido extremo bloqueado por Azure Content Filter",
                        "indicators": ["azure_content_filter"],
                        "predator_account_probable": True,
                        "recommended_action": "IMMEDIATE_INTERVENTION",
                        "target_audience_minors_probable": True,
                        "mexican_context_markers": [],
                        "cartel_attribution": detected_cartel,
                        "cartel_faction": "",
                        "detected_emojis": detected_emojis,
                        "official_category": "PROPAGANDA_DELICTIVA",
                        "pedagogia_criminal": "NINGUNA",
                        "frase_disfrazada_detectada": disguised_phrase
                    }
                else:
                    logging.error(f"Error OpenAI: {err_str}")
                    continue
            
            if analysis is None:
                continue
            
            ai_score = analysis.get("score", 0)
            score = max(ai_score, heuristic_score)
            
            if heuristic_score > ai_score and heuristic_flags:
                analysis["indicators"] = list(set(analysis.get("indicators", []) + heuristic_flags))
                if heuristic_score >= 70:
                    analysis["reason"] = f"{analysis.get('reason', '')} [SEMIOTIC: {len(heuristic_flags)} patrones detectados]"
            
            logging.info(f"Score: IA={ai_score} + Semiotic={heuristic_score} = {score}")
            
            if score >= 30:
                high_risk_count += 1
                
                finding = {
                    "id": str(uuid.uuid4()),
                    "platform": "tiktok",
                    "finding_type": "content_analysis",
                    "azure_filter_triggered": azure_filter_triggered,
                    "heuristic_score": heuristic_score,
                    "heuristic_flags": heuristic_flags,
                    "ai_score": ai_score,
                    "score": score,
                    "category": analysis.get("category", "UNKNOWN"),
                    "severity": analysis.get("severity", "LOW"),
                    "reason": analysis.get("reason", ""),
                    "indicators": analysis.get("indicators", []),
                    "predator_account_probable": analysis.get("predator_account_probable", False),
                    "recommended_action": analysis.get("recommended_action", "MONITOR"),
                    "target_audience_minors_probable": analysis.get("target_audience_minors_probable", False),
                    "mexican_context_markers": analysis.get("mexican_context_markers", []),
                    
                    "cartel_attribution": analysis.get("cartel_attribution", detected_cartel),
                    "cartel_faction": analysis.get("cartel_faction", ""),
                    "detected_emojis": detected_emojis,
                    "official_category": analysis.get("official_category", "NINGUNA"),
                    "pedagogia_criminal": analysis.get("pedagogia_criminal", "NINGUNA"),
                    "frase_disfrazada_detectada": analysis.get("frase_disfrazada_detectada", disguised_phrase),
                    
                    "video_url": video_info["video_url"],
                    "video_description": video_info["description"][:500],
                    "video_thumbnail": video_info["thumbnail"],
                    "video_created_at": video_info["created_at"],
                    
                    "author_name": video_info["author_name"],
                    "author_nickname": video_info["author_nickname"],
                    "author_verified": video_info["author_verified"],
                    "author_followers": video_info["author_followers"],
                    
                    "engagement_plays": video_info["plays"],
                    "engagement_likes": video_info["likes"],
                    "engagement_comments": video_info["comments"],
                    "engagement_shares": video_info["shares"],
                    
                    "scanned_hashtags": hashtags,
                    "hashtags_detected": video_info["hashtags"],
                    "music_detected": video_info["music_name"],
                    
                    "status": "new",
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "reported_to_platform": False,
                    "escalated_to_authorities": False,
                    "email_sent": False,
                    "email_sent_at": None,
                    
                    "detected_at": datetime.now(timezone.utc).isoformat()
                }
                
                try:
                    intel_container.create_item(body=finding)
                    findings.append({
                        "id": finding["id"],
                        "score": score,
                        "category": finding["category"],
                        "cartel": finding["cartel_attribution"],
                        "emojis": finding["detected_emojis"],
                        "frase_disfrazada": finding["frase_disfrazada_detectada"],
                        "author": finding["author_name"]
                    })
                except Exception as e:
                    logging.error(f"Error guardando: {str(e)}")
                    
        except Exception as e:
            logging.error(f"Error analizando video: {str(e)}")
            continue

    findings_sorted = sorted(findings, key=lambda x: x["score"], reverse=True)
    
    return func.HttpResponse(
        json.dumps({
            "status": "success",
            "system": "707 PREDATOR HUNTER + DECODER V4",
            "hashtags_scanned": hashtags,
            "videos_analyzed": analyzed,
            "findings_detected": high_risk_count,
            "top_findings": findings_sorted[:5],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }),
        status_code=200,
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"}
    )


# ============================================================
# ENDPOINT 6: get_intel_findings
# ============================================================

@app.route(route="get-intel-findings", methods=["GET"])
def get_intel_findings(req):
    try:
        limit = max(1, min(int(req.params.get("limit", 50)), 200))
        min_score = int(req.params.get("min_score", 30))
    except:
        limit = 50
        min_score = 30

    if intel_container is None:
        return func.HttpResponse(json.dumps({"error": "Cosmos no configurado"}), status_code=500, mimetype="application/json")

    try:
        query = f"SELECT * FROM c WHERE c.score >= {min_score} ORDER BY c._ts DESC OFFSET 0 LIMIT {limit}"
        items = list(intel_container.query_items(query=query, enable_cross_partition_query=True))
        return func.HttpResponse(
            json.dumps({"count": len(items), "findings": items}, default=str),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")


# ============================================================
# ENDPOINT 7: update_finding_status
# ============================================================

@app.route(route="update-finding-status", methods=["POST"])
def update_finding_status(req):
    try:
        body = req.get_json()
        finding_id = body.get("finding_id")
        new_status = body.get("new_status")
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=400, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})

    if not finding_id:
        return func.HttpResponse(json.dumps({"error": "finding_id requerido"}), status_code=400, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})

    if intel_container is None:
        return func.HttpResponse(json.dumps({"error": "Cosmos no configurado"}), status_code=500, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})

    try:
        finding = intel_container.read_item(item=finding_id, partition_key="tiktok")
        finding["status"] = new_status
        finding["reviewed_at"] = datetime.now(timezone.utc).isoformat()
        if new_status == "reported":
            finding["reported_to_platform"] = True
        if new_status == "escalated":
            finding["escalated_to_authorities"] = True
        intel_container.replace_item(item=finding_id, body=finding)
        return func.HttpResponse(
            json.dumps({"success": True, "finding_id": finding_id, "new_status": new_status}),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})


# ============================================================
# ENDPOINT 8: generate_dossier
# ============================================================

@app.route(route="generate-dossier", methods=["GET", "POST"])
def generate_dossier(req):
    finding_id = req.params.get("finding_id")
    if not finding_id:
        try:
            body = req.get_json()
            finding_id = body.get("finding_id") if body else None
        except:
            pass

    if not finding_id or intel_container is None:
        return func.HttpResponse(json.dumps({"error": "finding_id requerido"}), status_code=400, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})

    try:
        finding = intel_container.read_item(item=finding_id, partition_key="tiktok")
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": "Finding no encontrado"}), status_code=404, mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})

    html_dossier = build_dossier_html(finding)

    return func.HttpResponse(
        html_dossier,
        status_code=200,
        mimetype="text/html",
        headers={"Access-Control-Allow-Origin": "*"}
    )


def build_dossier_html(finding):
    """Genera el HTML del dossier - reutilizable para email tambien."""
    now = datetime.now(timezone.utc)
    finding_id = finding.get("id", "unknown")
    report_id = f"707-{now.strftime('%Y%m%d')}-{finding_id[:8].upper()}"
    
    indicators_html = "".join([f"<li>{ind}</li>" for ind in finding.get("indicators", [])])
    hashtags_html = ", ".join([f"#{h}" for h in finding.get("hashtags_detected", [])])
    emojis_html = " ".join(finding.get("detected_emojis", []))
    
    cartel = finding.get("cartel_attribution", "UNKNOWN")
    cartel_display = cartel if cartel != "UNKNOWN" else "No identificado"
    if finding.get("cartel_faction"):
        cartel_display += f" - faccion {finding.get('cartel_faction')}"
    
    frase_disfrazada = finding.get("frase_disfrazada_detectada", "NINGUNA")
    
    thumbnail_html = ""
    if finding.get("video_thumbnail") and not finding.get("azure_filter_triggered"):
        thumbnail_html = f'<img src="{finding["video_thumbnail"]}" style="max-width:300px;border:1px solid #ccc;border-radius:8px;"/>'
    else:
        thumbnail_html = '<div style="padding:40px;background:#fee;border:2px solid #c33;border-radius:8px;text-align:center;"><strong style="color:#c33;">CONTENIDO BLOQUEADO POR AZURE</strong></div>'

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>707 Predator Hunter - Dossier {report_id}</title>
<style>
  body {{ font-family: -apple-system, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; }}
  .header {{ border-bottom: 3px solid #ff0050; padding-bottom: 20px; margin-bottom: 30px; }}
  .header h1 {{ color: #ff0050; font-size: 28px; margin: 0; }}
  .meta {{ background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }}
  .section {{ margin: 25px 0; }}
  .section h2 {{ color: #ff0050; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 8px; }}
  .score-box {{ background: #fee; border-left: 4px solid #c33; padding: 15px; margin: 15px 0; }}
  .score-box .score {{ font-size: 48px; font-weight: bold; color: #c33; }}
  .cartel-box {{ background: #1a1a2e; color: #fff; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff0050; }}
  .cartel-box h3 {{ margin-top: 0; color: #ff0050; }}
  .emoji-display {{ font-size: 32px; margin: 10px 0; letter-spacing: 8px; }}
  .disguised-box {{ background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; margin: 15px 0; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }}
  .grid-item {{ background: #f9f9f9; padding: 12px; border-radius: 6px; }}
  ul {{ padding-left: 20px; }}
  ul li {{ margin: 6px 0; }}
  .footer {{ margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; font-size: 11px; color: #888; }}
  .btn-print {{ background: #ff0050; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }}
  @media print {{ .btn-print {{ display: none; }} }}
</style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
  
  <div class="header">
    <h1>707 PREDATOR HUNTER + DECODER</h1>
    <div style="color:#666;font-size:14px;">Inteligencia Semiotica - Crimen Organizado Mexicano</div>
  </div>

  <div class="meta">
    <strong>ID:</strong> {report_id}<br>
    <strong>Generado:</strong> {now.strftime('%d de %B de %Y, %H:%M UTC')}<br>
    <strong>Plataforma:</strong> TikTok<br>
    <strong>Estado:</strong> {finding.get("status", "new").upper()}
  </div>

  <div class="cartel-box">
    <h3>ATRIBUCION DE CARTEL</h3>
    <p style="font-size:24px;margin:10px 0;"><strong>{cartel_display}</strong></p>
    <div class="emoji-display">{emojis_html if emojis_html else "Sin emojis cartelarios"}</div>
    <p style="font-size:12px;opacity:0.8;margin:0;">Categoria: {finding.get("official_category", "NINGUNA")}</p>
    <p style="font-size:12px;opacity:0.8;margin:0;">Pedagogia: {finding.get("pedagogia_criminal", "NINGUNA")}</p>
  </div>

  {f'<div class="disguised-box"><strong>FRASE DISFRAZADA DETECTADA:</strong> "{frase_disfrazada}"<br><small>Esta frase parece oferta laboral legitima pero contiene indicadores de reclutamiento criminal.</small></div>' if frase_disfrazada and frase_disfrazada != "NINGUNA" else ''}

  <div class="section">
    <h2>Resumen Ejecutivo</h2>
    <div class="score-box">
      <div class="score">{finding.get("score", 0)}/100</div>
      <strong>Categoria:</strong> {finding.get("category", "UNKNOWN").replace("_", " ")}<br>
      <strong>Severidad:</strong> {finding.get("severity", "-")}<br>
      <strong>Accion Recomendada:</strong> {finding.get("recommended_action", "MONITOR").replace("_", " ")}
    </div>
    <p><strong>Analisis 707:</strong> {finding.get("reason", "Sin analisis")}</p>
  </div>

  <div class="section">
    <h2>Cuenta Investigada</h2>
    <div class="grid">
      <div class="grid-item"><strong>Usuario:</strong> @{finding.get("author_name", "-")}</div>
      <div class="grid-item"><strong>Seguidores:</strong> {finding.get("author_followers", 0):,}</div>
      <div class="grid-item"><strong>Verificado:</strong> {"Si" if finding.get("author_verified") else "No"}</div>
      <div class="grid-item"><strong>Predador Probable:</strong> {"SI" if finding.get("predator_account_probable") else "Indeterminado"}</div>
    </div>
  </div>

  <div class="section">
    <h2>Evidencia</h2>
    <div style="text-align:center; margin: 20px 0;">{thumbnail_html}</div>
    <p><strong>URL:</strong> <a href="{finding.get("video_url", "#")}">{finding.get("video_url", "-")}</a></p>
    <p><strong>Descripcion:</strong> {finding.get("video_description", "-")}</p>
    <p><strong>Hashtags:</strong> {hashtags_html}</p>
    <p><strong>Musica:</strong> {finding.get("music_detected", "-")}</p>
  </div>

  <div class="section">
    <h2>Indicadores Detectados</h2>
    <ul>{indicators_html if indicators_html else "<li>Sin indicadores</li>"}</ul>
  </div>

  <div class="footer">
    <p><strong>707 PREDATOR HUNTER + DECODER</strong> - Hackathon404 Mexico 2026</p>
    <p>Sistema de Inteligencia Semiotica para Proteccion Infantil. Investigacion etnografica + IA.</p>
    <p>Autoridades sugeridas: Policia Cibernetica (088), FGR, SIPINNA, INL/Embajada EE.UU.</p>
    <p>Documento ID: {report_id} - CONFIDENCIAL</p>
  </div>
</body>
</html>"""


# ============================================================
# ENDPOINT 9: send_dossier_email - NUEVO!
# Envia el dossier por email a autoridades
# ============================================================

@app.route(route="send-dossier-email", methods=["POST"])
def send_dossier_email(req):
    """Envia el dossier por email usando Resend."""
    logging.info("POST /send-dossier-email")

    if not RESEND_AVAILABLE:
        return func.HttpResponse(
            json.dumps({"error": "Email no configurado. Configura RESEND_API_KEY."}),
            status_code=500,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    try:
        body = req.get_json()
        finding_id = body.get("finding_id")
        custom_recipient = body.get("recipient_email", "")
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=400,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    if not finding_id or intel_container is None:
        return func.HttpResponse(
            json.dumps({"error": "finding_id requerido"}),
            status_code=400,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    try:
        finding = intel_container.read_item(item=finding_id, partition_key="tiktok")
    except Exception:
        return func.HttpResponse(
            json.dumps({"error": "Finding no encontrado"}),
            status_code=404,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    # Determinar destinatarios
    recipients = []
    if custom_recipient:
        recipients.append(custom_recipient)
    if DEFAULT_AUTHORITIES_EMAIL and DEFAULT_AUTHORITIES_EMAIL not in recipients:
        recipients.append(DEFAULT_AUTHORITIES_EMAIL)

    if not recipients:
        return func.HttpResponse(
            json.dumps({"error": "No hay destinatarios configurados"}),
            status_code=400,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    # Generar HTML del dossier (sera el cuerpo del correo)
    dossier_html = build_dossier_html(finding)
    
    # Construir asunto
    cartel = finding.get("cartel_attribution", "UNKNOWN")
    score = finding.get("score", 0)
    author = finding.get("author_name", "unknown")
    cartel_label = cartel if cartel != "UNKNOWN" else "Sin atribucion"
    
    subject = f"[707 INTELLIGENCE] Reporte Critico: @{author} - Score {score} - {cartel_label}"

    # Enviar via Resend
    try:
        import resend
        
        # Email body - cuerpo amigable + dossier completo
        email_body = f"""<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="background: #ff0050; color: white; padding: 20px; text-align: center;">
                <h1 style="margin:0;">707 PREDATOR HUNTER + DECODER</h1>
                <p style="margin:5px 0 0 0;">Reporte de Inteligencia Semiotica</p>
            </div>
            
            <div style="padding: 20px; background: #fee; border-left: 4px solid #c33; margin: 20px 0;">
                <h2 style="color:#c33;margin-top:0;">ALERTA CRITICA DETECTADA</h2>
                <p><strong>Cuenta:</strong> @{author}</p>
                <p><strong>Score de Riesgo:</strong> {score}/100</p>
                <p><strong>Atribucion:</strong> {cartel_label}</p>
                <p><strong>Plataforma:</strong> TikTok</p>
                <p><strong>Detectado:</strong> {finding.get("detected_at", "-")}</p>
            </div>
            
            <p>Estimado equipo de proteccion infantil:</p>
            
            <p>El sistema 707 PREDATOR HUNTER + DECODER detecto un perfil de alto riesgo que requiere su atencion inmediata. A continuacion el dossier completo de evidencia con atribucion automatica de cartel basada en analisis semiotico (emojis, hashtags, lenguaje codificado).</p>
            
            <p><strong>Accion recomendada:</strong> {finding.get("recommended_action", "MONITOR").replace("_", " ")}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <h2 style="color:#ff0050;">DOSSIER COMPLETO:</h2>
            
            {dossier_html}
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #888;">
                <p>Este reporte fue generado automaticamente por 707 PREDATOR HUNTER + DECODER.</p>
                <p>Hackathon404 Mexico 2026 - INL Embajada EE.UU. + StartupLab MX</p>
                <p>Para responder o solicitar mas informacion sobre este caso, conteste a este correo.</p>
            </div>
        </div>"""

        params = {
            "from": "707 Intelligence <onboarding@resend.dev>",
            "to": recipients,
            "subject": subject,
            "html": email_body
        }
        
        email_result = resend.Emails.send(params)
        logging.info(f"Email enviado: {email_result}")
        
        # Marcar el finding como email_sent
        finding["email_sent"] = True
        finding["email_sent_at"] = datetime.now(timezone.utc).isoformat()
        finding["email_recipients"] = recipients
        finding["status"] = "escalated"
        finding["escalated_to_authorities"] = True
        intel_container.replace_item(item=finding_id, body=finding)
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "email_id": email_result.get("id", ""),
                "recipients": recipients,
                "subject": subject,
                "finding_id": finding_id
            }),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    except Exception as e:
        logging.error(f"Error enviando email: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": f"Error enviando email: {str(e)}"}),
            status_code=500,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )


# ============================================================
# ENDPOINT 10: detect_serial_predators
# ============================================================

@app.route(route="detect-serial-predators", methods=["GET"])
def detect_serial_predators(req):
    if intel_container is None:
        return func.HttpResponse(json.dumps({"error": "Cosmos no configurado"}), status_code=500, mimetype="application/json")

    try:
        min_score = int(req.params.get("min_score", 50))
        query = f"SELECT c.author_name, COUNT(1) as finding_count, MAX(c.score) as max_score FROM c WHERE c.score >= {min_score} GROUP BY c.author_name"
        items = list(intel_container.query_items(query=query, enable_cross_partition_query=True))
        serial = [item for item in items if item.get("finding_count", 0) >= 2]
        serial.sort(key=lambda x: x.get("finding_count", 0), reverse=True)
        return func.HttpResponse(
            json.dumps({"count": len(serial), "serial_predators": serial}, default=str),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
