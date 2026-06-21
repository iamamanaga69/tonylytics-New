// Deno Edge Function for sending Firebase Cloud Messaging (FCM) notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const fcmServiceAccount = Deno.env.get("FCM_SERVICE_ACCOUNT") || ""; // JSON string containing Firebase credentials

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Push trigger received payload:", payload);

    // Schema payload is from Supabase Database Webhooks:
    // { type: 'INSERT', table: 'duogym_chat', record: { sender: 'aman', receiver: 'rishit', message: 'Hello' } }
    const record = payload.record;
    if (!record || !record.receiver || !record.message) {
      return new Response(JSON.stringify({ error: "Missing record payload data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sender, receiver, message } = record;

    // Initialize Supabase Client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch the target receiver's FCM token
    const { data: tokenData, error: dbError } = await supabase
      .from("duogym_device_tokens")
      .select("device_token")
      .eq("username", receiver)
      .single();

    if (dbError || !tokenData || !tokenData.device_token) {
      console.log(`No device token registered for user: ${receiver}`);
      return new Response(JSON.stringify({ status: "skipped", reason: "no token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deviceToken = tokenData.device_token;
    console.log(`Sending notification to ${receiver} using token: ${deviceToken.substring(0, 15)}...`);

    // 2. Parse Firebase Service Account Key
    if (!fcmServiceAccount) {
      console.warn("FCM_SERVICE_ACCOUNT secret not configured in Supabase env.");
      return new Response(JSON.stringify({ error: "FCM not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(fcmServiceAccount);
    const accessToken = await getAccessToken(serviceAccount);

    // 3. Post to Firebase Cloud Messaging API v1
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    const response = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: {
            title: `New Message from ${sender.toUpperCase()}`,
            body: message.length > 80 ? message.substring(0, 80) + "..." : message,
          },
          data: {
            sender,
            message,
            click_action: "FLUTTER_NOTIFICATION_CLICK", // Or corresponding Android action
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "duogym_chat_channel", // Links to active notification channel
            },
          },
        },
      }),
    });

    const fcmResult = await response.json();
    console.log("FCM Response:", fcmResult);

    return new Response(JSON.stringify({ status: "success", result: fcmResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push process failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to generate Google OAuth2 token using service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const jwtClaim = b64(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: exp,
      iat: iat,
    })
  );

  const signatureInput = `${jwtHeader}.${jwtClaim}`;
  const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const signature = await signRS256(signatureInput, privateKey);

  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokens = await response.json();
  return tokens.access_token;
}

function b64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signRS256(input: string, pemKey: string): Promise<string> {
  const cleanPem = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binaryKey = Uint8Array.from(atob(cleanPem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const inputBytes = new TextEncoder().encode(input);
  const signatureBytes = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, inputBytes);

  let binary = "";
  const signArray = new Uint8Array(signatureBytes);
  for (let i = 0; i < signArray.byteLength; i++) {
    binary += String.fromCharCode(signArray[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
