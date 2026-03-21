export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  isConnected: boolean;
  isAnalyzing: boolean;
  analysisProgress: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  repositories: string[];
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: 'service' | 'module' | 'external';
  description: string;
  files: string[];
  dependencies: string[];
  position: { x: number; y: number };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: 'calls' | 'imports' | 'uses';
}

export interface StorybookTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  files: string[];
  relatedTopics: string[];
}

export interface FlowStep {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'service' | 'database' | 'external';
  file?: string;
  line?: number;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: {
    file: string;
    line?: number;
    description: string;
  }[];
}

export interface AnalysisStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number;
}

export type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
};



  // Add these to existing types/index.ts

export interface GitHubConnectionStatus {
  is_connected: boolean;
  github_username: string | null;
  github_user_id: string | null;
  connected_at: string | null;
}

export interface ApiUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  github: GitHubConnectionStatus | null;
  created_at: string;
  updated_at: string;
}

export interface ApiRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  is_private: boolean;
  clone_url: string;
  default_branch: string;
  updated_at: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

// Add github-callback to ViewState
export type ViewState = 
  | 'login'
  | 'signup'
  | 'repository-select'
  | 'repository-analysis'
  | 'github-callback'
  | 'dashboard'
  | 'overview'
  | 'architecture'
  | 'storybook'
  | 'flows'
  | 'ask-ramp'
  | 'team'
  | 'settings';

  export interface ApiRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  is_private: boolean;
  clone_url: string;
  default_branch: string;
  updated_at: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}



export interface ApiFlowNode {
  id: string;
  label: string;
  node_type: 'function' | 'method' | 'class' | 'file';
  file_path: string | null;
  file_id: string | null;
  is_async: boolean;
  line_start: number | null;
}
 
export interface ApiFlowEdge {
  source: string;
  target: string;
  edge_type: 'calls' | 'file_import';
}
 
export interface ApiFlowGraph {
  entry_point: string | null;
  function_nodes: ApiFlowNode[];
  function_edges: ApiFlowEdge[];
  file_nodes: ApiFlowNode[];
  file_edges: ApiFlowEdge[];
}
 
export interface FlowStoryStep {
  id: string;
  name: string;
  description: string;
  type: string;
  file: string | null;
  line: number | null;
  is_async: boolean;
  insight: string | null;
}
 
export interface FlowStoryResponse {
  name: string;
  description: string;
  entry_point: string | null;
  steps: FlowStoryStep[];
}
 
export interface EnrichedFlowStep {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'service' | 'database' | 'external';
  file?: string;
  line?: number;
  is_async?: boolean;
  insight?: string;
}
 
export interface EnrichedFlow {
  id: string;
  name: string;
  description: string;
  entry_point: string | null;
  steps: EnrichedFlowStep[];
}


export interface DiscoveredFlowSummary {
  id: string;
  name: string;
  description: string;
  function_count: number;
}
 
export interface DiscoverFlowsResponse {
  flows: DiscoveredFlowSummary[];
}

