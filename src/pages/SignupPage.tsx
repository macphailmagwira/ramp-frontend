import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { api } from '@/lib/api';
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Start mapping your codebase in minutes</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    : <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                </Button>
              </div>

              {password && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex flex-1 gap-1">
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
              <Label
                htmlFor="terms"
                className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground"
              >
                I agree to the{' '}
                <Button variant="link" className="h-auto p-0 text-sm text-ramp-blue hover:text-ramp-blue-dark">
                  Terms of Service
                </Button>
                {' '}and{' '}
                <Button variant="link" className="h-auto p-0 text-sm text-ramp-blue hover:text-ramp-blue-dark">
                  Privacy Policy
                </Button>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !agreedToTerms}>
              {isLoading
                ? <Spinner className="h-4 w-4" />
                : <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              Or continue with
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => { window.location.href = api.github.getLoginUrl(); }}
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button
              variant="link"
              className="h-auto p-0 font-semibold text-ramp-blue hover:text-ramp-blue-dark"
              onClick={() => onNavigate('login')}
            >
              Sign in
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
