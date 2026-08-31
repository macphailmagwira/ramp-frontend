import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { api } from '@/lib/api';
import {
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any, token: string) => void;
  onNavigate: (view: 'login' | 'signup') => void;
}

export function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await api.users.login(email, password);
      if (rememberMe) localStorage.setItem('ramp_token', data.token);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout headline="The fastest way to understand any codebase">
      <div className="mb-8">
        <h1 className="font-heading text-[1.75rem] font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-[15px]">Sign in to continue exploring your codebase</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
            <Input
              id="email" type="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-medium">Password</Label>
            <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-ramp-blue">
              Forgot password?
            </Button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
            <Input
              id="password" type={showPassword ? 'text' : 'password'}
              placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
              required
            />
            <Button
              type="button" variant="ghost" size="icon"
              className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                : <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember" checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-muted-foreground">
            Remember me
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-lg bg-ramp-blue hover:bg-ramp-blue-dark text-white font-medium shadow-sm hover:shadow-glow-sm transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </form>

      <div className="relative my-8">
        <Separator />
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          Or continue with
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 rounded-lg border-border/70 hover:bg-muted/50 hover:border-border font-medium transition-colors"
        onClick={() => { window.location.href = api.github.getLoginUrl(); }}
      >
        <Github className="mr-2 h-4 w-4" />
        GitHub
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Button variant="link" className="h-auto p-0 font-semibold text-ramp-blue hover:text-ramp-blue-dark" onClick={() => onNavigate('signup')}>
          Sign up
        </Button>
      </p>
    </AuthLayout>
  );
}
