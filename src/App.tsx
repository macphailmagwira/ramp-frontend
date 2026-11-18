import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

const STATIC_GREYS = [
  'bg-neutral-100',
  'bg-neutral-200',
  'bg-neutral-300',
  'bg-neutral-400',
  'bg-neutral-500',
];


import type { ViewState, Repository, User, ApiRepository, ApiConnectedRepository, DocBlock, ApiKnowledgeNode } from '@/types';
import { mockTeamMembers } from '@/data/mock';
import { api, getToken, setToken } from '@/lib/api';
import { Video, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';

// Layout Components
import { Sidebar, type KnowledgeNode, type Workspace, type AgentItem } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CommandPalette } from '@/components/CommandPalette';
import { useCommandShortcuts } from '@/components/commandShortcuts';

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
import { ReviewPage } from '@/pages/ReviewPage';
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

// Build a nested KnowledgeNode tree from the backend's flat, parent_id-keyed list.
interface TreeBuilderNode extends KnowledgeNode {
  _kids: TreeBuilderNode[];
  parent_id?: string | null;
}

function buildTree(flat: ApiKnowledgeNode[]): KnowledgeNode[] {
  const map = new Map<string, TreeBuilderNode>();
  for (const n of flat) {
    map.set(n.id, {
      id: n.id,
      type: n.type,
      label: n.label,
      title: n.title,
      version: n.version,
      parent_id: n.parent_id,
      workspace_id: n.workspace_id,
      shared: n.shared,
      children: [],
      _kids: [],
    });
  }
  const roots: TreeBuilderNode[] = [];
  for (const node of map.values()) {
    const pid = node.parent_id;
    if (pid && map.has(pid)) map.get(pid)!._kids.push(node);
    else roots.push(node);
  }
  const finalize = (node: TreeBuilderNode): KnowledgeNode => ({
    id: node.id,
    type: node.type,
    label: node.label,
    title: node.title,
    version: node.version,
    workspace_id: node.workspace_id,
    shared: node.shared,
    ...(node.type === 'folder'
      ? { children: node._kids.length ? node._kids.map(finalize) : [] }
      : {}),
  });
  return roots.map(finalize);
}

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
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isDashboardView = [
    'overview',
    'inbox',
    'agents',
    'architecture',
    'docs',
    'repository-select',
  ].includes(view);

  useEffect(() => {
    if (isAuthenticating || !isDashboardView) {
      setIsSidebarOpen(false);
      return;
    }
    const t = setTimeout(() => setIsSidebarOpen(true), 500);
    return () => clearTimeout(t);
  }, [isAuthenticating, isDashboardView]);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  // Workspaces are scoped to the active repo (via the backend `?repo=` filter),
  // so whatever the backend returns is what we show.
  const visibleWorkspaces = workspaces;

  // Shared nodes are global across all repos, fetched separately.
  const [sharedNodes, setSharedNodes] = useState<KnowledgeNode[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);


  // Loaded document bodies + their server version, keyed by node id.
  // `title` is the document header, persisted in the content (content.label),
  // independent of the node's file-name `label`.
  const docCache = useRef<Record<string, { content?: DocBlock[]; version?: number; title?: string }>>({});
  const saveState = useRef<Record<string, { ws?: string; timer?: ReturnType<typeof setTimeout> }>>({});
  const renameState = useRef<Record<string, { ws?: string; patch?: { label?: string; title?: string }; timer?: ReturnType<typeof setTimeout> }>>({});
  const [conflictBump, setConflictBump] = useState(0);
  const [, forceDispatch] = useReducer((x: number) => x + 1, 0);
  const force = () => forceDispatch();

  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const list = await api.workspaces.list(selectedRepository?.fullName ?? null);
      const withNodes = await Promise.all(
        list.map(async (ws) => {
          let nodes: KnowledgeNode[] = [];
          try {
            nodes = buildTree(await api.workspaces.listNodes(ws.id));
          } catch {
            /* tree unavailable for this workspace */
          }
          return { ...ws, nodes };
        })
      );
      setWorkspaces(withNodes);
    } catch (err) {
      console.error('Failed to load workspaces', err);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [selectedRepository?.fullName]);

  // Shared nodes are global (not repo-scoped), so they're fetched independently
  // of the active repo's workspace list above.
  const fetchSharedNodes = useCallback(async () => {
    setLoadingShared(true);
    try {
      const flat = await api.workspaces.listShared();
      setSharedNodes(buildTree(flat));
    } catch (err) {
      console.error('Failed to load shared nodes', err);
    } finally {
      setLoadingShared(false);
    }
  }, []);

  const refreshNodes = useCallback(async (wsId: string) => {
    try {
      const flat = await api.workspaces.listNodes(wsId);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === wsId ? { ...w, nodes: buildTree(flat) } : w))
      );
    } catch (err) {
      console.error('Failed to refresh workspace nodes', err);
    }
  }, []);

  const loadDocContent = useCallback(async (wsId: string, docId: string) => {
    const empty = (): DocBlock[] => [{ id: crypto.randomUUID(), type: 'paragraph', text: '' }];
    try {
      const res = await api.workspaces.getContent(wsId, docId);
      docCache.current[docId] = res
        ? { content: res.blocks, version: res.version, title: res.title }
        : { content: empty(), version: undefined, title: undefined };
    } catch {
      docCache.current[docId] = { content: empty(), version: undefined, title: undefined };
    }
    force();
  }, []);

  const runSave = useCallback(async (docId: string) => {
    const st = saveState.current[docId];
    if (!st || !st.ws) return;
    const ws = st.ws;
    const cached = docCache.current[docId];
    if (!cached || !cached.content) return;
    // `label` is the file name and must stay intact (the backend mirrors content
    // `label` onto the node, so writing the title here would overwrite the file
    // name). The title lives in the node's separate `title` field, persisted via
    // handleRenameDocTitle → renameNode.
    const wsNode = workspaces.find(w => w.id === ws);
    const node = wsNode ? findKnowledgeNode(wsNode.nodes, docId) : undefined;
    setSaveStatus(s => ({ ...s, [docId]: 'saving' }));
    try {
      const res = await api.workspaces.putContent(ws, docId, {
        label: node?.label,
        blocks: cached.content,
        base_version: cached.version,
      });
      docCache.current[docId] = { ...cached, version: res.version };
      setSaveStatus(s => ({ ...s, [docId]: 'saved' }));
      setTimeout(() => setSaveStatus(s => { if (s[docId] !== 'saved') return s; const n = { ...s }; delete n[docId]; return n; }), 1500);
    } catch (err) {
      const e = err as Error & {
        status?: number;
        data?: { version: number; blocks: DocBlock[] };
      };
      if (e.status === 409 && e.data) {
        docCache.current[docId] = { content: e.data.blocks, version: e.data.version };
        setConflictBump((b) => b + 1);
        setSaveStatus(s => ({ ...s, [docId]: 'saved' }));
        setTimeout(() => setSaveStatus(s => { if (s[docId] !== 'saved') return s; const n = { ...s }; delete n[docId]; return n; }), 1500);
        toast('This document was edited elsewhere. The latest version was loaded.');
      } else {
        console.error('Failed to save document', err);
        setSaveStatus(s => ({ ...s, [docId]: 'error' }));
      }
    }
  }, []);

  const scheduleSave = useCallback(
    (ws: string, docId: string) => {
      const st = (saveState.current[docId] ??= { ws });
      st.ws = ws;
      if (st.timer) clearTimeout(st.timer);
      st.timer = setTimeout(() => {
        st.timer = undefined;
        void runSave(docId);
      }, 600);
    },
    [runSave]
  );

  const flushSave = useCallback(() => {
    Object.keys(saveState.current).forEach((docId) => {
      const st = saveState.current[docId];
      if (st?.timer) {
        clearTimeout(st.timer);
        st.timer = undefined;
        void runSave(docId);
      }
    });
  }, [runSave]);

  const scheduleRename = useCallback((ws: string, id: string, patch: { label?: string; title?: string }) => {
    const st = (renameState.current[id] ??= {});
    st.ws = ws;
    st.patch = patch;
    setSaveStatus(s => ({ ...s, [id]: 'saving' }));
    if (st.timer) clearTimeout(st.timer);
    st.timer = setTimeout(() => {
      st.timer = undefined;
      if (st.ws && st.patch) {
        void api.workspaces.renameNode(st.ws, id, st.patch)
          .then(() => {
            setSaveStatus(s => ({ ...s, [id]: 'saved' }));
            void fetchSharedNodes();
          })
          .catch(() => setSaveStatus(s => ({ ...s, [id]: 'error' })));
      }
    }, 600);
  }, [fetchSharedNodes]);
  const [activeDocId, setActiveDocId] = useState<string | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const prevViewRef = useRef<ViewState>('overview');
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(() => new Set());
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
    fetchWorkspaces();
    void fetchSharedNodes();
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
  }, [loadConnectedRepositories, loadRepositories, fetchWorkspaces, fetchSharedNodes]);

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
      void fetchWorkspaces();
      void fetchSharedNodes();
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
    void fetchWorkspaces();
    void fetchSharedNodes();
  };

  const handleAddRepository = () => {
    loadRepositories();
    setView('repository-select');
  };

  const handleNavigate = (newView: ViewState) => setView(newView);

  // Global command shortcuts: ⌘K/Ctrl+K opens the palette; `g` then a key jumps.
  const commandShortcutHandler = useCommandShortcuts(handleNavigate, () =>
    setPaletteOpen((o) => !o)
  );
  useEffect(() => {
    window.addEventListener('keydown', commandShortcutHandler);
    return () => window.removeEventListener('keydown', commandShortcutHandler);
  }, [commandShortcutHandler]);

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

  const handleCreateNode = async (
    workspaceId: string,
    parentId: string | null,
    type: KnowledgeNode['type'],
    label: string
  ) => {
    try {
      await api.workspaces.createNode(workspaceId, { parent_id: parentId, type, label });
      await refreshNodes(workspaceId);
      void fetchSharedNodes();
    } catch (err) {
      console.error('Failed to create node', err);
    }
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

  // Shared nodes are readable from any workspace but only writable from the
  // workspace that owns them. Edits from elsewhere would 404 on the backend.
  const isNodeEditable = (workspaceId: string, nodeId: string): boolean => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return true;
    const node = findKnowledgeNode(ws.nodes, nodeId);
    if (!node) return true;
    return node.workspace_id === workspaceId || !node.shared;
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

  const mapKnowledgeNode = (
    nodes: KnowledgeNode[],
    id: string,
    fn: (n: KnowledgeNode) => KnowledgeNode
  ): KnowledgeNode[] =>
    nodes.map(n => {
      if (n.id === id) return fn(n);
      if (n.children) return { ...n, children: mapKnowledgeNode(n.children, id, fn) };
      return n;
    });

  const handleRenameNode = (workspaceId: string, id: string, label: string) => {
    if (!label.trim()) return;
    if (!isNodeEditable(workspaceId, id)) {
      toast('This shared node is read-only outside its owning workspace.');
      return;
    }
    const trimmed = label.trim();
    updateWorkspaceNodes(workspaceId, prev => renameKnowledgeNode(prev, id, trimmed));
    scheduleRename(workspaceId, id, { label: trimmed });
  };

  // Header/title edits update the node's separate `title` field (never its
  // file-name `label`), and also keep the local content cache in sync.
  const handleRenameDocTitle = (workspaceId: string, docId: string, title: string) => {
    if (!title.trim()) return;
    if (!isNodeEditable(workspaceId, docId)) {
      toast('This shared document is read-only outside its owning workspace.');
      return;
    }
    const trimmed = title.trim();
    docCache.current[docId] = {
      ...(docCache.current[docId] ?? { content: [], version: undefined }),
      title: trimmed,
    };
    force();
    scheduleRename(workspaceId, docId, { title: trimmed });
    scheduleSave(workspaceId, docId);
  };

  const handleDeleteNode = async (workspaceId: string, id: string) => {
    if (!isNodeEditable(workspaceId, id)) {
      toast('This shared node is read-only outside its owning workspace.');
      return;
    }
    updateWorkspaceNodes(workspaceId, prev => removeKnowledgeNode(prev, id).tree);
    try {
      await api.workspaces.deleteNode(workspaceId, id);
      void fetchSharedNodes();
    } catch (err) {
      console.error('Failed to delete node', err);
      await refreshNodes(workspaceId);
    }
  };

  const handleMoveNode = async (
    workspaceId: string,
    id: string,
    newParentId: string | null
  ) => {
    if (!isNodeEditable(workspaceId, id)) {
      toast('This shared node is read-only outside its owning workspace.');
      return;
    }
    updateWorkspaceNodes(workspaceId, prev => {
      // Prevent dropping a node into its own subtree.
      if (newParentId !== null && isKnowledgeDescendant(prev, id, newParentId)) return prev;
      const { tree, removed } = removeKnowledgeNode(prev, id);
      if (!removed) return prev;
      return insertKnowledgeNode(tree, newParentId, removed);
    });
    try {
      await api.workspaces.moveNode(workspaceId, id, { new_parent_id: newParentId });
      void fetchSharedNodes();
    } catch (err) {
      console.error('Failed to move node', err);
      await refreshNodes(workspaceId);
    }
  };

  const updateWorkspaceNodes = (
    wsId: string,
    updater: (nodes: KnowledgeNode[]) => KnowledgeNode[]
  ) => setWorkspaces(prev => prev.map(w => (w.id === wsId ? { ...w, nodes: updater(w.nodes) } : w)));

  const handleCreateWorkspace = async (label: string, icon: string, repo?: string | null) => {
    try {
      const ws = await api.workspaces.create({ label, icon, repo: repo ?? null });
      setWorkspaces(prev => [...prev, { ...ws, nodes: [] }]);
    } catch (err) {
      console.error('Failed to create workspace', err);
    }
  };

  const handleRenameWorkspace = async (id: string, label: string, icon: string, repo?: string | null) => {
    setWorkspaces(prev => prev.map(w => (w.id === id ? { ...w, label, icon, repo: repo ?? null } : w)));
    try {
      await api.workspaces.update(id, { label, icon, repo: repo ?? null });
    } catch (err) {
      console.error('Failed to rename workspace', err);
    }
  };

  const handleToggleShare = async (workspaceId: string, id: string, shared: boolean) => {
    // Optimistic: flip the badge immediately.
    updateWorkspaceNodes(workspaceId, prev =>
      mapKnowledgeNode(prev, id, n => ({ ...n, shared }))
    );
    try {
      await api.workspaces.shareNode(workspaceId, id, shared);
      void fetchSharedNodes();
    } catch (err) {
      console.error('Failed to toggle share', err);
      await refreshNodes(workspaceId);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    try {
      await api.workspaces.remove(id);
    } catch (err) {
      console.error('Failed to delete workspace', err);
    }
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
        // The breadcrumb should reflect the document's editable title, not its
        // underlying file name (node.label).
        const docPath = path.map(p => ({ ...p }));
        const last = docPath[docPath.length - 1];
        if (last) last.label = docCache.current[node.id]?.title ?? node.title ?? last.label;
        return {
          workspaceId: ws.id,
          workspaceIcon: ws.icon,
          workspaceLabel: ws.label,
          node,
          path: docPath,
        };
      }
    }
    return null;
  };

  const updateDocContent = (workspaceId: string, docId: string, content: DocBlock[]) => {
    if (!isNodeEditable(workspaceId, docId)) {
      toast('This shared document is read-only outside its owning workspace.');
      return;
    }
    docCache.current[docId] = { ...(docCache.current[docId] ?? {}), content };
    force();
    setSaveStatus(s => ({ ...s, [docId]: 'saving' }));
    scheduleSave(workspaceId, docId);
  };

  // Lazy-load a document's body the first time it is opened.
  useEffect(() => {
    if (view === 'docs' && activeDocId) {
      const doc = findDoc(activeDocId);
      if (doc && !docCache.current[doc.node.id]) {
        void loadDocContent(doc.workspaceId, doc.node.id);
      }
    }
  }, [view, activeDocId, loadDocContent]);

  // Flush any pending autosave when the tab is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flushSave]);

  const handleSelectDoc = (docId: string) => {
    flushSave();
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
            description="Turn team meetings into a searchable source of truth so the engineering decisions, context, and rationale that usually get lost are always recoverable."
            icon={Video}
            bullets={[
              'Auto-generated summaries capturing the decisions and the why behind them',
              'Action items and owners synced straight to your inbox',
              'Searchable transcripts across every call — find the reasoning behind any choice',
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
      case 'review':
        return <ReviewPage />;
      case 'docs': {
        const doc = activeDocId ? findDoc(activeDocId) : null;
        if (!doc) return <InboxPage />;
        const cached = docCache.current[doc.node.id];
        if (!cached) {
          return (
            <div className="mx-auto w-full max-w-[760px] px-6 py-10 sm:px-12">
              <Skeleton className="mb-2 h-9 w-2/3" />
              <Skeleton className="mb-6 h-px w-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          );
        }
        const blocks = cached.content && cached.content.length > 0
          ? cached.content
          : [{ id: crypto.randomUUID(), type: 'paragraph' as const, text: '' }];
        return (
          <DocsPage
            key={`${doc.node.id}-${conflictBump}`}
            workspaceIcon={doc.workspaceIcon}
            workspaceLabel={doc.workspaceLabel}
            path={doc.path}
            docId={doc.node.id}
            workspaceId={doc.workspaceId}
            title={docCache.current[doc.node.id]?.title ?? doc.node.title ?? doc.node.label}
            blocks={blocks}
            versions={{
              list: () => api.workspaces.listVersions(doc.workspaceId, doc.node.id),
              get: (v) => api.workspaces.getVersion(doc.workspaceId, doc.node.id, v),
              restore: async (v) => {
                const res = await api.workspaces.restoreVersion(doc.workspaceId, doc.node.id, v);
                await loadDocContent(doc.workspaceId, doc.node.id);
                setConflictBump(b => b + 1);
                return res.version;
              },
            }}
            onBack={() => {
              flushSave();
              setView(prevViewRef.current);
            }}
            onRenameTitle={title => handleRenameDocTitle(doc.workspaceId, doc.node.id, title)}
            onUpdateContent={content => updateDocContent(doc.workspaceId, doc.node.id, content)}
            saveStatus={saveStatus[doc.node.id]}
            editable={doc.node.workspace_id === doc.workspaceId || !doc.node.shared}
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
        workspaces={visibleWorkspaces}
        loadingWorkspaces={loadingWorkspaces}
        loadingShared={loadingShared}
        sharedNodes={sharedNodes}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onCreateWorkspace={handleCreateWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onCreateNode={handleCreateNode}
        onRenameNode={handleRenameNode}
        onDeleteNode={handleDeleteNode}
        onMoveNode={handleMoveNode}
        onToggleShare={handleToggleShare}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          {renderDashboardContent()}
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={handleNavigate}
      />
      <Toaster richColors position="top-right" />
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