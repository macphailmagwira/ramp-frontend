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
import {
  Search,
  GitBranch,
  Star,
  Clock,
  Check,
  Plus,
  LogOut,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Zap,
  Github,
} from 'lucide-react';

interface RepositorySelectPageProps {
  repositories: Repository[];
  onSelectRepository: (repo: Repository) => void;
  user: User | null;
  onLogout: () => void;
  isLoading?: boolean;
}

export function RepositorySelectPage({
  repositories,
  onSelectRepository,
  user,
  onLogout,
  isLoading = false,
}: RepositorySelectPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const { setTheme, resolvedTheme } = useTheme();

  const filteredRepos = useMemo(() => {
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ramp-blue">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">Ramp</span>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
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

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full" />
                  <span className="hidden sm:inline text-sm">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
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
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">
              Select a repository
            </h1>
            <p className="text-muted-foreground">
              Choose a repository to analyze and generate documentation
            </p>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = 'http://localhost:8000/api/v1/github/oauth/login';
              }}
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Connect GitHub</span>
            </Button>
          </div>

          {/* Repository list */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <span className="text-sm font-medium">
                {isLoading ? 'Loading...' : `${filteredRepos.length} repositories`}
              </span>
              {selectedRepos.size > 0 && (
                <Badge variant="secondary" className="bg-ramp-blue/10 text-ramp-blue">
                  {selectedRepos.size} selected
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-20">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-ramp-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading repositories...</span>
                  </div>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="flex items-center justify-center h-full py-20">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Github className="h-8 w-8" />
                    <span className="text-sm">No repositories found</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mt-2"
                      onClick={() => {
                        window.location.href = 'http://localhost:8000/api/v1/github/oauth/login';
                      }}
                    >
                      <Github className="h-4 w-4" />
                      Connect GitHub
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className={cn(
                        'flex items-center gap-4 p-4 cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        selectedRepos.has(repo.id) && 'bg-ramp-blue/5'
                      )}
                      onClick={() => toggleRepo(repo.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'flex items-center justify-center w-5 h-5 rounded border-2 transition-colors',
                          selectedRepos.has(repo.id)
                            ? 'bg-ramp-blue border-ramp-blue'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {selectedRepos.has(repo.id) && (
                          <Check className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>

                      {/* Repo info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{repo.fullName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {repo.description || 'No description'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                        {repo.language && (
                          <div className="flex items-center gap-1">
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
                          <Star className="h-3.5 w-3.5" />
                          <span>{repo.stars}</span>
                        </div>
                        {repo.updatedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(repo.updatedAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" className="gap-2">
              <Plus className="h-4 w-4" />
              Add repository manually
            </Button>
            <Button
              className="gap-2 bg-ramp-blue hover:bg-ramp-blue-dark text-white"
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