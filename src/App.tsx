import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogOut, Lightbulb, Shield, Home, Sparkles } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import ClientList from './components/ClientList';
import AnalysisForm from './components/AnalysisForm';
import ConceptsView from './components/ConceptsView';
import Settings from './components/Settings';
import NewClientModal from './components/NewClientModal';
import ClientDetail from './components/ClientDetail';
import FeatureRequests from './components/FeatureRequests';
import AdminDashboard from './components/AdminDashboard';
import { Client, Analysis, supabase } from './lib/supabase';

type View = 'clients' | 'analysis' | 'concepts' | 'settings' | 'clientDetail' | 'features' | 'admin';

function App() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  async function checkAdminStatus() {
    if (!user) return;
    const { data } = await supabase.from('settings').select('is_admin').eq('user_id', user.id).maybeSingle();
    setIsAdmin(data?.is_admin || false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-bg">
        <div className="text-studio-text font-bold uppercase tracking-widest">Chargement...</div>
      </div>
    );
  }

  if (!user) { return <Auth />; }

  function handleSelectClient(client: Client) { setSelectedClient(client); setView('clientDetail'); }
  function handleNewClient() { setShowNewClientModal(true); }
  function handleClientCreated(client: Client) { setShowNewClientModal(false); setSelectedClient(client); setView('analysis'); }
  function handleAnalysisCreated(analysis: Analysis) { setSelectedAnalysis(analysis); setView('concepts'); }
  function handleBackToClients() { setSelectedClient(null); setSelectedAnalysis(null); setView('clients'); }
  function handleBackToAnalysis() { setSelectedAnalysis(null); setView('clientDetail'); }
  function handleSelectAnalysis(analysis: Analysis) { setSelectedAnalysis(analysis); setView('concepts'); }
  function handleNewAnalysis() { setView('analysis'); }

  const NavButton = ({ onClick, icon: Icon, title, label }: any) => (
    <button
      onClick={onClick}
      className="p-2 text-[#FAF5ED]/70 hover:text-[#FAF5ED] hover:bg-[#FAF5ED]/10 transition-all duration-200 flex items-center gap-2"
      title={title}
    >
      <Icon className="w-5 h-5" />
      {label && <span className="text-sm font-medium hidden md:inline">{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-studio-bg text-studio-text font-sans selection:bg-studio-accent selection:text-studio-bg">
      {/* HEADER : Fond #232323, Texte #FAF5ED */}
      <header className="sticky top-0 z-50 bg-[#232323] border-b border-[#FAF5ED]/10 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBackToClients}>
            <div className="bg-studio-accent p-2 shadow-[4px_4px_0px_0px_#FAF5ED] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
              <Sparkles className="w-5 h-5 text-[#FAF5ED]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#FAF5ED] tracking-tight uppercase">Freyja Studio</h1>
              <p className="text-xs text-[#FAF5ED]/60 font-medium tracking-widest">Creative Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <NavButton onClick={handleBackToClients} icon={Home} title="Accueil" />
            {isAdmin && <NavButton onClick={() => setView('admin')} icon={Shield} title="Admin" />}
            <NavButton onClick={() => setView('features')} icon={Lightbulb} title="Suggestions" />
            <NavButton onClick={() => setView('settings')} icon={SettingsIcon} title="Paramètres" />
            
            <div className="w-px h-6 bg-[#FAF5ED]/20 mx-2"></div>
            
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-[#FAF5ED]/70 hover:text-[#FAF5ED] border border-transparent hover:border-[#FAF5ED]/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {view === 'clients' && <ClientList onSelectClient={handleSelectClient} onNewClient={handleNewClient} />}
          {view === 'clientDetail' && selectedClient && <ClientDetail client={selectedClient} onBack={handleBackToClients} onSelectAnalysis={handleSelectAnalysis} onNewAnalysis={handleNewAnalysis} />}
          {view === 'analysis' && selectedClient && <AnalysisForm client={selectedClient} onBack={() => setView('clientDetail')} onAnalysisCreated={handleAnalysisCreated} />}
          {view === 'concepts' && selectedAnalysis && <ConceptsView analysis={selectedAnalysis} onBack={handleBackToAnalysis} />}
          {view === 'settings' && <Settings onBack={handleBackToClients} />}
          {view === 'features' && <FeatureRequests onBack={handleBackToClients} />}
          {view === 'admin' && <AdminDashboard onBack={handleBackToClients} />}
        </div>
      </main>

      {showNewClientModal && <NewClientModal onClose={() => setShowNewClientModal(false)} onClientCreated={handleClientCreated} />}
    </div>
  );
}

export default App;