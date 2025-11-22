import { useState, useEffect } from 'react';
import { supabase, Client } from '../lib/supabase';
import { Plus, ChevronRight, Trash2, Lightbulb } from 'lucide-react';

interface ClientListProps {
  onSelectClient: (client: Client) => void;
  onNewClient: () => void;
}

export default function ClientList({ onSelectClient, onNewClient }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientAnalyses, setClientAnalyses] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);

      if (data && data.length > 0) {
        const clientIds = data.map(c => c.id);
        const { data: analyses } = await supabase.from('analyses').select('id, client_id').in('client_id', clientIds);
        if (analyses) {
          const counts: { [key: string]: number } = {};
          analyses.forEach(a => { counts[a.client_id] = (counts[a.client_id] || 0) + 1; });
          setClientAnalyses(counts);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Supprimer ce client et toutes ses analyses ?')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-[#232323] animate-pulse">Chargement...</div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-[#232323] uppercase tracking-tight">Mes Clients</h2>
        <button
          onClick={onNewClient}
          className="flex items-center gap-2 px-6 py-3 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] hover:shadow-[4px_4px_0px_0px_#232323] transition-all duration-200 font-bold uppercase text-xs tracking-wider border-2 border-transparent hover:border-[#232323]"
        >
          <Plus className="w-5 h-5" />
          Nouveau Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 bg-[#232323] border border-[#232323]">
          <p className="text-[#FAF5ED]/60 mb-6 text-lg">Aucun client pour le moment</p>
          <button onClick={onNewClient} className="text-[#24B745] hover:text-[#FAF5ED] font-bold uppercase tracking-wide underline decoration-2 underline-offset-4 transition-colors">
            Créer votre premier client
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              // STYLE BRUTALISTE : Fond Anthracite, Texte Beige, Angles Droits (gérés par index.css)
              className="flex items-center justify-between p-6 bg-[#232323] text-[#FAF5ED] hover:shadow-[8px_8px_0px_0px_#24B745] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200 cursor-pointer group border-2 border-[#232323]"
            >
              <div className="flex-1">
                <h3 className="font-bold text-xl group-hover:text-[#24B745] transition-colors uppercase tracking-wide">{client.name}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs text-[#FAF5ED]/50 font-mono">
                    {new Date(client.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {clientAnalyses[client.id] > 0 && (
                    <span className="flex items-center gap-2 text-xs text-[#232323] font-bold bg-[#24B745] px-3 py-1">
                      <Lightbulb className="w-3 h-3" />
                      {clientAnalyses[client.id]} PROJET{clientAnalyses[client.id] > 1 ? 'S' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => deleteClient(client.id, e)}
                  className="p-3 text-[#FAF5ED]/30 hover:text-red-500 hover:bg-[#FAF5ED]/5 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <ChevronRight className="w-6 h-6 text-[#FAF5ED]/30 group-hover:text-[#24B745] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}