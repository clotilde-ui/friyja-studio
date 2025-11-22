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
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);

      if (data && data.length > 0) {
        const clientIds = data.map(c => c.id);
        const { data: analyses } = await supabase
          .from('analyses')
          .select('id, client_id')
          .in('client_id', clientIds);

        if (analyses) {
          const counts: { [key: string]: number } = {};
          analyses.forEach(a => {
            counts[a.client_id] = (counts[a.client_id] || 0) + 1;
          });
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
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-studio-dim">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Mes Clients</h2>
        <button
          onClick={onNewClient}
          className="flex items-center gap-2 px-4 py-2 bg-studio-accent text-white rounded-lg hover:bg-[#1f9e3b] transition-colors shadow-lg shadow-green-900/20 font-medium"
        >
          <Plus className="w-5 h-5" />
          Nouveau Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 bg-studio-card rounded-xl border border-white/5 shadow-sm">
          <p className="text-studio-dim mb-4">Aucun client pour le moment</p>
          <button
            onClick={onNewClient}
            className="text-studio-accent hover:text-white font-medium transition-colors"
          >
            Créer votre premier client
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              // STYLE PREMIUM : Fond gris foncé, bordure transparente par défaut, bordure verte au survol
              className="flex items-center justify-between p-5 bg-studio-card border border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-studio-accent transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              {/* Petite barre verte décorative à gauche au survol */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-studio-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="flex-1 pl-2">
                <h3 className="font-bold text-white text-lg group-hover:text-studio-accent transition-colors">{client.name}</h3>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-xs text-studio-dim">
                    Ajouté le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {clientAnalyses[client.id] > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-studio-accent font-medium bg-studio-accent/10 border border-studio-accent/20 px-2.5 py-0.5 rounded-md">
                      <Lightbulb className="w-3 h-3" />
                      {clientAnalyses[client.id]} analyse{clientAnalyses[client.id] > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => deleteClient(client.id, e)}
                  className="p-2 text-studio-dim hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Supprimer le client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-studio-dim group-hover:text-white transition-colors transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}