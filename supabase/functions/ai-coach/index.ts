// Deno Edge Function for secure server-side Gemini AI queries
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, statsContext } = await req.json();

    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY environment secret is not set in Supabase Dashboard.");
      return new Response(JSON.stringify({ error: "AI Gateway Key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Design a premium fitness and diet analysis prompt
    const systemPrompt = `You are Coach Richards, a senior mobile performance coach and dietician for DuoGym. 
Your tone is encouraging, brief, direct, and slightly competitive (since the users are rivals competing on fitness goals).
Answer the user's question or analyze the stats provided below. Keep your response under 100 words.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nContext Metrics:\n${JSON.stringify(statsContext)}\n\nUser Question:\n${message}`
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.7,
      }
    };

    console.log("Calling Gemini API...");
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received.");

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Coach Richards was unable to formulate a plan. Keep pushing anyway!";

    return new Response(JSON.stringify({ reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI gateway failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
