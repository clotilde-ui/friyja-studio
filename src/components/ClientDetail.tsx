import { useState, useEffect } from 'react';
import { supabase, Client, Analysis } from '../lib/supabase';
import { ArrowLeft, Plus, Calendar, ChevronRight, Trash2, Search } from 'lucide-react';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onSelectAnalysis: (analysis: Analysis) => void;
  onNewAnalysis: () => void;
}

export default function ClientDetail({ client, onBack, onSelectAnalysis, onNewAnalysis }: ClientDetailProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, [client.id]);

  async function loadAnalyses() {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnalysis(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Supprimer cette analyse ?')) return;

    try {
      const { error } = await supabase.from('analyses').delete().eq('id', id);
      if (error) throw error;
      setAnalyses(analyses.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Erreur lors de la suppression');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#232323]/60 hover:text-[#24B745] mb-8 font-bold uppercase tracking-wider text-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux clients
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#232323] uppercase tracking-tight mb-2">{client.name}</h1>
          {client.website_url && (
            <a
              href={client.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#24B745] hover:underline font-mono text-sm"
            >
              {client.website_url}
            </a>
          )}
        </div>
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-2 px-6 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] hover:shadow-[4px_4px_0px_0px_#232323] transition-all duration-200 font-bold uppercase text-xs tracking-widest border-2 border-transparent hover:border-[#232323]"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Analyse
        </button>
      </div>

      {/* SECTION IDENTITÉ VISUELLE (Carte Sombre) */}
      <div className="bg-[#232323] p-6 mb-10 border-l-4 border-[#24B745] shadow-md">
        <h3 className="text-[#FAF5ED] font-bold uppercase tracking-widest text-xs mb-6 border-b border-[#FAF5ED]/10 pb-2">
          Identité Visuelle
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[#FAF5ED]/50 text-xs mb-1 font-mono">Primaire</p>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 border border-[#FAF5ED]/20"
                style={{ backgroundColor: client.primary_color || '#000' }}
              ></div>
              <span className="text-[#FAF5ED] font-mono text-sm">{client.primary_color || 'N/A'}</span>
            </div>
          </div>
          <div>
            <p className="text-[#FAF5ED]/50 text-xs mb-1 font-mono">Secondaire</p>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 border border-[#FAF5ED]/20"
                style={{ backgroundColor: client.secondary_color || '#fff' }}
              ></div>
              <span className="text-[#FAF5ED] font-mono text-sm">{client.secondary_color || 'N/A'}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-[#FAF5ED]/50 text-xs mb-1 font-mono">Mood</p>
            <p className="text-[#FAF5ED] font-medium">{client.brand_mood || 'Non défini'}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#232323] mb-6 uppercase tracking-tight flex items-center gap-3">
        Historique des Analyses
        <span className="bg-[#232323] text-[#FAF5ED] text-xs px-2 py-1 rounded-none">
          {analyses.length}
        </span>
      </h2>

      {loading ? (
        <div className="text-center py-12 text-[#232323] animate-pulse">Chargement...</div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-16 bg-[#232323] border border-[#232323]">
          <Search className="w-12 h-12 text-[#FAF5ED]/20 mx-auto mb-4" />
          <p className="text-[#FAF5ED]/60 mb-6">Aucune analyse effectuée</p>
          <button onClick={onNewAnalysis} className="text-[#24B745] hover:text-[#FAF5ED] font-bold uppercase tracking-wide underline decoration-2 underline-offset-4 transition-colors">
            Lancer une première analyse
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis)}
              // CARTE ANALYSE : Fond Sombre, Texte Crème
              className="group flex items-center justify-between p-6 bg-[#232323] border-l-4 border-transparent hover:border-[#24B745] hover:translate-x-1 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#FAF5ED] group-hover:text-[#24B745] truncate transition-colors">
                    {analysis.brand_name}
                  </h3>
                  <span className="px-2 py-0.5 bg-[#24B745]/20 text-[#24B745] text-[10px] font-bold uppercase tracking-wide border border-[#24B745]/30">
                    {analysis.ad_platform}
                  </span>
                </div>
                <p className="text-[#FAF5ED]/60 text-sm line-clamp-1 font-light">
                  {analysis.offer_details}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[#FAF5ED]/40 text-xs font-mono">
                  <Calendar className="w-3 h-3" />
                  {new Date(analysis.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => deleteAnalysis(analysis.id, e)}
                  className="p-2 text-[#FAF5ED]/20 hover:text-red-500 hover:bg-[#FAF5ED]/5 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-[#2A2A2A] flex items-center justify-center group-hover:bg-[#24B745] transition-colors">
                  <ChevronRight className="w-5 h-5 text-[#FAF5ED] group-hover:text-[#232323]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}