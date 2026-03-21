import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { ViewState, Repository, User, ApiRepository } from '@/types';
import { mockTeamMembers } from '@/data/mock';
import { api } from '@/lib/api';

// Layout Components
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

// Auth Pages
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

// Repository Pages
import { RepositorySelectPage } from '@/pages/RepositorySelectPage';
import { RepositoryAnalysisPage } from '@/pages/RepositoryAnalysisPage';

// Dashboard Pages
import { OverviewPage } from '@/pages/OverviewPage';
import { ArchitecturePage } from '@/pages/ArchitecturePage';
import { StorybookPage } from '@/pages/StorybookPage';
import { FlowsPage } from '@/pages/FlowsPage';
import { AskRampPage } from '@/pages/AskRampPage';
import { TeamPage } from '@/pages/TeamPage';
import { SettingsPage } from '@/pages/SettingsPage';

import './App.css';

const toRepository = (r: ApiRepository): Repository => ({
  id: String(r.id),
  name: r.name,
  fullName: r.full_name,
  description: r.description || '',
  language: r.language || 'Unknown',
  stars: r.stargazers_count,
  forks: r.forks_count,
  updatedAt: r.updated_at || '',
  isConnected: false,
  isAnalyzing: false,
  analysisProgress: 0,
});

function AppContent() {
  const [view, setView] = useState<ViewState>('login');
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [connectedRepoId, setConnectedRepoId] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') {
      const savedUser = localStorage.getItem('ramp_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      window.history.replaceState({}, '', '/');
      loadRepositories();
    } else {
      const savedUser = localStorage.getItem('ramp_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        // Restore connectedRepoId if saved
        const savedRepoId = localStorage.getItem('ramp_connected_repo_id');
        if (savedRepoId) setConnectedRepoId(savedRepoId);
        setView('repository-select');
        loadRepositories();
      }
    }
  }, []);

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const data = await api.github.getRepositories();
      setRepositories(data.repositories.map(toRepository));
      setView('repository-select');
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setView('repository-select');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleLogin = (email: string, _password: string) => {
    const newUser: User = {
      id: '1',
      name: 'Dev User',
      email: email,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dev',
      role: 'owner',
    };
    setUser(newUser);
    localStorage.setItem('ramp_user', JSON.stringify(newUser));
    window.location.href = api.github.getLoginUrl();
  };

  const handleSignup = (name: string, email: string, _password: string) => {
    const newUser: User = {
      id: '1',
      name: name,
      email: email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      role: 'owner',
    };
    setUser(newUser);
    localStorage.setItem('ramp_user', JSON.stringify(newUser));
    window.location.href = api.github.getLoginUrl();
  };

  const handleLogout = () => {
    setUser(null);
    setRepositories([]);
    setConnectedRepoId(null);
    localStorage.removeItem('ramp_user');
    localStorage.removeItem('ramp_connected_repo_id');
    setView('login');
  };

  const handleSelectRepository = async (repo: Repository) => {
    try {
      const response = await api.github.connectRepository({
        id: Number(repo.id),
        name: repo.name,
        full_name: repo.fullName,
        owner: repo.fullName.split('/')[0],
        description: repo.description,
        is_private: false,
        clone_url: `https://github.com/${repo.fullName}.git`,
        default_branch: 'main',
        updated_at: repo.updatedAt,
        language: repo.language,
        stargazers_count: repo.stars,
        forks_count: repo.forks,
      });
      // Store the connected repo UUID for architecture and other features
      setConnectedRepoId(response.id);
      localStorage.setItem('ramp_connected_repo_id', response.id);
    } catch (err) {
      console.error('Failed to connect repository:', err);
    }

    setSelectedRepository(repo);
    setView('repository-analysis');
    setTimeout(() => setView('overview'), 4000);
  };

  const handleNavigate = (newView: ViewState) => setView(newView);

  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
  }

  if (view === 'signup') {
    return <SignupPage onSignup={handleSignup} onNavigate={handleNavigate} />;
  }

  if (view === 'repository-select') {
    return (
      <RepositorySelectPage
        repositories={repositories}
        onSelectRepository={handleSelectRepository}
        user={user}
        onLogout={handleLogout}
        isLoading={isLoadingRepos}
      />
    );
  }

  if (view === 'repository-analysis' && selectedRepository) {
    return (
      <RepositoryAnalysisPage
        repository={selectedRepository}
        onComplete={() => setView('overview')}
      />
    );
  }

  const renderDashboardContent = () => {
    switch (view) {
      case 'overview':
        return <OverviewPage repository={selectedRepository || repositories[0]} />;
      case 'architecture':
        return <ArchitecturePage repoId={connectedRepoId} />;
      case 'flows':
        return <FlowsPage />;
      case 'storybook':
        return <StorybookPage />;
     case 'ask-ramp':
        return <AskRampPage />;
      case 'team':
        return <TeamPage members={mockTeamMembers} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      default:
        return <OverviewPage repository={selectedRepository || repositories[0]} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        repository={selectedRepository}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          user={user}
          onLogout={handleLogout}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 overflow-auto">
          {renderDashboardContent()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;