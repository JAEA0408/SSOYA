export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const country = searchParams.get("country") || "kr";

  if (!q) return new Response("missing q", { status: 400 });

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=5&country=${country}`;
  const r = await fetch(url);
  const data = await r.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
