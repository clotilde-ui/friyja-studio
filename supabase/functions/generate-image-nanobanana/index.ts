import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  apiKey: string;
  apiSecret: string;
  aspect_ratio?: string;
}

Deno.serve(async (req: Request) => {
  // Gestion des requêtes préliminaires (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, apiKey, apiSecret, aspect_ratio }: RequestBody = await req.json();

    if (!prompt || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt, apiKey, or apiSecret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Appel de Nano Banana Pro...");

    // Appel à l'API Higgsfield (Nano Banana)
    const response = await fetch('https://platform.higgsfield.ai/nano-banana-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'hf-api-key': apiKey,
        'hf-secret': apiSecret,
      },
      body: JSON.stringify({
        prompt: prompt,
        num_images: 1,
        resolution: "1k", // On force la résolution ici (tu pourras changer en "4k" si supporté)
        aspect_ratio: aspect_ratio || "1:1",
        output_format: "png"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Higgsfield Error: ${response.statusText} - ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Nano Banana renvoie directement l'image (blob) ou un JSON avec l'image en base64 ? 
    // D'après le comportement standard des APIs de ce type et ton curl, on s'attend souvent à un JSON ou un Blob.
    // Hypothèse : Si le curl renvoie du binaire, il faut le convertir. 
    // Si c'est du JSON, on le lit. 
    // D'après ta doc curl, ça ne précisait pas le format de retour exact, mais souvent c'est du JSON avec une URL ou du base64.
    // Sécurité : On tente de lire en JSON.
    
    const data = await response.json();
    
    // Adaptation selon le format de réponse réel de Higgsfield.
    // Si l'API renvoie { "images": ["url..."] } ou { "image": "base64..." }
    // On va supposer un format standard, sinon on ajustera après ton premier test.
    
    // Si la réponse contient une image en base64 directement ou une URL
    let imageUrl = "";
    if (data.images && data.images[0]) {
       imageUrl = data.images[0]; // Cas probable liste d'URLs
    } else if (data.image) {
       imageUrl = data.image; // Cas probable image unique
    } else if (data.url) {
       imageUrl = data.url;
    } else {
       // Cas de secours : on renvoie tout pour déboguer
       console.log("Réponse brute:", data);
       // Si c'est du base64 brut sans préfixe
       // imageUrl = \`data:image/png;base64,\${data}\`;
       throw new Error("Format de réponse Nano Banana non reconnu (voir logs)");
    }

    return new Response(
      JSON.stringify({ url: imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
