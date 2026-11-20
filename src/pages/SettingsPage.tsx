import { useEffect, useState } from 'react';
import type { AccountResponse, GitHubConnectionStatus, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { gradientFor, initialsOf } from '@/lib/avatar';
import {
  Github,
  Trash2,
  Save,
  Sun,
  Moon,
  Monitor,
  Check,
  Link2,
  AlertTriangle,
} from 'lucide-react';

interface SettingsPageProps {
  user: User | null;
  onLogout?: () => void;
}

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card',
        danger ? 'border-destructive/40' : 'border-border/60'
      )}
    >
      <div className="px-6 py-5 border-b border-border/50">
        <h2
          className={cn(
            'text-sm font-semibold leading-none',
            danger ? 'text-destructive' : 'text-foreground'
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5 border-b border-border/40 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-none mb-1">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

// ── Avatar with fallback ──────────────────────────────────────────────────────
function UserAvatar({ user }: { user: User | null }) {
  const [errored, setErrored] = useState(false);
  const initials = initialsOf(user?.name);
  const seed = user?.id || user?.email || user?.name || 'user';

  if (!user?.avatar || errored) {
    return (
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white ring-2 ring-border/40"
        style={{ background: gradientFor(seed) }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={user.avatar}
      alt={user.name}
      onError={() => setErrored(true)}
      className="w-16 h-16 rounded-full object-cover ring-2 ring-border/40"
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SettingsPage({ user, onLogout }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [github, setGithub] = useState<GitHubConnectionStatus | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    api.accounts.getMe()
      .then((data) => {
        if (!active) return;
        setAccount(data);
        setCompanyName(data.name);
      })
      .catch(() => {
        if (active) setAccount(null);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.users.getMe()
      .then((data) => {
        if (active) setGithub(data.github ?? null);
      })
      .catch(() => {
        if (active) setGithub(null);
      })
      .finally(() => {
        if (active) setGithubLoading(false);
      });
    return () => { active = false; };
  }, []);

  const isAdmin = (account?.role ?? user?.accountRole) === 'admin';

  const [notifications, setNotifications] = useState({
    email: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const nextName = companyName.trim();
    if (isAdmin && account && nextName && nextName !== account.name) {
      setIsSaving(true);
      try {
        const updated = await api.accounts.update(nextName);
        setAccount(updated);
        setCompanyName(updated.name);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update company name');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.accounts.delete();
      onLogout?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
            {(account?.role || user?.accountRole) && (
              <Badge variant="outline" className="capitalize text-[11px]">
                {account?.role ?? user?.accountRole}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">

          {/* Tab bar */}
          <TabsList className="h-9 bg-muted/50 p-0.5 gap-0.5">
            {[
              { value: 'profile',       label: 'Profile' },
              { value: 'notifications', label: 'Notifications' },
              { value: 'integrations',  label: 'Integrations' },
              { value: 'appearance',    label: 'Appearance' },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs px-3.5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile" className="space-y-5 mt-0">
            <Section title="Profile information" description="Update your name, email, and public profile.">

              {/* Avatar row */}
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border/40">
                <UserAvatar user={user} />
                <div>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Change photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or GIF · max 2 MB</p>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name">
                    <Input defaultValue={user?.name} className="h-9 text-sm" />
                  </Field>
                  <Field label="Email">
                    <Input type="email" defaultValue={user?.email} className="h-9 text-sm" />
                  </Field>
                </div>
                <Field
                  label="Company"
                  hint={!isAdmin ? 'Only account admins can rename the company.' : undefined}
                >
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Acme Corp"
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Bio">
                  <Input placeholder="A short description about you" className="h-9 text-sm" />
                </Field>
              </div>

              {/* Save */}
              <div className="flex justify-end mt-6">
                <Button
                  className={cn(
                    'gap-1.5 text-sm h-9 transition-all',
                    saved
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : saved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
                </Button>
              </div>
            </Section>

            {/* Danger zone */}
            {isAdmin && (
              <Section
                title="Danger zone"
                description="Permanent, irreversible actions for your account."
                danger
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete account</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Permanently removes the company, all members, repositories, and documents.
                        Existing sessions stop working immediately. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 h-8 text-xs"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </Section>
            )}
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="mt-0">
            <Section
              title="Notification preferences"
              description="Choose when and how you hear from us."
            >
              <ToggleRow
                label="Email notifications"
                description="Receive summaries and updates via email"
                checked={notifications.email}
                onCheckedChange={() => toggle('email')}
              />
            </Section>
          </TabsContent>

          {/* ── Integrations ── */}
          <TabsContent value="integrations" className="mt-0">
            <Section
              title="Connected services"
              description="Link third-party accounts to enhance Ramp."
            >
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Github className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">GitHub</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {githubLoading ? (
                        'Checking connection…'
                      ) : github?.is_connected ? (
                        <>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Connected as @{github.github_username ?? 'your account'}
                        </>
                      ) : (
                        'Not connected'
                      )}
                    </p>
                  </div>
                </div>
                {!githubLoading &&
                  (github?.is_connected ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Check className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        window.location.href = api.github.getLoginUrl();
                      }}
                    >
                      <Link2 className="h-3 w-3" />
                      Connect
                    </Button>
                  ))}
              </div>
            </Section>
          </TabsContent>

          {/* ── Appearance ── */}
          <TabsContent value="appearance" className="mt-0">
            <Section
              title="Appearance"
              description="Choose how Ramp looks on this device."
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light',  label: 'Light',  Icon: Sun },
                  { value: 'dark',   label: 'Dark',   Icon: Moon },
                  { value: 'system', label: 'System', Icon: Monitor },
                ].map(({ value, label, Icon }) => {
                  const active = theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                      className={cn(
                        'relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ramp-blue',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                      )}
                    >
                      {active && (
                         <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                           <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          active ? 'text-ramp-blue' : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'text-xs font-medium transition-colors',
                          active ? 'text-ramp-blue' : 'text-foreground'
                        )}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          </TabsContent>

        </Tabs>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {account?.name ? `“${account.name}”` : 'your company'},
                all members, connected repositories, workspaces, and documents. Everyone will be
                signed out immediately. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteAccount();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}