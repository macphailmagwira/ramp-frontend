import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface SignupPageProps {
  onSignup: (user: any, token: string) => void;
  onNavigate: (view: 'login' | 'signup') => void;
}

export function SignupPage({ onSignup, onNavigate }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = (pwd: string): { strength: number; label: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { strength: score, label: labels[score - 1] || 'Weak' };
  };

  const { strength, label } = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return;
    setError('');
    setIsLoading(true);
    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || name;
      const lastName = nameParts.slice(1).join(' ') || name;
      const data = await api.users.signup(firstName, lastName, email, password);
      onSignup(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout headline="Everything you need to understand your codebase">
      <div className="mb-8">
        <h1 className="font-heading text-[1.75rem] font-bold tracking-tight mb-2">
          Create your account
        </h1>
        <p className="text-muted-foreground text-[15px]">
          Start mapping your codebase in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-[13px] font-medium">Full name</Label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-11 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-medium">Password</Label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-ramp-blue transition-colors" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-lg bg-muted/30 border-border/70 hover:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ramp-blue/40 transition-colors"
              required
              minLength={8}
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

          {password && (
            <div className="flex items-center gap-2 pt-1 animate-fade-in">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      i <= strength
                        ? strength >= 3 ? 'bg-emerald-500' : strength >= 2 ? 'bg-amber-500' : 'bg-red-500'
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>
              <span className={cn(
                'text-xs font-medium',
                strength >= 3 ? 'text-emerald-500' : strength >= 2 ? 'text-amber-500' : 'text-red-500'
              )}>
                {label}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer text-muted-foreground">
            I agree to the{' '}
            <Button variant="link" className="h-auto p-0 text-sm text-ramp-blue hover:text-ramp-blue-dark">Terms of Service</Button>
            {' '}and{' '}
            <Button variant="link" className="h-auto p-0 text-sm text-ramp-blue hover:text-ramp-blue-dark">Privacy Policy</Button>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-lg bg-ramp-blue hover:bg-ramp-blue-dark text-white font-medium shadow-sm hover:shadow-glow-sm transition-all duration-200"
          disabled={isLoading || !agreedToTerms}
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
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
        Already have an account?{' '}
        <Button
          variant="link"
          className="h-auto p-0 font-semibold text-ramp-blue hover:text-ramp-blue-dark"
          onClick={() => onNavigate('login')}
        >
          Sign in
        </Button>
      </p>
    </AuthLayout>
  );
}
