import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  User,
  ArrowRight,
  Zap,
  Sun,
  Moon,
  Check,
} from 'lucide-react';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string) => void;
  onNavigate: (view: 'login' | 'signup') => void;
}

export function SignupPage({ onSignup, onNavigate }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return;
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSignup(name, email, password);
    setIsLoading(false);
  };

  const passwordStrength = (password: string): { strength: number; label: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { strength: score, label: labels[score - 1] || 'Weak' };
  };

  const { strength, label } = passwordStrength(password);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12">
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
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Start mapping your codebase in minutes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

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
              
              {/* Password strength */}
              {password && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= strength
                            ? strength >= 3
                              ? 'bg-green-500'
                              : strength >= 2
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                            : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn(
                    'text-xs',
                    strength >= 3 ? 'text-green-500' : strength >= 2 ? 'text-yellow-500' : 'text-red-500'
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
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Button variant="link" className="h-auto p-0 text-sm">
                  Terms of Service
                </Button>{' '}
                and{' '}
                <Button variant="link" className="h-auto p-0 text-sm">
                  Privacy Policy
                </Button>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-ramp-blue hover:bg-ramp-blue-dark text-white"
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
            Already have an account?{' '}
            <Button
              variant="link"
              className="h-auto p-0 font-semibold"
              onClick={() => onNavigate('login')}
            >
              Sign in
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
          <div className="max-w-md">
            <h2 className="font-heading text-4xl font-bold mb-6 text-center">
              Everything you need to understand your codebase
            </h2>

            {/* Feature list */}
            <div className="space-y-4 mt-8">
              {[
                { icon: Check, text: 'Automatic architecture diagrams' },
                { icon: Check, text: 'Interactive system flows' },
                { icon: Check, text: 'AI-powered code explanations' },
                { icon: Check, text: 'Team knowledge sharing' },
                { icon: Check, text: 'Real-time sync with GitHub' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ramp-blue/10">
                    <feature.icon className="h-4 w-4 text-ramp-blue" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
