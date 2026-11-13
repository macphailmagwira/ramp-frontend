import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

const STATIC_GREYS = [
  'bg-neutral-100',
  'bg-neutral-200',
  'bg-neutral-300',
  'bg-neutral-400',
  'bg-neutral-500',
];


import type { ViewState, Repository, User, ApiRepository, ApiConnectedRepository, DocBlock } from '@/types';
import { mockTeamMembers } from '@/data/mock';
import { api, getToken, setToken } from '@/lib/api';
import { Video, MessageSquare } from 'lucide-react';

// Layout Components
import { Sidebar, type KnowledgeNode, type Workspace, type AgentItem } from '@/components/layout/Sidebar';
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
import { DocsPage } from '@/pages/DocsPage';
import { AskRampPage } from '@/pages/AskRampPage';
import { TeamPage } from '@/pages/TeamPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { AgentsCatalogPage } from '@/pages/AgentsCatalogPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { AVAILABLE_AGENTS } from '@/data/agents';

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

const toUser = (apiUser: any): User => {
  // getMe derives the user from the Bearer token. GitHub-sourced accounts have
  // no first_name/last_name; their identity lives under `github.github_username`.
  const gh = apiUser.github ?? {};
  const full = `${apiUser.first_name ?? ''} ${apiUser.last_name ?? ''}`.trim();
  const name =
    full ||
    gh.github_username ||
    gh.login ||
    (apiUser.email ? apiUser.email.split('@')[0] : '') ||
    'User';

  const email = apiUser.email ?? '';
  const id = String(apiUser.id ?? '');

  return {
    id,
    name,
    email,
    avatar: apiUser.avatar || '',
    role: 'owner' as const,
  };
};

const connectedRepoKey = (userId?: string | null) =>
  userId ? `ramp_connected_repo_id_${userId}` : 'ramp_connected_repo_id';

const WORKSPACES_STORAGE_KEY = 'ramp_workspaces';

const SEED_WORKSPACES: Workspace[] = [
  {
    id: 'ws-engineering',
    label: 'Engineering',
    icon: '📘',
    nodes: [
      {
        id: 'getting-started',
        type: 'folder',
        label: 'Getting started',
        children: [
          { id: 'setup-guide', type: 'file', label: 'Setup guide' },
          { id: 'onboarding', type: 'file', label: 'Onboarding' },
        ],
      },
      {
        id: 'architecture',
        type: 'folder',
        label: 'Architecture',
        children: [
          { id: 'system-overview', type: 'file', label: 'System overview' },
          { id: 'data-flow', type: 'file', label: 'Data flow' },
          { id: 'api-contracts', type: 'file', label: 'API contracts' },
        ],
      },
      {
        id: 'runbooks',
        type: 'folder',
        label: 'Runbooks',
        children: [
          { id: 'deploy', type: 'file', label: 'Deploy' },
          { id: 'rollback', type: 'file', label: 'Rollback' },
        ],
      },
    ],
  },
];

const loadWorkspaces = (): Workspace[] => {
  try {
    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as Workspace[];
    }
  } catch {
    /* ignore malformed storage */
  }
  return SEED_WORKSPACES;
};

