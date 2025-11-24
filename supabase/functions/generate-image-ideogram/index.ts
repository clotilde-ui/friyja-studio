import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  apiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, apiKey }: RequestBody = await req.json();

    if (!prompt || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or apiKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Préparation du corps de la requête au format multipart/form-data
    const formData = new FormData();
    formData.append('prompt', prompt);
    // CORRECTION : Utilisation du format "10x16" (validé par l'erreur précédente)
    formData.append('aspect_ratio', '10x16');
    formData.append('model', 'V_3'); 
    formData.append('magic_prompt_option', 'AUTO'); 

    // Appel à l'URL finale correcte pour la V3
    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: { 'Api-Key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ideogram API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Ideogram API Error: ${response.statusText} - ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    if (!data.data || !data.data[0]?.url) throw new Error('No image URL returned by Ideogram API');

    return new Response(
      JSON.stringify({ data: [{ url: data.data[0].url }] }),
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