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

interface AnalysisResult {
  brandName: string;
  offerDetails: string;
  targetAudience: string;
  brandPositioning: string;
  rawContent: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandMood?: string;
}

// Fonction utilitaire pour extraire les couleurs hexadécimales
function extractHexColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{6}/g) || [];
  return matches.map(c => c.toLowerCase());
}

// Fonction de fetch avec retry et rotation de User-Agent
async function fetchWithFallback(url: string): Promise<Response> {
  // 1. Tentative avec Headers de navigateur moderne (Windows/Chrome)
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Connection': 'keep-alive'
  };

  console.log(`Attempting scrape of ${url} with Browser headers...`);
  let response = await fetch(url, { method: 'GET', headers: browserHeaders });

  // Si succès, on retourne
  if (response.ok) return response;

  // Si bloqué (403 Forbidden ou 401 Unauthorized), on tente la stratégie "Googlebot"
  if (response.status === 403 || response.status === 401) {
    console.log(`Browser headers blocked (${response.status}). Retrying with Googlebot headers...`);
    
    const googleBotHeaders = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    response = await fetch(url, { method: 'GET', headers: googleBotHeaders });
  }

  return response;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- AUTHENTIFICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: settings } = await supabase
      .from('settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) throw new Error("OpenAI API key not configured");

    // --- SCRAPING AMÉLIORÉ ---
    const response = await fetchWithFallback(url);

    if (!response.ok) {
      console.error(`Scraping completely failed for ${url}: ${response.status} ${response.statusText}`);
      try { const errText = await response.text(); console.error('Error body:', errText.substring(0, 500)); } catch {}
      
      // Message d'erreur plus explicite pour l'utilisateur
      let userMessage = `Failed to fetch website: ${response.status} ${response.statusText}`;
      if (response.status === 403) userMessage += " (Site protected against bots)";
      
      throw new Error(userMessage);
    }

    const html = await response.text();

    // 1. Extraction ciblée (Header, Footer, SVG)
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
    const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
    // On cherche les SVG (souvent des logos)
    const svgMatches = html.match(/<svg[\s\S]*?<\/svg>/gi) || [];

    let priorityColors: string[] = [];

    // Couleurs trouvées dans les zones structurelles
    if (headerMatch) priorityColors.push(...extractHexColors(headerMatch[0]));
    if (footerMatch) priorityColors.push(...extractHexColors(footerMatch[0]));
    svgMatches.forEach(svg => priorityColors.push(...extractHexColors(svg)));

    // 2. Extraction intelligente via Variables CSS (--primary, --brand, etc.)
    // On cherche des motifs comme: --primary-color: #123456
    const cssVarMatches = html.match(/--[a-zA-Z0-9-]*(color|primary|brand|main|accent)[a-zA-Z0-9-]*:\s*(#[0-9a-fA-F]{6})/gi) || [];
    const cssBrandColors = cssVarMatches.map(m => m.match(/#[0-9a-fA-F]{6}/)?.[0]?.toLowerCase()).filter(Boolean) as string[];

    // 3. Fréquence globale (Fallback)
    const allColors = extractHexColors(html);
    const colorCounts: Record<string, number> = {};
    allColors.forEach(c => colorCounts[c] = (colorCounts[c] || 0) + 1);

    // Liste noire des couleurs "communes" à ignorer pour la détection de marque
    const ignoreList = ['#ffffff', '#000000', '#f8f8f8', '#f2f2f2', '#eeeeee', '#333333', '#222222', '#111111'];
    
    const topGlobalColors = Object.entries(colorCounts)
      .filter(([c]) => !ignoreList.includes(c)) // On retire les gris/noirs/blancs
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([c]) => c);

    // On prépare la liste finale pour l'IA : D'abord les variables CSS, puis Header/Footer, puis le reste
    // On utilise un Set pour dédoublonner
    const finalColorCandidates = [...new Set([...cssBrandColors, ...priorityColors, ...topGlobalColors])].slice(0, 15);

    // --- NETTOYAGE CONTENU TEXTE ---
    const text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // --- PROMPT IA ---
    const contentForAI = `
Page Title: ${title}

DETECTED COLOR CANDIDATES (Sorted by likelihood of being brand colors):
${finalColorCandidates.join(', ')}

(Note: "priorityColors" come from CSS variables, Header, Footer and SVGs. Please favor them over others.)

Content: ${text.substring(0, 4000)}`;

    const aiPrompt = `Tu es un expert en UI/UX et branding.

Analyse ce contenu de site web et les codes couleurs extraits.
Ta mission est d'identifier la CHARTE GRAPHIQUE de la marque.

Règles pour les couleurs :
1. Choisis la "primaryColor" parmi les candidats fournis. C'est la couleur d'accent principale (souvent utilisée pour les boutons, le logo, ou définie comme --primary). Évite le noir ou le gris foncé sauf si c'est clairement une marque de luxe monochrome.
2. Choisis une "secondaryColor" qui est soit complémentaire, soit une nuance de la primaire présente dans la liste.

${contentForAI}

Réponds UNIQUEMENT avec un JSON valide au format suivant (sans markdown):
{
  "brandName": "Nom de la marque",
  "offerDetails": "Description de l'offre (2-3 phrases)",
  "targetAudience": "Cible prioritaire",
  "brandPositioning": "Positionnement et ton",
  "primaryColor": "Code HEX de la couleur principale",
  "secondaryColor": "Code HEX de la couleur secondaire",
  "brandMood": "L'ambiance visuelle en 3-4 mots clés (ex: Minimaliste, Tech, Organique, Sombre, Luxueux...)"
}`;

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

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error('Invalid AI response format');
    
    const aiResult = JSON.parse(jsonMatch[0]);

    const result: AnalysisResult = {
      brandName: aiResult.brandName || title,
      offerDetails: aiResult.offerDetails || '',
      targetAudience: aiResult.targetAudience || '',
      brandPositioning: aiResult.brandPositioning || '',
      rawContent: text.substring(0, 5000),
      primaryColor: aiResult.primaryColor,
      secondaryColor: aiResult.secondaryColor,
      brandMood: aiResult.brandMood
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});