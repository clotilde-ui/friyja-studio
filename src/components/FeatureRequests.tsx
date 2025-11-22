import { useState, useEffect } from 'react';
import { ArrowLeft, ThumbsUp, Plus, X, Loader } from 'lucide-react';
import { supabase, FeatureRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FeatureRequestsProps {
  onBack: () => void;
  isAdmin: boolean;
}

export default function FeatureRequests({ onBack, isAdmin }: FeatureRequestsProps) {
  const { user } = useAuth();
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    loadFeatureRequests();
    if (user) {
      loadUserVotes();
    }
  }, [user]);

  async function loadFeatureRequests() {
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('upvotes_count', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur lors du chargement des suggestions:', error);
        // Si la table n'existe pas, on affiche un message plus clair
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
          console.warn('La table feature_requests n\'existe pas encore. Veuillez exécuter la migration SQL.');
          setTableError(true);
        }
        throw error;
      }
      setTableError(false);
      setFeatureRequests(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
      // On continue même en cas d'erreur pour ne pas bloquer l'interface
      setFeatureRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserVotes() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('feature_request_votes')
        .select('feature_request_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setUserVotes(new Set(data?.map(v => v.feature_request_id) || []));
    } catch (error) {
      console.error('Erreur lors du chargement des votes:', error);
    }
  }

  async function handleUpvote(featureRequestId: string) {
    if (!user) return;
    
    const hasVoted = userVotes.has(featureRequestId);
    
    try {
      if (hasVoted) {
        // Retirer le vote
        const { error } = await supabase
          .from('feature_request_votes')
          .delete()
          .eq('feature_request_id', featureRequestId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Décrémenter le compteur
        const request = featureRequests.find(r => r.id === featureRequestId);
        if (request) {
          const { error: updateError } = await supabase
            .from('feature_requests')
            .update({ upvotes_count: Math.max(0, request.upvotes_count - 1) })
            .eq('id', featureRequestId);
          
          if (updateError) throw updateError;
        }
        
        setUserVotes(prev => {
          const next = new Set(prev);
          next.delete(featureRequestId);
          return next;
        });
      } else {
        // Ajouter le vote
        const { error } = await supabase
          .from('feature_request_votes')
          .insert({ feature_request_id: featureRequestId, user_id: user.id });
        
        if (error) throw error;
        
        // Incrémenter le compteur
        const request = featureRequests.find(r => r.id === featureRequestId);
        if (request) {
          const { error: updateError } = await supabase
            .from('feature_requests')
            .update({ upvotes_count: request.upvotes_count + 1 })
            .eq('id', featureRequestId);
          
          if (updateError) throw updateError;
        }
        
        setUserVotes(prev => new Set(prev).add(featureRequestId));
      }
      
      await loadFeatureRequests();
    } catch (error: any) {
      console.error('Erreur lors du vote:', error);
      const errorMessage = error?.message || error?.error_description || 'Erreur inconnue';
      alert(`Erreur lors du vote: ${errorMessage}`);
    }
  }

  async function handleCreateRequest() {
    if (!user || !newTitle.trim() || !newDescription.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          title: newTitle.trim(),
          description: newDescription.trim(),
          status: 'pending',
          upvotes_count: 0,
          user_id: user.id
        });
      
      if (error) throw error;
      
      setNewTitle('');
      setNewDescription('');
      setShowNewModal(false);
      await loadFeatureRequests();
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      const errorMessage = error?.message || error?.error_description || 'Erreur inconnue';
      alert(`Erreur lors de la création de la suggestion: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(featureRequestId: string, newStatus: 'pending' | 'in_progress' | 'completed') {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', featureRequestId);
      
      if (error) throw error;
      await loadFeatureRequests();
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      const errorMessage = error?.message || error?.error_description || 'Erreur inconnue';
      alert(`Erreur lors du changement de statut: ${errorMessage}`);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'in_progress': return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'completed': return 'bg-green-500/20 border-green-500 text-green-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      default: return status;
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-[#232323] text-[#FAF5ED]">
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-[#24B745]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs hover:text-[#1f9e3b] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="bg-[#232323] text-[#FAF5ED] border-l-4 border-[#24B745] p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black uppercase">Suggestions</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#24B745] hover:bg-[#1f9e3b] text-[#FAF5ED] font-bold uppercase text-xs tracking-widest transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouvelle suggestion
          </button>
        </div>
        <p className="opacity-60 text-sm">Partagez vos idées pour améliorer Freyja Studio</p>
      </div>

      {tableError && (
        <div className="bg-yellow-500/20 border-l-4 border-yellow-500 p-6 mb-6 text-[#FAF5ED]">
          <h3 className="font-bold uppercase mb-2 text-yellow-400">⚠️ Migration SQL requise</h3>
          <p className="text-sm mb-3 opacity-90">
            La table <code className="bg-[#2A2A2A] px-2 py-1 rounded">feature_requests</code> n'existe pas encore dans votre base de données Supabase.
          </p>
          <p className="text-sm mb-3 opacity-90">
            Veuillez exécuter la migration SQL suivante dans votre projet Supabase :
          </p>
          <p className="text-xs font-mono bg-[#2A2A2A] p-3 border border-[#3A3A3A] mb-3">
            supabase/migrations/20250101000000_create_feature_requests.sql
          </p>
          <p className="text-xs opacity-70">
            Allez dans Supabase → SQL Editor → Exécutez le fichier de migration
          </p>
        </div>
      )}

      <div className="space-y-4">
        {featureRequests.length === 0 && !tableError ? (
          <div className="bg-[#232323] text-[#FAF5ED] p-12 text-center border border-[#3A3A3A]">
            <p className="opacity-60">Aucune suggestion pour le moment. Soyez le premier à en proposer une !</p>
          </div>
        ) : !tableError ? (
          featureRequests.map((request) => (
            <div
              key={request.id}
              className="bg-[#232323] text-[#FAF5ED] border border-[#3A3A3A] p-6 hover:border-[#24B745]/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-[#FAF5ED]">{request.title}</h3>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <p className="text-[#FAF5ED]/70 leading-relaxed">{request.description}</p>
                </div>
                
                <button
                  onClick={() => handleUpvote(request.id)}
                  disabled={!user}
                  className={`flex flex-col items-center gap-1 px-4 py-2 border-2 transition-all ${
                    userVotes.has(request.id)
                      ? 'bg-[#24B745]/20 border-[#24B745] text-[#24B745]'
                      : 'border-[#3A3A3A] text-[#FAF5ED]/50 hover:border-[#24B745]/50 hover:text-[#24B745]'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-bold">{request.upvotes_count}</span>
                </button>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-[#3A3A3A]">
                  <p className="text-xs text-[#FAF5ED]/50 mb-2 uppercase tracking-wider">Changer le statut (Admin)</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(request.id, 'pending')}
                      className={`px-3 py-1 text-xs font-bold uppercase border transition-colors ${
                        request.status === 'pending'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'border-[#3A3A3A] text-[#FAF5ED]/50 hover:border-yellow-500/50'
                      }`}
                    >
                      En attente
                    </button>
                    <button
                      onClick={() => handleStatusChange(request.id, 'in_progress')}
                      className={`px-3 py-1 text-xs font-bold uppercase border transition-colors ${
                        request.status === 'in_progress'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'border-[#3A3A3A] text-[#FAF5ED]/50 hover:border-blue-500/50'
                      }`}
                    >
                      En cours
                    </button>
                    <button
                      onClick={() => handleStatusChange(request.id, 'completed')}
                      className={`px-3 py-1 text-xs font-bold uppercase border transition-colors ${
                        request.status === 'completed'
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'border-[#3A3A3A] text-[#FAF5ED]/50 hover:border-green-500/50'
                      }`}
                    >
                      Terminé
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-[#FAF5ED]/40">
                Créé le {new Date(request.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          ))
        ) : null}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#232323] border-2 border-[#24B745] shadow-[8px_8px_0px_0px_#24B745] p-8 relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-[#FAF5ED]/50 hover:text-[#24B745] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black text-[#FAF5ED] uppercase tracking-tight mb-8">
              Nouvelle suggestion
            </h2>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateRequest();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] font-bold outline-none rounded-none"
                  placeholder="Ex: Ajouter un export PDF"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] outline-none rounded-none resize-none"
                  placeholder="Décrivez votre suggestion en détail..."
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-4 border-2 border-[#3A3A3A] text-[#FAF5ED] hover:bg-[#3A3A3A] font-bold uppercase tracking-widest text-xs rounded-none transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTitle.trim() || !newDescription.trim()}
                  className="flex-1 px-4 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] font-bold uppercase tracking-widest text-xs shadow-lg rounded-none flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
