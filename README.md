# 707 Predator Hunter + Decoder

> **No detectamos. CAZAMOS y DECODIFICAMOS.**
>
> Sistema de inteligencia semiótica para combatir el reclutamiento digital de menores por el crimen organizado mexicano.

[![Hackathon404](https://img.shields.io/badge/Hackathon404-CDMX_2026-004aad)](https://hackathon404.startuplab.mx)
[![Embajada de EE.UU.](https://img.shields.io/badge/Embajada_EE.UU.-Patrocinador-5de0e6)](https://mx.usembassy.gov/)
[![Equipo](https://img.shields.io/badge/Equipo-08-004aad)](#integrantes-del-equipo)

---

##  Descripción del proyecto

**707 Predator Hunter + Decoder** es una plataforma de inteligencia que automatiza la investigación de cuentas de TikTok e Instagram sospechosas de reclutar menores para el crimen organizado mexicano.

El sistema combina scraping de redes sociales, inteligencia artificial generativa, y un decodificador semiótico especializado en la jerga visual y textual de los cárteles mexicanos (CJNG, Cártel de Sinaloa, La Maña), para producir reportes ejecutivos bilingües listos para entregar a autoridades como la Fiscalía General de la República (FGR), la Comisión Nacional de Búsqueda (CNB) y TikTok México.

**El resultado:** una investigación que tomaba semanas a un analista humano, ahora se completa en menos de 5 minutos con evidencia probatoria, atribución de cártel probable, geolocalización y validación cruzada entre plataformas.

---

##  Problema que resuelve

México atraviesa una crisis de reclutamiento digital de menores sin precedentes:

- **144,000 personas desaparecidas** en México (CNB, 2024)
- **145,000-250,000 niños, niñas y adolescentes (NNA)** en alto riesgo de reclutamiento por crimen organizado (REDIM, 2024)
- **300-350 NNA reclutados por semana** en plataformas digitales (estimación REDIM)
- El crimen organizado es el **5to empleador del país** en términos de capacidad de reclutamiento

Los cárteles han migrado su reclutamiento de las calles a TikTok e Instagram, donde usan un código semiótico complejo para evadir la moderación: emojis cartelarios (🍕 = Sinaloa, 🆖 = NG/CJNG), hashtags codificados (#chapizza, #4letras, #wakala), y frases disfrazadas como "corte de agave", "trabajo bien pagado" o "se busca personal valiente".

Las autoridades mexicanas no tienen herramientas para procesar este volumen de información a la velocidad que se publica. Un investigador humano puede tardar **2 semanas** en analizar manualmente UNA cuenta sospechosa. Mientras tanto, los reclutadores publican cientos de videos al día.

**707 cierra esa brecha.** Convierte un proceso manual de semanas en un análisis automatizado de minutos, con evidencia formateada para acción legal inmediata.

---

##  Tecnologías y herramientas utilizadas

### Frontend
- **React 18** + **Vite** (build tool)
- **Tailwind CSS** (estilizado)
- **Lucide React** (iconografía)
- **react-force-graph-3d** + **Three.js** (visualización 3D del grafo de red)
- **JavaScript ES6+** (lógica de cliente)

### Backend
- **Python 3.11**
- **Azure Functions** (serverless, Flex Consumption)
- **WeasyPrint** (generación de PDF desde HTML)
- **Resend** (entrega transaccional de emails)

### Servicios de Inteligencia Artificial y Datos
- **Azure OpenAI Service** — modelo `gpt-4o-mini` para análisis semántico, clasificación de intención, atribución de cártel y detección semiótica
- **Apify** — scraping ético de TikTok (perfiles, videos, comentarios) e Instagram (cross-platform validation)
- **Azure Cosmos DB** — persistencia NoSQL de eventos, hallazgos de inteligencia y nodos de la red analizada
- **Azure Blob Storage** — almacenamiento de assets

### Infraestructura
- **Azure Static Web Apps** — hosting del frontend con CI/CD vía GitHub Actions
- **Azure Functions Flex Consumption** — backend escalable
- **Azure Cosmos DB** (SQL API) — base de datos
- **GitHub Actions** — pipelines de despliegue automático

---

##  Documentación explícita del uso de IA

En cumplimiento con los lineamientos del hackathon, se documenta a continuación el uso transparente de inteligencia artificial en este proyecto:

### 1. Azure OpenAI · gpt-4o-mini

**Para qué se usa:** Es el cerebro del sistema. Se usa en cuatro funciones críticas:

- **Análisis de intención de comentarios:** clasifica cada comentario detectado como `RECRUITING_INTENT`, `RECRUITER_OUTREACH`, `CARTEL_AFFILIATION`, `SUSPICIOUS_OTHER` o `NORMAL`, con un score de 0 a 100.
- **Atribución de cártel:** identifica si el contenido analizado se asocia a CJNG, Cártel de Sinaloa o La Maña basándose en patrones léxicos y semióticos.
- **Análisis de bio del perfil:** evalúa el riesgo del perfil completo a partir de su biografía, hashtags y patrones de publicación.
- **Generación del resumen ejecutivo del dossier:** redacta el primer párrafo del reporte con tono formal gubernamental.

**En qué medida:** Cada análisis de perfil completo realiza entre 30 y 50 llamadas al modelo (1 por video, 1 por comentario crítico, 1 por bio, 1 por resumen). El costo aproximado por investigación es de USD $0.15 a $0.40, dependiendo del volumen.

### 2. Decodificador semiótico V4 (sistema híbrido reglas + IA)

**Para qué se usa:** Identifica códigos del crimen organizado mexicano que un modelo genérico no detectaría. Combina:

- **Diccionario curado** de 8 emojis cartelarios (🍕🐓🆖🥷🪖😈👹🧿)
- **Lista de hashtags narco** (#chapizza, #4letras, #wakala, #mencho, #makabelico, etc.)
- **Frases disfrazadas** ("corte de agave", "se busca personal valiente", "apoyo a madres solteras", "trabajo bien pagado")
- **Detector geográfico mexicano** que infiere estado base de operación a partir de bio + hashtags + comentarios

**En qué medida:** Es el componente diferenciador del sistema. Se ejecuta en cada análisis y enriquece la salida del modelo de IA con contexto cultural específico de México que un modelo entrenado en inglés no captaría.

### 3. Cross-platform Confidence Score

**Para qué se usa:** Valida la identidad de un sospechoso entre TikTok e Instagram. Usa 5 indicadores ponderados:

- Coincidencia de handle (30 puntos)
- Similitud de bio (25 puntos)
- Keywords cartelarios en bio IG (20 puntos)
- Emojis cartelarios (15 puntos)
- Perfil activo (10 puntos)

**En qué medida:** Se ejecuta a petición del usuario cuando solicita validación cross-platform. El resultado siempre incluye disclaimer de "match probabilístico — requiere validación humana antes de cualquier acción legal".

### 4. Asistencia de IA durante el desarrollo

Se usó **Claude (Anthropic)** como copiloto de desarrollo durante el hackathon para:
- Generación inicial de boilerplate React + Azure Functions
- Debugging de integraciones con Cosmos DB y Apify
- Refactorización del decoder semiótico
- Generación del módulo `dossier_builder.py`

Todo el código fue revisado, probado y modificado por el equipo humano antes de su integración.

---

## 🚀 Instrucciones para ejecutar el prototipo

### Demo en vivo

🌐 **URL pública:** https://safeplay-dashboard.web.app/

El sistema está desplegado en producción y disponible para evaluación inmediata. No requiere instalación.

### Ejecución local

#### Requisitos previos
- Node.js 20+
- Python 3.11+
- Cuenta de Azure con Functions, Cosmos DB y OpenAI Service
- Token de Apify
- API Key de Resend (opcional, para email)

#### Backend (Azure Functions)

```bash
cd safeplay-api

# Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp local.settings.json.example local.settings.json
# Editar local.settings.json con tus credenciales:
# - AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT
# - COSMOS_ENDPOINT, COSMOS_KEY
# - APIFY_TOKEN
# - RESEND_API_KEY (opcional)

# Iniciar el backend
func start
```

El backend escucha en `http://localhost:7071`.

#### Frontend (React + Vite)

```bash
cd safeplay-dashboard

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local:
# VITE_API_BASE_URL=http://localhost:7071/api
# VITE_FUNCTION_KEY= (vacío en local)
# VITE_API_KEY= (vacío en local)

# Iniciar el frontend
npm run dev
```

El dashboard se abre en `http://localhost:5173`.

### Flujo de demostración recomendado

1. Abre el dashboard
2. Ve al tab **"Network Intel"**
3. Ingresa un username de TikTok (sin @): por ejemplo `user19630416658133`
4. Selecciona "Últimos 10 videos (recomendado)"
5. Click **"Analizar perfil completo"** y espera 30-90 segundos
6. Revisa los resultados: profile card, grafo 3D, distribución por cártel, mapa geográfico
7. Click **"Cross-platform: Instagram"** para validación cruzada
8. Click **"Generar dossier completo"** (botón verde)
9. En el modal del dossier, prueba: **Imprimir**, **Descargar PDF**, o **Enviar por email**

---

##  Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      Usuario / Investigador                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps · React + Vite + Tailwind            │
│  3 tabs: Intelligence · Network Intel · Guardian            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure Functions · 20 endpoints HTTP · Python 3.11          │
│  /analyze-full-profile · /generate-full-dossier · ...       │
└─────────────────────────────────────────────────────────────┘
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────────┐
       │  Apify   │   │  Azure   │   │  Cosmos DB   │
       │ Scraping │   │  OpenAI  │   │ Persistencia │
       └──────────┘   └──────────┘   └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Decodificador semiótico V4                                 │
│  Atribución de cártel · Detección de estado · Cross-platform│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Dossier ejecutivo bilingüe (ES-MX/EN-US)                   │
│  HTML · PDF (WeasyPrint) · Email (Resend)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  FGR · CNB · TikTok México
```

---

## 📁 Estructura del repositorio

```
HCKMX26-1776729498/
├── README.md                          # Este archivo
├── safeplay-api/                      # Backend (Azure Functions Python)
│   ├── function_app.py                # 20 endpoints HTTP
│   ├── network_intelligence.py        # Scraping + clasificación + decoder
│   ├── dossier_builder.py             # Generación del dossier ejecutivo
│   ├── requirements.txt               # Dependencias Python
│   ├── host.json                      # Configuración Azure Functions
│   └── local.settings.json.example    # Plantilla de variables de entorno
└── safeplay-dashboard/                # Frontend (React + Vite)
    ├── src/
    │   ├── App.jsx                    # Componente raíz con 3 tabs
    │   ├── components/
    │   │   ├── Hunter/                # Tabs Intelligence + Network Intel
    │   │   │   ├── HunterConsole.jsx
    │   │   │   ├── NetworkIntelligenceTab.jsx
    │   │   │   ├── NetworkGraph.jsx           # Grafo 3D
    │   │   │   ├── CartelDistribution.jsx     # Barras por cártel
    │   │   │   ├── GeographicHeatmap.jsx      # Mapa de México
    │   │   │   ├── FullDossierModal.jsx       # Modal del dossier
    │   │   │   └── ...
    │   │   └── Guardian/              # Tab Guardian (chat moderation)
    │   └── lib/                       # Hooks de API
    ├── package.json
    └── vite.config.js
```

---

##  Integrantes del equipo

| Nombre | Rol |
|--------|-----|
| **Kevin Gutiérrez Soto** | Tech Lead · Arquitectura · Backend |
| **Dasein Paola Valencia Domínguez** | Asistencia legal e internacional |
| **Edgar Emmanuel García Ortiz** | Asistencia legal e internacional |
| **Diego Gómez Silva** | Arquitectura · Visualización de datos |

---

## 📜 Licencia

Este proyecto fue desarrollado en el contexto del **Hackathon404 CDMX 2026**, evento patrocinado por la **Embajada de los Estados Unidos en México** y **StartupLab MX**.

El código se libera bajo licencia **MIT** para fomentar su adopción por organizaciones de la sociedad civil, instituciones gubernamentales y otros equipos de seguridad ciudadana en América Latina.

---

## Materiales extra

Recursos complementarios que apoyan la presentación y comprensión del proyecto:

| Recurso | Descripción | Enlace |
|---------|-------------|--------|
| 🎨 **Pitch Deck** | Presentación ejecutiva del proyecto en Canva | [Ver pitch deck](https://www.canva.com/design/DAHH7OlOrDo/5-kE2ucKOahP_QYPCrnFNw/edit) |
| 🎬 **Video demo** | Demostración funcional del sistema en operación | [Ver video](https://drive.google.com/file/d/113GuQ1dPIKbqAnhRuzE1AgI4w6cxR5MV/view?usp=sharing) |
| 🌐 **Demo en vivo** | Plataforma desplegada en producción | [safeplay-dashboard.web.app](https://polite-mushroom-043b2ab1e.7.azurestaticapps.net) |

---
##  Agradecimientos

- **Embajada de los Estados Unidos en México** — por impulsar la innovación en seguridad ciudadana
- **StartupLab MX** — por organizar el Hackathon404
- **REDIM (Red por los Derechos de la Infancia en México)** — por la información sobre reclutamiento de menores
- **Comisión Nacional de Búsqueda (CNB)** — por la transparencia de datos sobre desapariciones
- **IneVolution** por la infrestructura de NUBE 

---

**707 Predator Hunter + Decoder** · Hackathon404 CDMX 2026 · Equipo 08

> "El crimen organizado se digitalizó. La inteligencia ciudadana también debe hacerlo."
