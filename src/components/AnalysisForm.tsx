import { useState } from 'react';
import { supabase, Client, Analysis } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { scrapeWebsite } from '../services/scrapeService';
import { ArrowLeft, Globe, Loader, Palette, Sparkles } from 'lucide-react'; // Ajout d'icônes

interface AnalysisFormProps {
  client: Client;
  onBack: () => void;
  onAnalysisCreated: (analysis: Analysis) => void;
}

export default function AnalysisForm({ client, onBack, onAnalysisCreated }: AnalysisFormProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  // État enrichi avec les données visuelles
  const [formData, setFormData] = useState({
    brandName: '',
    offerDetails: '',
    targetAudience: '',
    brandPositioning: '',
    // Nouveaux champs visuels
    primaryColor: client.primary_color || '', // Pré-rempli si déjà existant
    secondaryColor: client.secondary_color || '',
    brandMood: client.brand_mood || '',
  });
  
  const [scraped, setScraped] = useState(false);

  async function handleScrape() {
    if (!url) {
      alert('Veuillez entrer une URL');
      return;
    }

    setLoading(true);
    try {
      const result = await scrapeWebsite(url);
      
      // On met à jour le formulaire avec TOUTES les données reçues
      setFormData(prev => ({
        ...prev,
        brandName: result.brandName,
        offerDetails: result.offerDetails,
        targetAudience: result.targetAudience,
        brandPositioning: result.brandPositioning,
        // Si le scraping renvoie des couleurs, on les utilise, sinon on garde l'existant
        primaryColor: result.primaryColor || prev.primaryColor,
        secondaryColor: result.secondaryColor || prev.secondaryColor,
        brandMood: result.brandMood || prev.brandMood,
      }));
      
      setScraped(true);
    } catch (error) {
      console.error('Scraping error:', error);
      alert('Erreur lors de l\'analyse du site. Vérifiez l\'URL.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. On met à jour le CLIENT avec les infos visuelles (Charte Graphique)
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          brand_mood: formData.brandMood,
          // On peut aussi mettre à jour le nom si le scraping l'a affiné
          // name: formData.brandName 
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

      // 2. On crée l'ANALYSE (Stratégie Marketing)
      const { data, error } = await supabase
        .from('analyses')
        .insert({
          client_id: client.id,
          user_id: user.id,
          website_url: url,
          brand_name: formData.brandName,
          offer_details: formData.offerDetails,
          target_audience: formData.targetAudience,
          brand_positioning: formData.brandPositioning,
          ad_platform: 'Meta',
          raw_content: ''
        })
        .select()
        .single();

      if (error) throw error;
      onAnalysisCreated(data);
    } catch (error) {
      console.error('Error creating analysis:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Nouvelle Analyse - {client.name}
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            URL du site web à analyser
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.com"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                disabled={scraped}
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={loading || scraped}
              className="px-6 py-2 bg-[#26B743] text-white rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyse...
                </>
              ) : (
                'Analyser le site'
              )}
            </button>
          </div>
        </div>

        {scraped && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1 : IDENTITÉ VISUELLE (Nouveau) */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-slate-800">Identité Visuelle détectée</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Couleur Primaire
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="h-9 w-14 p-1 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      placeholder="#000000"
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Couleur Secondaire
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="h-9 w-14 p-1 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Ambiance / Mood visuel
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.brandMood}
                      onChange={(e) => setFormData({ ...formData, brandMood: e.target.value })}
                      placeholder="Ex: Minimaliste, Tech, Chaleureux..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 : STRATÉGIE MARKETING (Existant) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">Stratégie Marketing</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de la marque
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Offre / Produits / Services
                </label>
                <textarea
                  value={formData.offerDetails}
                  onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cibles prioritaires
                </label>
                <textarea
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Positionnement et ton de marque
                </label>
                <textarea
                  value={formData.brandPositioning}
                  onChange={(e) => setFormData({ ...formData, brandPositioning: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-[#26B743] text-white rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors"
              >
                {loading ? 'Sauvegarde...' : 'Valider l\'analyse'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}