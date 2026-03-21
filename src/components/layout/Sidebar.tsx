import { cn } from '@/lib/utils';
import type { ViewState, Repository } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  GitBranch,
  Network,
  BookOpen,
  Workflow,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Box,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen: boolean;
  onToggle: () => void;
  repository: Repository | null;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'flows', label: 'Flows', icon: Workflow },
  { id: 'storybook', label: 'Storybook', icon: BookOpen },
  { id: 'ask-ramp', label: 'Ask Ramp', icon: MessageSquare, badge: 'AI' },
];

const secondaryNavItems: NavItem[] = [
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentView, onNavigate, isOpen, onToggle, repository }: SidebarProps) {
  const renderNavItem = (item: NavItem) => {
    const isActive = currentView === item.id;
    const Icon = item.icon;

    const buttonContent = (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full justify-start gap-3 px-3 py-2 h-10 transition-all duration-200',
          isActive
            ? 'bg-ramp-blue/10 text-ramp-blue dark:bg-ramp-blue/20 dark:text-ramp-blue-light'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          !isOpen && 'justify-center px-2'
        )}
        onClick={() => onNavigate(item.id)}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-ramp-blue')} />
        {isOpen && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-semibold bg-ramp-blue/10 text-ramp-blue dark:bg-ramp-blue/20"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    );

    if (!isOpen) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild key={item.id}>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out',
          isOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <div className={cn('flex items-center gap-3', !isOpen && 'justify-center w-full')}> 
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ramp-blue">
              <Zap className="h-5 w-5 text-white" />
            </div>
            {isOpen && (
              <span className="font-heading font-bold text-lg tracking-tight">
                Ramp
              </span>
            )}
          </div>
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Repository Info */}
        {repository && isOpen && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <GitBranch className="h-3.5 w-3.5" />
              <span>Connected Repository</span>
            </div>
            <div className="font-medium text-sm truncate">{repository.fullName}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="h-5 text-[10px]">
                {repository.language}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {repository.stars} stars
              </span>
            </div>
          </div>
        )}

        {repository && !isOpen && (
          <div className="py-3 border-b border-border flex justify-center">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Box className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {repository.fullName}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <div className={cn('space-y-1', isOpen ? 'px-3' : 'px-2')}> 
            <div className={cn('mb-2', isOpen && 'px-3')}>
              {isOpen && (
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Explore
                </span>
              )}
            </div>
            {mainNavItems.map(renderNavItem)}
          </div>

          <Separator className="my-4 mx-3 w-auto" />

          <div className={cn('space-y-1', isOpen ? 'px-3' : 'px-2')}>
            {isOpen && (
              <div className="mb-2 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Manage
                </span>
              </div>
            )}
            {secondaryNavItems.map(renderNavItem)}
          </div>
        </ScrollArea>

        {/* Collapse button (when closed) */}
        {!isOpen && (
          <div className="p-2 border-t border-border">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-8 text-muted-foreground hover:text-foreground"
                  onClick={onToggle}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
