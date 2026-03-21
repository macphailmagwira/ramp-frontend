import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
// Login page component
import {
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  ArrowRight,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onNavigate: (view: 'login' | 'signup') => void;
}

export function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onLogin(email, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ramp-blue">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">
                Ramp
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue exploring your codebase
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Button variant="link" className="text-sm h-auto p-0">
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-ramp-blue hover:bg-ramp-blue-dark text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              Or continue with
            </span>
          </div>

          {/* Social login */}
          <Button variant="outline" className="w-full h-11">
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Button
              variant="link"
              className="h-auto p-0 font-semibold"
              onClick={() => onNavigate('signup')}
            >
              Sign up
            </Button>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-ramp-blue/5 via-background to-background overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* Glow effect */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-ramp-blue/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-ramp-blue/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col justify-center items-center p-16">
          <div className="max-w-md text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ramp-blue/10 text-ramp-blue text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Now with AI-powered insights
            </div>
            <h2 className="font-heading text-4xl font-bold mb-4">
              Turn any codebase into a map
            </h2>
            <p className="text-lg text-muted-foreground">
              Ramp reads your repository and generates architecture diagrams, 
              storybooks, and system flows—so your team can ship with confidence.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4 mt-12">
              {[
                { label: 'Architecture Maps', desc: 'Visualize your system' },
                { label: 'Interactive Flows', desc: 'Trace any feature' },
                { label: 'AI Assistant', desc: 'Ask about your code' },
                { label: 'Team Sync', desc: 'Share knowledge' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border text-left"
                >
                  <div className="font-medium text-sm">{feature.label}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
