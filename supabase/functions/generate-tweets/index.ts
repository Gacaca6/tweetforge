import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { framework, niche, topic, tone, format } = await req.json();

    if (!framework || !niche || !topic) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: framework, niche, topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a world-class Twitter/X growth strategist who has studied viral tweet patterns from top creators like Justin Welsh, Dickie Bush, Nicolas Cole, Dan Koe, and Naval Ravikant.

You know the X algorithm (open-sourced): Retweet=20x, Reply=13.5x, ProfileClick=12x, Bookmark=10x, Like=1x.

RULES YOU ALWAYS FOLLOW:
1. FIRST LINE IS EVERYTHING — stops the scroll in under 3 seconds.
2. Use specific numbers (12,847 not "thousands") — 300% more engagement.
3. Emotions that spread: awe, surprise, anger, humor, inspiration.
4. Short sentences. Heavy white space. Never a wall of text.
5. No external links in tweet (30–50% reach penalty). Links go in replies.
6. Each tweet delivers ONE clear memorable insight. Not two. One.
7. End with CTA that invites replies or retweets, not just likes.

RETURN FORMAT: ONLY a valid JSON array. No markdown, no backticks, no explanation.
Each object: { "tweet": "...", "tip": "...", "engagementFocus": "..." }
- tweet: The actual tweet text (use \\n for line breaks)
- tip: One specific insight about why this tweet works  
- engagementFocus: One of "Retweets", "Replies", "Bookmarks", "Profile Clicks"`;

    const userPrompt = `Generate 3 unique tweets using the "${framework.name}" framework.

DETAILS:
- Niche: ${niche}
- Topic/Idea: ${topic}
- Tone: ${tone}
- Format: ${format}
- Framework Formula: ${framework.formula}
- Why this framework works: ${framework.why}
- Primary engagement target: ${framework.engagementTarget}

${format === "Full Thread (5–7 tweets)" ? `For full thread format, the "tweet" field should contain ALL 5-7 tweets separated by "|||" markers. Make tweet 1 the hook, tweets 2-6 the value, last tweet the CTA.` : ""}

Generate 3 distinct variations. Return ONLY a JSON array: [{"tweet":"...","tip":"...","engagementFocus":"..."},...]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in your Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const tweets = JSON.parse(clean);

    return new Response(JSON.stringify({ tweets }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tweets error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
