// Route /api/ia : envoie les messages de l'appli à Grok (xAI) et renvoie la réponse en flux.
// La clé reste secrète côté serveur (variable XAI_API_KEY).
const MAX_BYTES = 3_000_000; // ~ une photo réduite + texte
const MAX_MESSAGES = 12;

const json = (o, s) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

// Garde seulement du texte et des images en data:image (pas d'URL externe)
function clean(m) {
  if (!m || !["user", "assistant"].includes(m.role)) return null;
  if (typeof m.content === "string") return { role: m.role, content: m.content.slice(0, 12000) };
  if (!Array.isArray(m.content)) return null;
  const parts = m.content
    .map((p) => {
      if (p && p.type === "text" && typeof p.text === "string") return { type: "text", text: p.text.slice(0, 12000) };
      const u = p && p.type === "image_url" && p.image_url && p.image_url.url;
      if (typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(u))
        return { type: "image_url", image_url: { url: u, detail: "high" } };
      return null;
    })
    .filter(Boolean);
  return parts.length ? { role: m.role, content: parts } : null;
}

export default async (req) => {
  const key = Netlify.env.get("XAI_API_KEY");
  if (!key) return json({ error: "XAI_API_KEY manquante" }, 500);

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return json({ error: "Requête trop grosse" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "JSON invalide" }, 400); }

  const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-MAX_MESSAGES).map(clean).filter(Boolean);
  if (!messages.length) return json({ error: "Aucun message" }, 400);

  const model =
    body.tier === "complex"
      ? Netlify.env.get("GROK_MODEL_COMPLEX") || Netlify.env.get("GROK_MODEL")
      : Netlify.env.get("GROK_MODEL_QUICK") || Netlify.env.get("GROK_MODEL");
  if (!model) return json({ error: "GROK_MODEL manquant" }, 500);

  const up = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2000 }),
  });
  if (!up.ok || !up.body) {
    console.error("xAI error", up.status, (await up.text()).slice(0, 300));
    return json({ error: "Erreur du modèle" }, up.status === 429 ? 429 : 502);
  }
  return new Response(up.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
  });
};

export const config = { path: "/api/ia", method: "POST" };
