import OpenAI from "openai";
import type { Client, Concept, Analysis } from "../lib/supabase";

export async function generateImagePrompt(
  client: Client,
  analysis: Analysis,
  concept: Concept,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Construction intelligente du contexte de marque
  // Si les couleurs ne sont pas définies, on demande à l'IA de les déduire du positionnement
  const brandColors = client.primary_color 
    ? `- Primaire : ${client.primary_color}
       - Secondaire : ${client.secondary_color || "À définir selon harmonie"}
       - Sombre : ${client.dark_color || "À définir"}
       - Claire : ${client.light_color || "À définir"}`
    : "Non définies spécifiquement. À DÉDUIRE impérativement du positionnement de la marque (ex: Luxe = Noir/Or, Bio = Vert/Beige, Tech = Bleu électrique/Gris).";

  const brandMood = client.brand_mood || `À DÉDUIRE du positionnement : "${analysis.brand_positioning}"`;

  const fullPrompt = `
Tu es un Directeur Artistique Expert spécialisé dans la publicité (Meta Ads / Instagram / LinkedIn).
Ton objectif est de rédiger un PROMPT DE GÉNÉRATION D'IMAGE (pour DALL-E 3 ou Ideogram) extrêmement détaillé et performant.

Tu disposes des données brutes suivantes, que tu dois interpréter pour combler les manques éventuels :

DONNÉES MARQUE & ANALYSE :
- Nom : ${client.name}
- Site : ${analysis.website_url}
- Secteur/Offre : ${analysis.offer_details}
- Cible : ${analysis.target_audience}
- Positionnement : ${analysis.brand_positioning}
- Identité Visuelle (Couleurs) : ${brandColors}
- Ambiance (Mood) : ${brandMood}

DONNÉES DU CONCEPT CRÉATIF :
- Stage Funnel : ${concept.funnel_stage}
- Idée : ${concept.concept}
- Format : ${concept.format}
- Scroll Stopper (Elément visuel fort) : ${concept.scroll_stopper}
- Visuel suggéré initialement : ${concept.suggested_visual}
- CTA : ${concept.cta}

---

TA MISSION :
Rédige un prompt final structuré pour un IA génératrice d'image. 
Si une information visuelle manque (ex: couleur), DÉDUIS-LA de manière logique par rapport au secteur d'activité et à la cible (ex: ne mets pas du rose fluo pour une banque privée).

STRUCTURE DE TA RÉPONSE (Le prompt final) :

(Ne mets pas de titre ou de blabla avant, commence direct par la description).

1. [RÔLE & FORMAT] : "Une photographie professionnelle publicitaire format carré 1080x1080..." ou "Une illustration 3D high-end..." selon ce qui convient le mieux au concept.

2. [SUJET PRINCIPAL] : Décris la scène centrale avec précision. Qui ? Quoi ? Action ? (Utilise le "Scroll Stopper" et le "Visuel suggéré").

3. [DÉCORS & LUMIÈRE] : Décris l'environnement. L'éclairage (cinématique, studio, naturel, golden hour...). L'ambiance doit coller au mood "${brandMood}".

4. [PALETTE DE COULEURS] : Impose les couleurs de la marque ou celles que tu as déduites.

5. [COMPOSITION & TEXTE] : 
C'est CRUCIAL. L'image DOIT contenir du texte intégré. Donne les instructions suivantes :
"L'image inclut du texte typographique intégré de manière réaliste et lisible :
- Headline (Titre accrocheur) : '${concept.scroll_stopper || concept.hooks?.[0] || concept.concept}'
- Bouton CTA (en bas) : '${concept.cta}'"
Précise que le texte doit être sans faute d'orthographe, avec une police moderne et lisible.

6. [STYLE VISUEL] : "Rendu photoréaliste 8k", "Style corporate memphis", "UGC style", etc.

Sois créatif, précis, et directif. L'image générée doit être prête à être sponsorisée.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }
}