// Cloudflare Worker proxy for UF NaviGator API.
// Add your UF API key as a Worker secret named UF_API_KEY.
// Update UF_API_URL and model if your endpoint differs.

const UF_API_URL = "https://api.ai.it.ufl.edu/v1/chat/completions";
const MODEL = "granite-3.3-8b-instruct";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return json({ error: "POST required" }, 405);
    }
    try {
      const body = await request.json();
      const prompt = body.prompt || "";
      if (!prompt) return json({ error: "Missing prompt" }, 400);
      const upstream = await fetch(UF_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.UF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "You are a precise evaluator. Return valid JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });
      const data = await upstream.json();
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      return json({ result: text }, upstream.status);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
