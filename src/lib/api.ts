import type { ApiRepository, ApiFlowNode, ApiFlowEdge, FlowStoryResponse, ApiFlowGraph, DiscoverFlowsResponse, ApiOverviewResponse, ApiConnectedRepository } from '@/types';

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
  opts: { skipSessionLogout?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

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
    throw new Error((data as { detail?: string }).detail || `Request failed (${res.status})`);
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

  architecture: {
    getGraph: async (repoId: string) => {
      return request(`/github/${repoId}/architecture`);
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
    generateStory: async (
      repoId: string,
      files: string[],
      edges: { source: string; target: string; weight: number }[]
    ) => {
      return request('/ai/architecture-story', {
        method: 'POST',
        body: JSON.stringify({ repo_id: repoId, files, edges }),
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
};