function AppContent() {
  const [view, setView] = useState<ViewState>('login');
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [connectedRepoId, setConnectedRepoId] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connectedRepositories, setConnectedRepositories] = useState<Repository[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    if (isAuthenticating) return;
    const t = setTimeout(() => setIsSidebarOpen(true), 500);
    return () => clearTimeout(t);
  }, [isAuthenticating]);

  const [workspaces, setWorkspaces] = useState<Workspace[]>(loadWorkspaces);
  // Persist workspace docs (including edited document bodies) across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      /* storage may be unavailable; editing still works in-memory */
    }
  }, [workspaces]);
  const [activeDocId, setActiveDocId] = useState<string | undefined>(undefined);
  const prevViewRef = useRef<ViewState>('overview');
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(() => new Set(['pr', 'commit']));
  const agents: AgentItem[] = AVAILABLE_AGENTS.filter(a => enabledAgentIds.has(a.id)).map(a => ({
    id: a.id,
    label: a.label,
    description: a.tagline,
    icon: a.icon,
  }));
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>('pr');

  const toggleAgent = (id: string) =>
    setEnabledAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
    const params = new URLSearchParams(window.location.search);

    // The backend hands the app JWT back via the GitHub OAuth callback
    // redirect (?github=connected&token=<jwt>), since a server-side redirect
    // cannot set localStorage. Capture and persist it before restoring.
    const callbackToken = params.get('token');
    if (callbackToken) {
      setToken(callbackToken);
      window.history.replaceState({}, '', '/');
    }

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

    if (params.get('github') === 'connected' && !callbackToken) {
      window.history.replaceState({}, '', '/');
    }
    restoreSession();
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

  const handleAddAgent = () => setView('agents-new');

  const insertKnowledgeNode = (
    nodes: KnowledgeNode[],
    parentId: string | null,
    newNode: KnowledgeNode
  ): KnowledgeNode[] => {
    if (parentId === null) return [...nodes, newNode];
    return nodes.map(n => {
      if (n.id === parentId && n.type === 'folder') {
        return { ...n, children: [...(n.children ?? []), newNode] };
      }
      if (n.children) {
        return { ...n, children: insertKnowledgeNode(n.children, parentId, newNode) };
      }
      return n;
    });
  };

  const handleCreateNode = (workspaceId: string, parentId: string | null, type: KnowledgeNode['type'], label: string) => {
    updateWorkspaceNodes(workspaceId, prev =>
      insertKnowledgeNode(prev, parentId, {
        id: crypto.randomUUID(),
        type,
        label,
        ...(type === 'folder' ? { children: [] } : {}),
      })
    );
  };

  const findKnowledgeNode = (nodes: KnowledgeNode[], id: string): KnowledgeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findKnowledgeNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const isKnowledgeDescendant = (nodes: KnowledgeNode[], ancestorId: string, targetId: string): boolean => {
    const ancestor = findKnowledgeNode(nodes, ancestorId);
    if (!ancestor || !ancestor.children) return false;
    return !!findKnowledgeNode(ancestor.children, targetId);
  };

  const removeKnowledgeNode = (
    nodes: KnowledgeNode[],
    id: string
  ): { tree: KnowledgeNode[]; removed: KnowledgeNode | null } => {
    let removed: KnowledgeNode | null = null;
    const walk = (list: KnowledgeNode[]): KnowledgeNode[] => {
      const result: KnowledgeNode[] = [];
      for (const n of list) {
        if (n.id === id) {
          removed = n;
          continue;
        }
        if (n.children) {
          const children = walk(n.children);
          if (children === n.children) result.push(n);
          else result.push({ ...n, children });
        } else {
          result.push(n);
        }
      }
      return result;
    };
    return { tree: walk(nodes), removed };
  };

  const renameKnowledgeNode = (nodes: KnowledgeNode[], id: string, label: string): KnowledgeNode[] =>
    nodes.map(n => {
      if (n.id === id) return { ...n, label };
      if (n.children) return { ...n, children: renameKnowledgeNode(n.children, id, label) };
      return n;
    });

  const handleRenameNode = (workspaceId: string, id: string, label: string) => {
    if (!label.trim()) return;
    updateWorkspaceNodes(workspaceId, prev => renameKnowledgeNode(prev, id, label.trim()));
  };

  const handleDeleteNode = (workspaceId: string, id: string) => {
    updateWorkspaceNodes(workspaceId, prev => removeKnowledgeNode(prev, id).tree);
  };

  const handleMoveNode = (workspaceId: string, id: string, newParentId: string | null) => {
    updateWorkspaceNodes(workspaceId, prev => {
      // Prevent dropping a node into its own subtree.
      if (newParentId !== null && isKnowledgeDescendant(prev, id, newParentId)) return prev;
      const { tree, removed } = removeKnowledgeNode(prev, id);
      if (!removed) return prev;
      return insertKnowledgeNode(tree, newParentId, removed);
    });
  };

  const updateWorkspaceNodes = (
    wsId: string,
    updater: (nodes: KnowledgeNode[]) => KnowledgeNode[]
  ) => setWorkspaces(prev => prev.map(w => (w.id === wsId ? { ...w, nodes: updater(w.nodes) } : w)));

  const handleCreateWorkspace = (label: string, icon: string) => {
    setWorkspaces(prev => [...prev, { id: crypto.randomUUID(), label, icon, nodes: [] }]);
  };

  const handleRenameWorkspace = (id: string, label: string, icon: string) => {
    setWorkspaces(prev => prev.map(w => (w.id === id ? { ...w, label, icon } : w)));
  };

  const handleDeleteWorkspace = (id: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
  };

  // ── Document editing ─────────────────────────────────────────────────────────

  interface LocatedDoc {
    workspaceId: string;
    workspaceIcon: string;
    workspaceLabel: string;
    node: KnowledgeNode;
    path: { id: string; label: string }[];
  }

  const findDoc = (docId: string): LocatedDoc | null => {
    for (const ws of workspaces) {
      const path: { id: string; label: string }[] = [];
      const walk = (nodes: KnowledgeNode[]): KnowledgeNode | null => {
        for (const n of nodes) {
          path.push({ id: n.id, label: n.label });
          if (n.id === docId && n.type === 'file') {
            const node = { ...n };
            return node;
          }
          if (n.children) {
            const found = walk(n.children);
            if (found) return found;
          }
          path.pop();
        }
        return null;
      };
      const node = walk(ws.nodes);
      if (node) {
        return {
          workspaceId: ws.id,
          workspaceIcon: ws.icon,
          workspaceLabel: ws.label,
          node,
          path: path.map(p => ({ ...p })),
        };
      }
    }
    return null;
  };

  const updateDocContent = (workspaceId: string, docId: string, content: DocBlock[]) => {
    setWorkspaces(prev =>
      prev.map(w =>
        w.id === workspaceId
          ? { ...w, nodes: setNodeContent(w.nodes, docId, content) }
          : w,
      ),
    );
  };

  const setNodeContent = (
    nodes: KnowledgeNode[],
    docId: string,
    content: DocBlock[],
  ): KnowledgeNode[] =>
    nodes.map(n => {
      if (n.id === docId) return { ...n, content };
      if (n.children) return { ...n, children: setNodeContent(n.children, docId, content) };
      return n;
    });

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    setView(v => {
      if (v !== 'docs') prevViewRef.current = v;
      return 'docs';
    });
  };

  if (isAuthenticating) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background">
        {/* ── Square of tiny neutral pixels with static ── */}
        <div className="relative overflow-hidden rounded-3xl bg-black p-1 ring-1 ring-white/10 opacity-90">
          <div
            className="grid bg-black"
            style={{ gridTemplateColumns: 'repeat(22, 1fr)', gridTemplateRows: 'repeat(22, 1fr)', gap: '0px', width: '104px', height: '104px' }}
          >
            {Array.from({ length: 32 * 32 }).map((_, i) => {
              const delay = (Math.random() * 0.7).toFixed(2);
              const dur = (0.3 + Math.random() * 0.5).toFixed(2);
              const tone = STATIC_GREYS[Math.floor(Math.random() * STATIC_GREYS.length)];
              return (
                <span
                  key={i}
                  className={`animate-pixel-static ${tone}`}
                  style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
                />
              );
            })}
          </div>

          {/* Faint static passing over */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-static-sweep absolute inset-y-0 left-0 h-full w-[200%] opacity-[0.04] mix-blend-screen">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <filter id="static-sweep-noise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch">
                    <animate attributeName="seed" from="1" to="120" dur="0.5s" repeatCount="indefinite" />
                  </feTurbulence>
                  <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#static-sweep-noise)" />
              </svg>
            </div>
          </div>

          {/* CRT vignette + scanlines */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 12px 2px rgba(0,0,0,0.5)' }}
          />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </div>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium tracking-wide">Warming things up for you</span>
          <span className="inline-flex">
            <span>.</span>
            <span className="animate-dot-2">.</span>
            <span className="animate-dot-3">.</span>
          </span>
        </p>
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
      case 'storybook':
        return <StorybookPage repoId={connectedRepoId} />;
      case 'ask-ramp':
        return <AskRampPage />;
      case 'meetings':
        return (
          <ComingSoonPage
            title="Meetings"
            description="Automatically join, record, and summarize your meetings so the important decisions never get lost."
            icon={Video}
            bullets={[
              'Auto-generated summaries with decisions and action items',
              'Calendar sync with one-click join',
              'Searchable transcripts across all your calls',
            ]}
          />
        );
      case 'chat':
        return (
          <ComingSoonPage
            title="Chat"
            description="A shared space where your team and Ramp's agents collaborate, ask questions, and act on context in real time."
            icon={MessageSquare}
            bullets={[
              'Threaded conversations with agents and teammates',
              'Inline actions powered by your connected repos',
              'Full history synced to your inbox',
            ]}
          />
        );
      case 'team':
        return <TeamPage members={mockTeamMembers} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      case 'agents':
        return <AgentsPage agents={agents} activeAgentId={activeAgentId} onBrowse={handleAddAgent} />;
      case 'agents-new':
        return (
          <AgentsCatalogPage
            catalog={AVAILABLE_AGENTS}
            enabledIds={enabledAgentIds}
            onToggle={toggleAgent}
            onBack={() => setView('agents')}
            onViewAgent={id => {
              setActiveAgentId(id);
              setView('agents');
            }}
          />
        );
      case 'docs': {
        const doc = activeDocId ? findDoc(activeDocId) : null;
        if (!doc) return <InboxPage />;
        const blocks = doc.node.content && doc.node.content.length > 0
          ? doc.node.content
          : [{ id: crypto.randomUUID(), type: 'paragraph' as const, text: '' }];
        return (
          <DocsPage
            key={doc.node.id}
            workspaceIcon={doc.workspaceIcon}
            workspaceLabel={doc.workspaceLabel}
            path={doc.path}
            docId={doc.node.id}
            title={doc.node.label}
            blocks={blocks}
            onBack={() => setView(prevViewRef.current)}
            onRename={label => handleRenameNode(doc.workspaceId, doc.node.id, label)}
            onUpdateContent={content => updateDocContent(doc.workspaceId, doc.node.id, content)}
          />
        );
      }
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
        workspaces={workspaces}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onCreateWorkspace={handleCreateWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onCreateNode={handleCreateNode}
        onRenameNode={handleRenameNode}
        onDeleteNode={handleDeleteNode}
        onMoveNode={handleMoveNode}
        agents={agents}
        activeAgentId={activeAgentId}
        onSelectAgent={id => {
          setActiveAgentId(id);
          setView('agents');
        }}
        onAddAgent={handleAddAgent}
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