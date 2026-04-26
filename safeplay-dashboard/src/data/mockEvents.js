// Eventos mock que replican la estructura real de Cosmos DB
// Estos son los mismos 13 eventos que tienes guardados en producción
// Los usamos mientras construimos la UI, luego los reemplazamos por fetch real

export const mockEvents = [
  {
    id: "1b569809-83b1-42a3-8309-2eaaf24b5106",
    player_id: "10848760207",
    player_name: "Gardevoir7701",
    game_id: "SafePark_Demo",
    message: "cartel jalisco",
    score: 50,
    action: "ADVERTIR",
    categoria: "AGRESION",
    reason: "Referencia a un grupo violento, lenguaje potencialmente agresivo.",
    timestamp: "2026-04-21T00:36:22.984972+00:00"
  },
  {
    id: "138b3b8f-87cd-4714-932e-c9a58e2d2640",
    player_id: "10848760207",
    player_name: "Gardevoir7701",
    game_id: "SafePark_Demo",
    message: "cartel de jalisco",
    score: 70,
    action: "BLOQUEAR",
    categoria: "AGRESION",
    reason: "Referencia a un grupo criminal, lenguaje agresivo y peligroso.",
    timestamp: "2026-04-21T00:36:10.808361+00:00"
  },
  {
    id: "afa7c7de-4aa8-42dd-a956-8e561eb3e66b",
    player_id: "10848760207",
    player_name: "Gardevoir7701",
    game_id: "SafePark_Demo",
    message: "j0t0",
    score: 70,
    action: "BLOQUEAR",
    categoria: "PROFANIDAD",
    reason: "Lenguaje ofensivo y agresivo en el mensaje.",
    timestamp: "2026-04-21T00:35:54.683139+00:00"
  },
  {
    id: "db89100b-6885-42d3-831c-d0166ac1d276",
    player_id: "10848760207",
    player_name: "Gardevoir7701",
    game_id: "SafePark_Demo",
    message: "h0t0",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "Mensaje normal de juego.",
    timestamp: "2026-04-21T00:35:47.289762+00:00"
  },
  {
    id: "6693e740-dad3-49a8-ae78-07f22327c239",
    player_id: "10848760207",
    player_name: "Gardevoir7701",
    game_id: "SafePark_Demo",
    message: "1mb3cil",
    score: 75,
    action: "BLOQUEAR",
    categoria: "PROFANIDAD",
    reason: "Uso de lenguaje ofensivo y agresivo.",
    timestamp: "2026-04-21T00:35:38.935810+00:00"
  },
  {
    id: "c520e630-55c7-4185-95ac-df02f319d927",
    player_id: "7486230932",
    player_name: "Kevssss19",
    game_id: "SafePark_Demo",
    message: "me gustas hablemos por whastapp",
    score: 75,
    action: "BLOQUEAR",
    categoria: "PLATAFORMA_EXTERNA",
    reason: "Solicita llevar la conversación fuera de la plataforma",
    timestamp: "2026-04-21T00:32:47.386638+00:00"
  },
  {
    id: "83645987-8bda-455e-8901-3841d8144d1f",
    player_id: "7486230932",
    player_name: "Kevssss19",
    game_id: "SafePark_Demo",
    message: "hola",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "Mensaje normal de saludo.",
    timestamp: "2026-04-21T00:32:36.371177+00:00"
  },
  {
    id: "e3b89cfa-e1fc-4fec-a41b-4e5c47665498",
    player_id: "7486230932",
    player_name: "Kevssss19",
    game_id: "SafePark_Demo",
    message: "pasame tu numero",
    score: 75,
    action: "BLOQUEAR",
    categoria: "PII",
    reason: "Solicitud de información personal explícita.",
    timestamp: "2026-04-21T00:29:56.500712+00:00"
  },
  {
    id: "44549da5-7356-49c1-98e0-5cda734f13db",
    player_id: "7486230932",
    player_name: "Kevssss19",
    game_id: "SafePark_Demo",
    message: "hola buenas noches",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "saludo normal en el contexto de juego",
    timestamp: "2026-04-21T00:29:52.865364+00:00"
  },
  {
    id: "af2f95a4-7d96-4415-92d4-f4d8e937b93d",
    player_id: "produccion_test",
    player_name: "PonchoTest",
    game_id: "SafePark_Demo",
    message: "probando produccion con cosmos integrado",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "Mensaje relacionado con el juego, sin riesgos detectados.",
    timestamp: "2026-04-21T00:21:08.219542+00:00"
  },
  {
    id: "b898f36f-7ff2-406e-9828-5c29a1604620",
    player_id: "99999",
    player_name: "AdultoSospechoso",
    game_id: "SafePark_Demo",
    message: "eres muy especial, no le digas a tus papas que hablamos",
    score: 85,
    action: "BLOQUEAR",
    categoria: "GROOMING",
    reason: "Pide que se mantenga en secreto la conversación.",
    timestamp: "2026-04-20T23:06:07.784557+00:00"
  },
  {
    id: "266b5668-dea1-464f-b3e6-bbc55540c41d",
    player_id: "12345",
    player_name: "Poncho",
    game_id: "SafePark_Demo",
    message: "probando SafePlay con Cosmos",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "mensaje normal de prueba",
    timestamp: "2026-04-20T22:48:30.140725+00:00"
  },
  {
    id: "5d327686-ff2c-4fde-b732-a28fa8b6439e",
    player_id: "12345",
    player_name: "Poncho",
    game_id: "SafePark_Demo",
    message: "probando SafePlay con Cosmos",
    score: 0,
    action: "PERMITIR",
    categoria: "SEGURO",
    reason: "mensaje normal de prueba",
    timestamp: "2026-04-20T22:48:25.830449+00:00"
  }
];