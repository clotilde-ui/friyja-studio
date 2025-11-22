import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  url: string;
}

// Mise à jour de l'interface de résultat
interface AnalysisResult {
  brandName: string;
  offerDetails: string;
  targetAudience: string;
  brandPositioning: string;
  rawContent: string;
  // Nouveaux champs
  primaryColor?: string;
  secondaryColor?: string;
  brandMood?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ... (Authentification et récupération des clés API identiques au code précédent) ...
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) { throw new Error("Authorization required"); }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) { throw new Error("Unauthorized"); }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: settings } = await supabase
      .from('settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) { throw new Error("OpenAI API key not configured"); }

    // 1. Fetch du site
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch website: ${response.statusText}`);
    const html = await response.text();

    // 2. Extraction des couleurs (Avant le nettoyage du texte)
    // Regex pour trouver les codes hex (ex: #ff0000 ou #f00)
    const hexColors = html.match(/#[0-9a-fA-F]{6}/g) || [];
    
    // Compter la fréquence des couleurs pour trouver les dominantes
    const colorCounts: Record<string, number> = {};
    hexColors.forEach(color => {
      const c = color.toLowerCase();
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    });
    
    // Trier par fréquence et garder le top 10
    const topColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([color]) => color);

    // 3. Nettoyage du texte (Code existant)
    const text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // 4. Préparation du prompt IA enrichi
    const contentForAI = `Page Title: ${title}\n\nTop Colors Found in CSS: ${topColors.join(', ')}\n\nContent: ${text.substring(0, 4000)}`;

    const aiPrompt = `Tu es un expert en analyse marketing et branding.

Analyse ce contenu de site web et les couleurs extraites du code pour déduire l'identité visuelle.

${contentForAI}

Réponds UNIQUEMENT avec un JSON valide au format suivant (sans markdown):
{
  "brandName": "Nom de la marque",
  "offerDetails": "Description de l'offre (2-3 phrases)",
  "targetAudience": "Cible prioritaire",
  "brandPositioning": "Positionnement et ton",
  "primaryColor": "Le code hexadécimal le plus probable pour la couleur primaire (choisis parmi les couleurs fournies ou déduis-le)",
  "secondaryColor": "Une couleur secondaire contrastante ou complémentaire (hex)",
  "brandMood": "L'ambiance visuelle en 3-4 mots clés (ex: Minimaliste, Tech, Organique, Sombre, Luxueux...)"
}`;

    // ... (Appel OpenAI identique) ...
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openai_api_key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert marketing. JSON only.' },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) throw new Error('OpenAI API error');
    const aiData = await openaiResponse.json();
    const aiResult = JSON.parse(aiData.choices[0].message.content);

    const result: AnalysisResult = {
      brandName: aiResult.brandName || title,
      offerDetails: aiResult.offerDetails || '',
      targetAudience: aiResult.targetAudience || '',
      brandPositioning: aiResult.brandPositioning || '',
      rawContent: text.substring(0, 5000),
      // Mapping des nouvelles données
      primaryColor: aiResult.primaryColor,
      secondaryColor: aiResult.secondaryColor,
      brandMood: aiResult.brandMood
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // ... gestion d'erreur ...
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});