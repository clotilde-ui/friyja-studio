import { useState } from 'react';
import { supabase, Client, Analysis } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { scrapeWebsite } from '../services/scrapeService';
import { ArrowLeft, Globe, Loader, Palette, Sparkles } from 'lucide-react';

interface AnalysisFormProps {
  client: Client;
  onBack: () => void;
  onAnalysisCreated: (analysis: Analysis) => void;
}

export default function AnalysisForm({ client, onBack, onAnalysisCreated }: AnalysisFormProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    brandName: '',
    offerDetails: '',
    targetAudience: '',
    brandPositioning: '',
    primaryColor: client.primary_color || '',
    secondaryColor: client.secondary_color || '',
    brandMood: client.brand_mood || '',
  });
  
  const [scraped, setScraped] = useState(false);

  async function handleScrape() {
    if (!url) { alert('Veuillez entrer une URL'); return; }
    setLoading(true);
    try {
      const result = await scrapeWebsite(url);
      setFormData(prev => ({
        ...prev,
        brandName: result.brandName,
        offerDetails: result.offerDetails,
        targetAudience: result.targetAudience,
        brandPositioning: result.brandPositioning,
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
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          brand_mood: formData.brandMood,
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

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
        className="flex items-center gap-2 text-[#232323]/60 hover:text-[#24B745] mb-8 font-bold uppercase tracking-wider text-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {/* CARTE PRINCIPALE : FOND NOIR, TEXTE CRÈME */}
      <div className="bg-[#232323] p-8 shadow-[8px_8px_0px_0px_#24B745] border-2 border-[#232323]">
        <h2 className="text-3xl font-black text-[#FAF5ED] mb-8 uppercase tracking-tight">
          Nouvelle Analyse <span className="text-[#24B745]">/</span> {client.name}
        </h2>

        <div className="mb-8">
          <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">
            URL du site web à analyser
          </label>
          <div className="flex gap-0">
            <div className="flex-1 relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FAF5ED]/30" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.com"
                // INPUT STYLE BRUTALIST
                className="w-full pl-12 pr-4 py-4 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] placeholder-[#FAF5ED]/20 font-mono text-sm transition-colors"
                disabled={scraped}
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={loading || scraped}
              className="px-8 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] disabled:bg-[#3A3A3A] disabled:text-[#FAF5ED]/20 transition-colors font-bold uppercase tracking-widest text-xs"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Analyse...</span>
              ) : (
                'Analyser'
              )}
            </button>
          </div>
        </div>

        {scraped && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
            
            {/* SECTION IDENTITÉ (Fond légèrement plus clair #2A2A2A) */}
            <div className="bg-[#2A2A2A] p-6 border border-[#3A3A3A]">
              <div className="flex items-center gap-2 mb-6 border-b border-[#FAF5ED]/10 pb-4">
                <Palette className="w-5 h-5 text-[#FFBEFA]" />
                <h3 className="font-bold text-[#FAF5ED] uppercase tracking-wide text-sm">Identité Visuelle détectée</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-[#FAF5ED]/50 uppercase tracking-wider mb-2">Couleur Primaire</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="h-12 w-16 p-1 bg-[#232323] border border-[#3A3A3A] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] font-mono text-sm focus:border-[#FFBEFA] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#FAF5ED]/50 uppercase tracking-wider mb-2">Couleur Secondaire</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="h-12 w-16 p-1 bg-[#232323] border border-[#3A3A3A] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] font-mono text-sm focus:border-[#FFBEFA] outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#FAF5ED]/50 uppercase tracking-wider mb-2">Ambiance / Mood</label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFBEFA]" />
                    <input
                      type="text"
                      value={formData.brandMood}
                      onChange={(e) => setFormData({ ...formData, brandMood: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-[#FFBEFA] outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION STRATÉGIE */}
            <div className="space-y-6">
              <h3 className="font-bold text-[#FAF5ED] uppercase tracking-wide text-sm border-b border-[#FAF5ED]/10 pb-2">Stratégie Marketing</h3>
              
              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Nom de la marque</label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Offre / Produits / Services</label>
                <textarea
                  value={formData.offerDetails}
                  onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Cibles prioritaires</label>
                <textarea
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Positionnement</label>
                <textarea
                  value={formData.brandPositioning}
                  onChange={(e) => setFormData({ ...formData, brandPositioning: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745]"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-4 border-2 border-[#3A3A3A] text-[#FAF5ED] hover:bg-[#3A3A3A] transition-colors font-bold uppercase tracking-widest text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] disabled:opacity-50 transition-colors font-bold uppercase tracking-widest text-xs shadow-lg"
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