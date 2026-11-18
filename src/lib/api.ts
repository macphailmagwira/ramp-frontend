import type { ApiRepository, ApiFlowNode, ApiFlowEdge, FlowStoryResponse, ApiFlowGraph, DiscoverFlowsResponse, ApiOverviewResponse, ApiConnectedRepository,   StorybookBookResponse, StorybookFileContentResponse, ArchitectureStoryResponse, ApiKnowledgeNode, ContentResponse, PutContentRequest, VersionSummary, VersionDetail, RestoreVersionResponse, WorkspaceMember, WorkspaceRole, ApiInboxItem } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error('VITE_API_BASE is not set. Provide it via your build environment or .env file.');
}

const TOKEN_KEY = 'ramp_token';
export const UNAUTHORIZED_EVENT = 'ramp:unauthorized';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
  opts: { skipSessionLogout?: boolean; timeout?: number } = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let abort: AbortController | null = null;
  if (opts.timeout && typeof AbortController !== 'undefined') {
    abort = new AbortController();
    const id = setTimeout(() => abort!.abort(), opts.timeout);
    (abort as unknown as { _t?: ReturnType<typeof setTimeout> })._t = id;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    signal: abort?.signal,
  });
  if (abort) clearTimeout((abort as unknown as { _t?: ReturnType<typeof setTimeout> })._t);

  if (res.status === 401) {
    if (opts.skipSessionLogout) {
      // e.g. GitHub account not linked yet — not a session problem, don't log out.
      throw new Error('GitHub account not connected');
    }
    setToken(null);
    unauthorizedHandler?.();
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(
      (data as { detail?: string }).detail || `Request failed (${res.status})`
    );
    (err as Error & { status?: number; data?: unknown }).status = res.status;
    (err as Error & { status?: number; data?: unknown }).data = data;
    throw err;
  }

  return res.json() as Promise<T>;
}

