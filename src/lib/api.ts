import type { ApiRepository, ApiFlowNode, ApiFlowEdge, FlowStoryResponse, ApiFlowGraph , DiscoverFlowsResponse} from '@/types';


const API_BASE = 'http://localhost:8000/api/v1';

export const api = {
  github: {
    getLoginUrl: () => `${API_BASE}/github/oauth/login`,

    getRepositories: async (): Promise<{ repositories: ApiRepository[]; total: number }> => {
      const res = await fetch(`${API_BASE}/github/repositories`);
      if (!res.ok) throw new Error('Failed to fetch repositories');
      return res.json();
    },

    connectRepository: async (repo: ApiRepository) => {
      const res = await fetch(`${API_BASE}/github/connected-repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!res.ok) throw new Error('Failed to connect repository');
      return res.json();
    },

    getConnectedRepositories: async () => {
      const res = await fetch(`${API_BASE}/github/connected-repositories`);
      if (!res.ok) throw new Error('Failed to fetch connected repositories');
      return res.json();
    },
  },

  architecture: {
    getGraph: async (repoId: string) => {
      const res = await fetch(`${API_BASE}/github/${repoId}/architecture`);
      if (!res.ok) throw new Error('Failed to fetch architecture');
      return res.json();
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

      const res = await fetch(
        `${API_BASE}/github/${repoId}/flow${query.toString() ? `?${query}` : ''}`
      );
      if (!res.ok) throw new Error('Failed to fetch flow');
      return res.json();
    },
  },

  ai: {
    generateStory: async (
      repoId: string,
      files: string[],
      edges: { source: string; target: string; weight: number }[]
    ) => {
      const res = await fetch(`${API_BASE}/ai/architecture-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId, files, edges }),
      });
      if (!res.ok) throw new Error('Failed to generate story');
      return res.json();
    },

    generateFlowStory: async (payload: {
      repo_id: string;
      feature_name?: string;
      function_nodes: ApiFlowNode[];
      function_edges: ApiFlowEdge[];
    }): Promise<FlowStoryResponse> => {
      const res = await fetch(`${API_BASE}/ai/flow-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to generate flow story');
      return res.json();
    },
    discoverFlows: async (payload: {
  repo_id: string;
  function_nodes: ApiFlowNode[];
  function_edges: ApiFlowEdge[];
}): Promise<DiscoverFlowsResponse> => {
  const res = await fetch(`${API_BASE}/ai/discover-flows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to discover flows');
  return res.json();
},
 
enrichFlow: async (payload: {
  repo_id: string;
  flow_name: string;
  function_nodes: ApiFlowNode[];
  function_edges: ApiFlowEdge[];
}): Promise<FlowStoryResponse> => {
  const res = await fetch(`${API_BASE}/ai/enrich-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to enrich flow');
  return res.json();
},
 
 
  },

  users: {
    getMe: async () => {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  },
};