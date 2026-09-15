import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { ViewState, Repository, User, ApiRepository, ApiConnectedRepository } from '@/types';
import { mockTeamMembers } from '@/data/mock';
import { api, getToken, setToken } from '@/lib/api';

// Layout Components
import { Sidebar, type KnowledgeCategory } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

// Auth Pages
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { GitHubConnectPage } from '@/pages/GitHubConnectPage';

// Repository Pages
import { RepositorySelectPage } from '@/pages/RepositorySelectPage';
import { RepositoryAnalysisPage } from '@/pages/RepositoryAnalysisPage';

// Dashboard Pages
import { InboxPage } from '@/pages/InboxPage';
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

const toConnectedRepository = (r: ApiConnectedRepository): Repository => ({
  id: r.id,
  name: r.name,
  fullName: r.full_name,
  description: r.description || '',
  language: 'Unknown',
  stars: 0,
  forks: 0,
  updatedAt: r.updated_at || '',
  isConnected: true,
  isAnalyzing: false,
  analysisProgress: 0,
});

const toUser = (apiUser: any): User => ({
  id: String(apiUser.id),
  name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
  email: apiUser.email,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiUser.email}`,
  role: 'owner' as const,
});

const connectedRepoKey = (userId?: string | null) =>
  userId ? `ramp_connected_repo_id_${userId}` : 'ramp_connected_repo_id';

function AppContent() {
  const [view, setView] = useState<ViewState>('login');
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [connectedRepoId, setConnectedRepoId] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connectedRepositories, setConnectedRepositories] = useState<Repository[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>(() => [
    {
      id: 'getting-started',
      label: 'Getting started',
      docs: [
        { id: 'setup-guide', label: 'Setup guide' },
        { id: 'onboarding', label: 'Onboarding' },
      ],
    },
    {
      id: 'architecture',
      label: 'Architecture',
      docs: [
        { id: 'system-overview', label: 'System overview' },
        { id: 'data-flow', label: 'Data flow' },
        { id: 'api-contracts', label: 'API contracts' },
      ],
    },
    {
      id: 'runbooks',
      label: 'Runbooks',
      docs: [
        { id: 'deploy', label: 'Deploy' },
        { id: 'rollback', label: 'Rollback' },
      ],
    },
  ]);
  const [activeDocId, setActiveDocId] = useState<string | undefined>(undefined);

  const loadConnectedRepositories = useCallback(async () => {
    try {
      const data = await api.github.getConnectedRepositories();
      const mapped = data.map(toConnectedRepository);
      setConnectedRepositories(mapped);
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const loadRepositories = useCallback(async (): Promise<boolean> => {
    setIsLoadingRepos(true);
    try {
      const data = await api.github.getRepositories();
      setRepositories(data.repositories.map(toRepository));
      setGithubConnected(true);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'GitHub account not connected') {
        setRepositories([]);
        setGithubConnected(false);
      } else {
        console.error('Failed to load repositories:', err);
        setGithubConnected(false);
      }
      return false;
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  const navigateToDashboard = useCallback(async (currentUser: User) => {
    setUser(currentUser);
    try {
      setGithubConnected(null);
      const conns = await loadConnectedRepositories();
      const ghConnected = await loadRepositories();

      // Gate: a GitHub connection is required before anything else.
      if (!ghConnected) {
        setView('connect-github');
        return;
      }

      if (conns.length > 0) {
        const savedRepoId = localStorage.getItem(connectedRepoKey(currentUser.id));
        const active = savedRepoId
          ? conns.find(r => r.id === savedRepoId)
          : conns[0];
        if (active) {
          setSelectedRepository(active);
          setConnectedRepoId(active.id);
          setView('overview');
        } else {
          setView('repository-select');
        }
      } else {
        setView('repository-select');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [loadConnectedRepositories, loadRepositories]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      if (!token) {
        setIsAuthenticating(false);
        return;
      }
      try {
        const me = await api.users.getMe();
        const apiUser = me?.user ?? me;
        const u = toUser(apiUser);
        localStorage.setItem('ramp_user', JSON.stringify(u));
        const savedRepoId = localStorage.getItem(connectedRepoKey(u.id));
        if (savedRepoId) setConnectedRepoId(savedRepoId);
        await navigateToDashboard(u);
      } catch {
        setToken(null);
        setIsAuthenticating(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') {
      window.history.replaceState({}, '', '/');
      restoreSession();
    } else {
      restoreSession();
    }
  }, [navigateToDashboard]);

  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener('ramp:unauthorized', handler);
    return () => window.removeEventListener('ramp:unauthorized', handler);
  }, []);

  const handleLogin = async (apiUser: any, token: string) => {
    setToken(token);
    const u = toUser(apiUser);
    localStorage.setItem('ramp_user', JSON.stringify(u));
    navigateToDashboard(u);
  };

  const handleSignup = async (apiUser: any, token: string) => {
    setToken(token);
    const u = toUser(apiUser);
    localStorage.setItem('ramp_user', JSON.stringify(u));
    navigateToDashboard(u);
  };

  const handleLogout = () => {
    setUser(null);
    setRepositories([]);
    setConnectedRepositories([]);
    setConnectedRepoId(null);
    setSelectedRepository(null);
    localStorage.removeItem('ramp_user');
    localStorage.removeItem(connectedRepoKey(user?.id));
    localStorage.removeItem('ramp_token');
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
      setConnectedRepoId(response.id);
      localStorage.setItem(connectedRepoKey(user?.id), response.id);
      setSelectedRepository(repo);
      await loadConnectedRepositories();
      setView('repository-analysis');
    } catch (err) {
      console.error('Failed to connect repository:', err);
    }
  };

  const handleSwitchRepository = (repo: Repository) => {
    setSelectedRepository(repo);
    setConnectedRepoId(repo.id);
    localStorage.setItem(connectedRepoKey(user?.id), repo.id);
    setView('overview');
  };

  const handleAddRepository = () => {
    loadRepositories();
    setView('repository-select');
  };

  const handleNavigate = (newView: ViewState) => setView(newView);

  const handleCreateCategory = (label: string) => {
    setKnowledgeCategories(prev => [
      ...prev,
      { id: crypto.randomUUID(), label, docs: [] },
    ]);
  };

  const handleCreateDoc = (categoryId: string, label: string) => {
    setKnowledgeCategories(prev =>
      prev.map(c =>
        c.id === categoryId
          ? { ...c, docs: [...c.docs, { id: crypto.randomUUID(), label }] }
          : c
      )
    );
  };

  if (isAuthenticating) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === 'connect-github') {
    return <GitHubConnectPage user={user} onLogout={handleLogout} />;
  }

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
        connectedRepositories={connectedRepositories}
        onSelectRepository={handleSelectRepository}
        onSwitchToConnected={handleSwitchRepository}
        onBack={() => {
          if (connectedRepositories.length > 0) {
            const savedRepoId = localStorage.getItem(connectedRepoKey(user?.id));
            const active = savedRepoId
              ? connectedRepositories.find(r => r.id === savedRepoId)
              : connectedRepositories[0];
            const repo = active || connectedRepositories[0];
            setSelectedRepository(repo);
            setConnectedRepoId(repo.id);
            setView('overview');
          }
        }}
        user={user}
        onLogout={handleLogout}
        githubConnected={githubConnected === true}
        isLoading={isLoadingRepos}
      />
    );
  }

  if (view === 'repository-analysis' && selectedRepository) {
    return (
      <RepositoryAnalysisPage
        repository={selectedRepository}
        repoId={connectedRepoId || ''}
        onComplete={() => setView('overview')}
      />
    );
  }

  const renderDashboardContent = () => {
    switch (view) {
      case 'overview':
        return <InboxPage />;
      case 'architecture':
        return <ArchitecturePage repoId={connectedRepoId} />;
      case 'flows':
        return <FlowsPage />;
      case 'storybook':
        return <StorybookPage repoId={connectedRepoId} />;
     case 'ask-ramp':
        return <AskRampPage />;
      case 'team':
        return <TeamPage members={mockTeamMembers} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      default:
        return <InboxPage/>;
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
        repositories={connectedRepositories}
        onSelectRepository={handleSwitchRepository}
        onAddRepository={handleAddRepository}
        user={user}
        onLogout={handleLogout}
        knowledgeCategories={knowledgeCategories}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        onCreateCategory={handleCreateCategory}
        onCreateDoc={handleCreateDoc}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
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