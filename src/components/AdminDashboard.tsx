import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Users, Database, Settings as SettingsIcon, Trash2, Eye, BarChart3, FileText, Lightbulb, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminDashboard({ onBack }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'database' | 'users' | 'config'>('database');
  const [loading, setLoading] = useState(false);
  
  // Statistiques base de données
  const [stats, setStats] = useState({
    clients: 0,
    analyses: 0,
    concepts: 0,
    featureRequests: 0,
    users: 0
  });

  // Utilisateurs
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'database') {
      loadDatabaseStats();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  async function loadDatabaseStats() {
    setLoading(true);
    try {
      const [clients, analyses, concepts, featureRequests] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('analyses').select('id', { count: 'exact', head: true }),
        supabase.from('concepts').select('id', { count: 'exact', head: true }),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        clients: clients.count || 0,
        analyses: analyses.count || 0,
        concepts: concepts.count || 0,
        featureRequests: featureRequests.count || 0,
        users: 0 // On ne peut pas compter directement les users depuis auth.users
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      // Récupérer les utilisateurs depuis la table settings (qui a user_id)
      const { data: settings, error } = await supabase
        .from('settings')
        .select('user_id, created_at, openai_api_key')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pour chaque setting, on peut récupérer l'email via une fonction admin
      // Pour l'instant, on affiche juste les user_id
      setAllUsers(settings || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(id: string) {
    if (!confirm('Supprimer ce client et toutes ses données associées ?')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      await loadDatabaseStats();
      alert('Client supprimé avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse et tous ses concepts associés ?')) return;
    try {
      const { error } = await supabase.from('analyses').delete().eq('id', id);
      if (error) throw error;
      await loadDatabaseStats();
      alert('Analyse supprimée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs hover:text-[#1f9e3b] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      
      <div className="bg-[#232323] text-[#FAF5ED] border-l-4 border-red-500 p-8 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-black uppercase">Panneau d'Administration</h1>
        </div>
        <p className="opacity-60 mb-4">Gestion complète de l'application</p>
        {user && (
          <div className="text-sm opacity-70">
            Connecté en tant que : <span className="text-[#24B745] font-bold">{user.email}</span>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b border-[#3A3A3A]">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-6 py-3 font-bold uppercase text-xs tracking-wider transition-colors ${
            activeTab === 'database'
              ? 'text-[#24B745] border-b-2 border-[#24B745]'
              : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'
          }`}
        >
          <Database className="w-4 h-4 inline mr-2" />
          Base de données
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold uppercase text-xs tracking-wider transition-colors ${
            activeTab === 'users'
              ? 'text-[#24B745] border-b-2 border-[#24B745]'
              : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 font-bold uppercase text-xs tracking-wider transition-colors ${
            activeTab === 'config'
              ? 'text-[#24B745] border-b-2 border-[#24B745]'
              : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'
          }`}
        >
          <SettingsIcon className="w-4 h-4 inline mr-2" />
          Configuration
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-[#24B745]" />
                <h3 className="text-sm font-bold uppercase">Clients</h3>
              </div>
              <p className="text-3xl font-black text-[#24B745]">{stats.clients}</p>
            </div>
            <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-[#24B745]" />
                <h3 className="text-sm font-bold uppercase">Analyses</h3>
              </div>
              <p className="text-3xl font-black text-[#24B745]">{stats.analyses}</p>
            </div>
            <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="w-5 h-5 text-[#24B745]" />
                <h3 className="text-sm font-bold uppercase">Concepts</h3>
              </div>
              <p className="text-3xl font-black text-[#24B745]">{stats.concepts}</p>
            </div>
            <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lightbulb className="w-5 h-5 text-[#24B745]" />
                <h3 className="text-sm font-bold uppercase">Suggestions</h3>
              </div>
              <p className="text-3xl font-black text-[#24B745]">{stats.featureRequests}</p>
            </div>
          </div>

          {/* Liste des clients */}
          <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
            <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#24B745]" />
              Clients
            </h2>
            {loading ? (
              <p className="opacity-60">Chargement...</p>
            ) : (
              <ClientListAdmin onDelete={deleteClient} />
            )}
          </div>

          {/* Liste des analyses */}
          <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
            <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#24B745]" />
              Analyses récentes
            </h2>
            {loading ? (
              <p className="opacity-60">Chargement...</p>
            ) : (
              <AnalysisListAdmin onDelete={deleteAnalysis} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
          <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#24B745]" />
            Utilisateurs
          </h2>
          {loading ? (
            <p className="opacity-60">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {allUsers.length === 0 ? (
                <p className="opacity-60">Aucun utilisateur trouvé</p>
              ) : (
                allUsers.map((setting) => (
                  <div
                    key={setting.user_id}
                    className="flex items-center justify-between p-4 bg-[#2A2A2A] border border-[#3A3A3A]"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-[#24B745]" />
                      <div>
                        <p className="font-bold">ID: {setting.user_id.substring(0, 8)}...</p>
                        <p className="text-xs opacity-60">
                          Inscrit le {new Date(setting.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        {setting.openai_api_key && (
                          <p className="text-xs text-[#24B745]">✓ Clé API configurée</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6">
          <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#24B745]" />
            Configuration système
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
              <h3 className="font-bold mb-2">Version de l'application</h3>
              <p className="text-sm opacity-60">Freyja Studio v1.0.0</p>
            </div>
            <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
              <h3 className="font-bold mb-2">Base de données</h3>
              <p className="text-sm opacity-60">Supabase</p>
            </div>
            <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
              <h3 className="font-bold mb-2">Statut</h3>
              <p className="text-sm text-[#24B745]">✓ Système opérationnel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour la liste des clients (admin)
function ClientListAdmin({ onDelete }: { onDelete: (id: string) => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="opacity-60">Chargement...</p>;
  if (clients.length === 0) return <p className="opacity-60">Aucun client</p>;

  return (
    <div className="space-y-2">
      {clients.map((client) => (
        <div
          key={client.id}
          className="flex items-center justify-between p-4 bg-[#2A2A2A] border border-[#3A3A3A] hover:border-[#24B745]/50 transition-colors"
        >
          <div>
            <p className="font-bold">{client.name}</p>
            <p className="text-xs opacity-60">
              Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button
            onClick={async () => {
              await onDelete(client.id);
              await loadClients();
            }}
            className="p-2 text-red-500 hover:bg-red-500/20 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Composant pour la liste des analyses (admin)
function AnalysisListAdmin({ onDelete }: { onDelete: (id: string) => void }) {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="opacity-60">Chargement...</p>;
  if (analyses.length === 0) return <p className="opacity-60">Aucune analyse</p>;

  return (
    <div className="space-y-2">
      {analyses.map((analysis) => (
        <div
          key={analysis.id}
          className="flex items-center justify-between p-4 bg-[#2A2A2A] border border-[#3A3A3A] hover:border-[#24B745]/50 transition-colors"
        >
          <div>
            <p className="font-bold">{analysis.brand_name}</p>
            <p className="text-xs opacity-60">
              {analysis.clients?.name || 'Client inconnu'} • {new Date(analysis.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button
            onClick={async () => {
              await onDelete(analysis.id);
              await loadAnalyses();
            }}
            className="p-2 text-red-500 hover:bg-red-500/20 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
