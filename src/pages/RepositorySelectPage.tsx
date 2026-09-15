import { useState, useMemo } from 'react';
import type { Repository, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Search,
  GitBranch,
  Star,
  Clock,
  Check,
  LogOut,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Github,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface RepositorySelectPageProps {
  repositories: Repository[];
  connectedRepositories: Repository[];
  onSelectRepository: (repo: Repository) => void;
  onSwitchToConnected: (repo: Repository) => void;
  onBack: () => void;
  user: User | null;
  onLogout: () => void;
  githubConnected: boolean;
  isLoading?: boolean;
}

export function RepositorySelectPage({
  repositories,
  connectedRepositories,
  onSelectRepository,
  onSwitchToConnected,
  onBack,
  user,
  onLogout,
  githubConnected,
  isLoading = false,
}: RepositorySelectPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const { setTheme, resolvedTheme } = useTheme();

  const connectedIds = useMemo(() => new Set(connectedRepositories.map(r => r.id)), [connectedRepositories]);

  const filteredRepos = useMemo(() => {
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.language || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [repositories, searchQuery]);

  const toggleRepo = (repoId: string) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleContinue = () => {
    const selectedRepo = repositories.find((r) => r.id === Array.from(selectedRepos)[0]);
    if (selectedRepo) {
      onSelectRepository(selectedRepo);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConnectGitHub = () => {
    window.location.href = api.github.getLoginUrl();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-border/70 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-1 h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg">
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border/70 mx-1.5" />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-2 rounded-lg hover:bg-muted/60">
                  <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full ring-1 ring-border/60" />
                  <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-6 overflow-auto">
        <div className="w-full max-w-4xl animate-fade-in">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">
              Select a repository
            </h1>
            <p className="text-muted-foreground text-base">
              Choose a repository to analyze and generate documentation
            </p>
          </div>

          {/* Connected Repositories */}
          {connectedRepositories.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Connected Repositories
                </h2>
              </div>
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-xs">
                <div className="divide-y divide-border/60">
                  {connectedRepositories.map((repo) => (
                    <div
                      key={repo.id}
                      className="group flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => onSwitchToConnected(repo)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{repo.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.fullName}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Available Repositories */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Github className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Repositories
                </h2>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleConnectGitHub}>
                <Github className="h-3.5 w-3.5" />
                Connect GitHub
              </Button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
                />
              </div>
            </div>

            {/* Repository list */}
            <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-xs">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
                <span className="text-sm font-medium text-muted-foreground">
                  {isLoading ? 'Loading...' : `${filteredRepos.length} repositories`}
                </span>
                {selectedRepos.size > 0 && (
                  <Badge variant="secondary" className="bg-ramp-blue/10 text-ramp-blue border border-ramp-blue/20 font-medium">
                    {selectedRepos.size} selected
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[320px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-ramp-blue/30 border-t-ramp-blue rounded-full animate-spin" />
                      <span className="text-sm">Loading repositories...</span>
                    </div>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  !githubConnected ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Github className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Connect your GitHub account</p>
                        <p className="text-xs text-muted-foreground/70 mb-3 max-w-xs">
                          Link GitHub to browse and connect your repositories.
                        </p>
                        <Button className="gap-2" onClick={handleConnectGitHub}>
                          <Github className="h-4 w-4" />
                          Connect GitHub
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full py-20">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                          <Github className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <span className="text-sm">No repositories found</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredRepos.map((repo) => {
                      const isAlreadyConnected = connectedIds.has(repo.id);
                      const isSelected = selectedRepos.has(repo.id);
                      return (
                        <div
                          key={repo.id}
                          className={cn(
                            'group flex items-center gap-4 px-4 py-3.5 transition-colors',
                            !isAlreadyConnected && 'cursor-pointer hover:bg-muted/40',
                            isSelected && 'bg-ramp-blue/[0.06] hover:bg-ramp-blue/[0.08]'
                          )}
                          onClick={() => !isAlreadyConnected && toggleRepo(repo.id)}
                        >
                          {/* Checkbox */}
                          {!isAlreadyConnected && (
                            <div
                              className={cn(
                                'flex items-center justify-center w-5 h-5 rounded-md border-[1.5px] transition-all duration-150',
                                isSelected
                                  ? 'bg-ramp-blue border-ramp-blue shadow-[0_0_0_3px_rgba(79,109,255,0.15)]'
                                  : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                              )}
                            </div>
                          )}

                          {/* Repo info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span className="font-medium text-sm truncate">{repo.name}</span>
                              {isAlreadyConnected && (
                                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                                  Connected
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {repo.description || repo.fullName}
                            </p>
                          </div>

                          {/* Stats */}
                          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                            {repo.language && repo.language !== 'Unknown' && (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      repo.language === 'TypeScript'
                                        ? '#3178c6'
                                        : repo.language === 'Python'
                                        ? '#3776ab'
                                        : repo.language === 'Go'
                                        ? '#00add8'
                                        : repo.language === 'Rust'
                                        ? '#dea584'
                                        : '#6b7280',
                                  }}
                                />
                                <span>{repo.language}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span className="tabular-nums">{repo.stars}</span>
                            </div>
                            {repo.updatedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(repo.updatedAt)}</span>
                              </div>
                            )}
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              className="gap-2 bg-ramp-blue hover:bg-ramp-blue-dark text-white font-medium rounded-lg shadow-sm hover:shadow-glow-sm transition-all duration-200 px-5"
              disabled={selectedRepos.size === 0 || isLoading}
              onClick={handleContinue}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}