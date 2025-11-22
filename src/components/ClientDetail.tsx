import { useState, useEffect } from 'react';
import { supabase, Client, Analysis } from '../lib/supabase';
import { ArrowLeft, Plus, Calendar, ChevronRight, Trash2, Search, Edit2, Save, X } from 'lucide-react';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onSelectAnalysis: (analysis: Analysis) => void;
  onNewAnalysis: () => void;
}

export default function ClientDetail({ client: initialClient, onBack, onSelectAnalysis, onNewAnalysis }: ClientDetailProps) {
  // On utilise un state local pour le client afin de pouvoir mettre à jour l'UI instantanément
  const [client, setClient] = useState<Client>(initialClient);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour l'édition de l'identité
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    primary_color: initialClient.primary_color || '',
    secondary_color: initialClient.secondary_color || '',
    brand_mood: initialClient.brand_mood || ''
  });

  useEffect(() => {
    loadAnalyses();
    // Reset des données si le client change via les props
    setClient(initialClient);
    setEditForm({
      primary_color: initialClient.primary_color || '',
      secondary_color: initialClient.secondary_color || '',
      brand_mood: initialClient.brand_mood || ''
    });
  }, [initialClient.id]);

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

  async function saveIdentity() {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          primary_color: editForm.primary_color,
          secondary_color: editForm.secondary_color,
          brand_mood: editForm.brand_mood
        })
        .eq('id', client.id);

      if (error) throw error;

      // Mise à jour locale
      setClient({ ...client, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Erreur lors de la mise à jour');
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

      {/* SECTION IDENTITÉ VISUELLE (MODIFIABLE) */}
      <div className="bg-[#232323] p-6 mb-10 border-l-4 border-[#24B745] shadow-md group relative">
        <div className="flex items-center justify-between mb-6 border-b border-[#FAF5ED]/10 pb-2">
          <h3 className="text-[#FAF5ED] font-bold uppercase tracking-widest text-xs">
            Identité Visuelle
          </h3>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[#FAF5ED]/30 hover:text-[#24B745] transition-colors p-1"
              title="Modifier l'identité"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={saveIdentity}
                className="text-[#24B745] hover:text-[#1f9e3b] p-1 bg-[#FAF5ED]/10"
                title="Sauvegarder"
              >
                <Save className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-red-400 hover:text-red-300 p-1"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          // MODE ÉDITION
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            <div>
              <label className="block text-[#FAF5ED]/50 text-[10px] font-bold uppercase mb-2">Primaire</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editForm.primary_color}
                  onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                  className="h-10 w-12 p-0 border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={editForm.primary_color}
                  onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] text-[#FAF5ED] px-2 py-1 text-xs font-mono focus:border-[#24B745] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#FAF5ED]/50 text-[10px] font-bold uppercase mb-2">Secondaire</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editForm.secondary_color}
                  onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })}
                  className="h-10 w-12 p-0 border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={editForm.secondary_color}
                  onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] text-[#FAF5ED] px-2 py-1 text-xs font-mono focus:border-[#24B745] outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[#FAF5ED]/50 text-[10px] font-bold uppercase mb-2">Mood / Ambiance</label>
              <input
                type="text"
                value={editForm.brand_mood}
                onChange={(e) => setEditForm({ ...editForm, brand_mood: e.target.value })}
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] text-[#FAF5ED] px-3 py-2 text-sm focus:border-[#24B745] outline-none"
                placeholder="Ex: Minimaliste, Tech, Luxe..."
              />
            </div>
          </div>
        ) : (
          // MODE LECTURE
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
        )}
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