export const api = {
  github: {
    getLoginUrl: () => {
      // Pass the Ramp JWT as the OAuth `state` so the backend callback can
      // associate the GitHub token with the correct user (a full-page redirect
      // from GitHub does not carry the Authorization header).
      const token = getToken();
      const base = `${API_BASE}/github/oauth/login`;
      return token ? `${base}?state=${encodeURIComponent(token)}` : base;
    },

    getRepositories: async (): Promise<{ repositories: ApiRepository[]; total: number }> => {
      // skipSessionLogout: a 401 here means "GitHub not linked yet", not a session
      // problem. The caller (loadRepositories) interprets that signal.
      return request('/github/repositories', {}, { skipSessionLogout: true });
    },

    connectRepository: async (repo: ApiRepository) => {
      return request('/github/connected-repositories', {
        method: 'POST',
        body: JSON.stringify({
          repo_id: String(repo.id),
          owner: repo.owner,
          name: repo.name,
          full_name: repo.full_name,
          clone_url: repo.clone_url,
          default_branch: repo.default_branch,
          is_private: repo.is_private,
          description: repo.description,
        }),
      });
    },

    getConnectedRepositories: async (): Promise<ApiConnectedRepository[]> => {
      // skipSessionLogout: a 401 here means "no connected repos yet" (GitHub
      // not linked), not an expired session. During the initial restore this
      // must not trigger the global logout, which would clear `user` while
      // navigateToDashboard then routes to the connect-github gate.
      return request('/github/connected-repositories', {}, { skipSessionLogout: true });
    },
  },

  flow: {
    getFlow: async (
      repoId: string,
      params?: {
        entry_function?: string;
        entry_file?: string;
        feature_name?: string;
        max_depth?: number;
      }
    ): Promise<ApiFlowGraph> => {
      const query = new URLSearchParams();
      if (params?.entry_function) query.set('entry_function', params.entry_function);
      if (params?.entry_file) query.set('entry_file', params.entry_file);
      if (params?.feature_name) query.set('feature_name', params.feature_name);
      if (params?.max_depth) query.set('max_depth', String(params.max_depth));

      const qs = query.toString();
      return request(`/github/${repoId}/flow${qs ? `?${qs}` : ''}`);
    },
  },

  ai: {
    getArchitectureStory: async (
      repoId: string
    ): Promise<ArchitectureStoryResponse | null> => {
      try {
        return await request<ArchitectureStoryResponse>(`/ai/architecture-story/${repoId}`, {
          method: 'GET',
        });
      } catch (err) {
        if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
          return null;
        }
        throw err;
      }
    },

    generateArchitectureStory: async (
      repoId: string
    ): Promise<ArchitectureStoryResponse> => {
      return request<ArchitectureStoryResponse>(`/ai/architecture-story/${repoId}`, {
        method: 'POST',
        body: '{}',
      });
    },

    regenerateArchitectureStory: async (
      repoId: string
    ): Promise<ArchitectureStoryResponse> => {
      return request<ArchitectureStoryResponse>(`/ai/architecture-story/${repoId}/regenerate`, {
        method: 'POST',
        body: '{}',
      });
    },

    generateFlowStory: async (payload: {
      repo_id: string;
      feature_name?: string;
      function_nodes: ApiFlowNode[];
      function_edges: ApiFlowEdge[];
    }): Promise<FlowStoryResponse> => {
      return request('/ai/flow-story', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    discoverFlows: async (payload: {
      repo_id: string;
      function_nodes: ApiFlowNode[];
      function_edges: ApiFlowEdge[];
    }): Promise<DiscoverFlowsResponse> => {
      return request('/ai/discover-flows', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    enrichFlow: async (payload: {
      repo_id: string;
      flow_name: string;
      function_nodes: ApiFlowNode[];
      function_edges: ApiFlowEdge[];
    }): Promise<FlowStoryResponse> => {
      return request('/ai/enrich-flow', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    storybook: {
      // GET /api/v1/ai/storybook/{connectedRepoId} — 404 means none exists yet.
      get: async (repoId: string): Promise<StorybookBookResponse | null> => {
        try {
          return await request<StorybookBookResponse>(`/ai/storybook/${repoId}`);
        } catch (err) {
          if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
            return null;
          }
          throw err;
        }
      },

      // POST /api/v1/ai/storybook  { connected_repo_id }
      generate: async (repoId: string): Promise<StorybookBookResponse> =>
        request<StorybookBookResponse>(
          '/ai/storybook',
          { method: 'POST', body: JSON.stringify({ connected_repo_id: repoId }) },
          { timeout: 10 * 60 * 1000 }
        ),

      // POST /api/v1/ai/storybook/{connectedRepoId}/refresh
      // Heavy: re-clones + re-analyzes the whole repo. Long timeout.
      refresh: async (repoId: string): Promise<StorybookBookResponse> =>
        request<StorybookBookResponse>(
          `/ai/storybook/${repoId}/refresh`,
          { method: 'POST' },
          { timeout: 15 * 60 * 1000 }
        ),

      // GET /api/v1/ai/storybook/{connectedRepoId}/file-content?path=...
      // Returns the full (uncapped) file text for a path referenced in the book.
      getFileContent: async (repoId: string, path: string): Promise<StorybookFileContentResponse> =>
        request<StorybookFileContentResponse>(
          `/ai/storybook/${repoId}/file-content?path=${encodeURIComponent(path)}`
        ),
    },
  },

  users: {
    getMe: async (): Promise<any> => {
      return request('/users/me');
    },

    login: async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Login failed');
      }
      return res.json();
    },

    signup: async (firstName: string, lastName: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Signup failed');
      }
      return res.json();
    },
  },

  overview: {
    getOverview: async (repoId: string, since?: string, until?: string): Promise<ApiOverviewResponse> => {
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      if (until) params.set('until', until);
      const qs = params.toString();
      return request(`/github/${repoId}/overview${qs ? `?${qs}` : ''}`);
    },
  },

  scan: {
    getStatus: async (repoId: string) => {
      return request(`/github/${repoId}/scan-status`);
    },

    rescan: async (repoId: string) => {
      return request(`/github/${repoId}/rescan`, { method: 'POST' });
    },

    getSyncStatus: async (repoId: string) => {
      return request(`/github/${repoId}/sync-status`);
    },
  },

  workspaces: {
    // ── Workspaces ──
    list: async (repo?: string | null): Promise<WorkspaceResponse[]> =>
      request<WorkspaceResponse[]>(
        '/workspaces' + (repo ? `?repo=${encodeURIComponent(repo)}` : '')
      ),

    // All shared nodes across every workspace, ignoring repo scoping.
    listShared: async (): Promise<ApiKnowledgeNode[]> =>
      request<ApiKnowledgeNode[]>('/workspaces/shared'),

    create: async (payload: { label: string; icon?: string; repo?: string | null }): Promise<WorkspaceResponse> =>
      request<WorkspaceResponse>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: async (
      wsId: string,
      payload: { label?: string; icon?: string; repo?: string | null }
    ): Promise<WorkspaceResponse> =>
      request<WorkspaceResponse>(`/workspaces/${wsId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    remove: async (wsId: string): Promise<void> => {
      await request(`/workspaces/${wsId}`, { method: 'DELETE' });
    },

    // ── Members (team sharing) ──
    listMembers: async (wsId: string): Promise<WorkspaceMember[]> =>
      request<WorkspaceMember[]>(`/workspaces/${wsId}/members`),

    addMember: async (
      wsId: string,
      payload: { user_id?: string; email?: string; role: WorkspaceRole }
    ): Promise<WorkspaceMember> =>
      request<WorkspaceMember>(`/workspaces/${wsId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    updateMember: async (
      wsId: string,
      userId: string,
      payload: { role: WorkspaceRole }
    ): Promise<WorkspaceMember> =>
      request<WorkspaceMember>(`/workspaces/${wsId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    removeMember: async (wsId: string, userId: string): Promise<void> => {
      await request(`/workspaces/${wsId}/members/${userId}`, { method: 'DELETE' });
    },

    // ── Nodes (folder/file tree) ──
    listNodes: async (wsId: string): Promise<ApiKnowledgeNode[]> =>
      request<ApiKnowledgeNode[]>(`/workspaces/${wsId}/nodes`),

    createNode: async (
      wsId: string,
      payload: { parent_id: string | null; type: 'folder' | 'file'; label: string; title?: string; shared?: boolean }
    ): Promise<ApiKnowledgeNode> =>
      request<ApiKnowledgeNode>(`/workspaces/${wsId}/nodes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    renameNode: async (
      wsId: string,
      nodeId: string,
      payload: { label?: string; title?: string; shared?: boolean }
    ): Promise<ApiKnowledgeNode> =>
      request<ApiKnowledgeNode>(`/workspaces/${wsId}/nodes/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    deleteNode: async (wsId: string, nodeId: string): Promise<void> => {
      await request(`/workspaces/${wsId}/nodes/${nodeId}`, { method: 'DELETE' });
    },

    moveNode: async (
      wsId: string,
      nodeId: string,
      payload: { new_parent_id: string | null }
    ): Promise<void> => {
      await request(`/workspaces/${wsId}/nodes/${nodeId}/move`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    // ── Sharing ──
    shareNode: async (
      wsId: string,
      nodeId: string,
      shared: boolean
    ): Promise<ApiKnowledgeNode> =>
      request<ApiKnowledgeNode>(`/workspaces/${wsId}/nodes/${nodeId}/share`, {
        method: 'POST',
        body: JSON.stringify({ shared }),
      }),

    // ── Document content + version history ──
    getContent: async (
      wsId: string,
      nodeId: string
    ): Promise<ContentResponse | null> => {
      try {
        return await request<ContentResponse>(
          `/workspaces/${wsId}/nodes/${nodeId}/content`
        );
      } catch (err) {
        if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
          return null;
        }
        throw err;
      }
    },

    putContent: async (
      wsId: string,
      nodeId: string,
      payload: PutContentRequest
    ): Promise<ContentResponse> =>
      request<ContentResponse>(`/workspaces/${wsId}/nodes/${nodeId}/content`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    listVersions: async (wsId: string, nodeId: string): Promise<VersionSummary[]> =>
      request<VersionSummary[]>(`/workspaces/${wsId}/nodes/${nodeId}/versions`),

    getVersion: async (
      wsId: string,
      nodeId: string,
      version: number
    ): Promise<VersionDetail> =>
      request<VersionDetail>(`/workspaces/${wsId}/nodes/${nodeId}/versions/${version}`),

    restoreVersion: async (
      wsId: string,
      nodeId: string,
      version: number
    ): Promise<RestoreVersionResponse> =>
      request<RestoreVersionResponse>(
        `/workspaces/${wsId}/nodes/${nodeId}/versions/${version}/restore`,
        { method: 'POST' }
      ),
  },

  // ── Inbox ──
  inbox: {
    getItems: async (params?: { category?: string; cleared?: boolean }): Promise<ApiInboxItem[]> => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.cleared !== undefined) qs.set('cleared', String(params.cleared));
      const query = qs.toString();
      return request<ApiInboxItem[]>(`/inbox${query ? `?${query}` : ''}`);
    },
    markRead: async (id: string): Promise<void> =>
      request(`/inbox/${id}/read`, { method: 'POST' }),
    markCleared: async (id: string): Promise<void> =>
      request(`/inbox/${id}/clear`, { method: 'POST' }),
    markAllRead: async (): Promise<void> =>
      request('/inbox/read-all', { method: 'POST' }),
  },
};

export interface WorkspaceResponse {
  id: string;
  owner_id: string;
  label: string;
  icon: string;
  role: WorkspaceRole;
  /** Per-repo boundary this workspace is scoped to (string|null). */
  repo: string | null;
  created_at: string;
  updated_at: string;
}
