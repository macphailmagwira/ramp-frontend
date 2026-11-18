import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search,
  Menu,
  Sun,
  Moon,
  Monitor,
  Command,
} from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
  onOpenSearch?: () => void;
}

export function TopBar({ onMenuToggle, isSidebarOpen, onOpenSearch }: TopBarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between h-14 px-4 border-b border-border/70 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onMenuToggle}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="relative hidden md:flex items-center w-72 h-9 pl-9 pr-12 text-[13px] text-muted-foreground/70 bg-muted/40 border border-border/60 hover:border-border focus-visible:border-ramp-blue/40 focus-visible:bg-muted/60 focus-visible:[box-shadow:none] focus:[box-shadow:none] rounded-lg transition-colors text-left focus:outline-none"
          >
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Search or jump to...</span>
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
      

          {/* Theme Toggle */}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
                {theme === 'system' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}