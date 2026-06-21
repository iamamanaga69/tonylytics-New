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
    const systemPrompt = `You are Coach Richards, an elite personal performance trainer and master dietician for the DuoGym tracker. 
You have access to a rich statsContext object containing the user's details (age, height, weight, goal weight, targets), 
their logged meals for the day, weekly schedule template, custom foods, recent workout history, daily/general notes, XP, and badges.

Your mission is to act as an insanely smart, scientifically-backed personal coach. 
Analyze the metrics context carefully and respond to the user's question with precise, actionable, and professional coaching advice. 
If they have a query about macros, diet schedule, or training methods, explain the underlying logic clearly.
If the message is empty or general, perform a deep stats analysis: highlight their progress, flag any macro imbalances, offer optimization tips for their diet/workout, and provide a competitive, friendly push relative to their rival.
Keep the response structured, clear, and engaging.`;

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
        maxOutputTokens: 1000,
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
