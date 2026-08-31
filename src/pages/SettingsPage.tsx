import { useState } from 'react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  User as UserIcon,
  Bell,
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
  onLogout: () => void;
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
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  if (!user?.avatar || errored) {
    return (
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground ring-2 ring-border/40">
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

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    analysis: true,
    team: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Settings</h1>
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
                <Field label="Company">
                  <Input placeholder="Acme Corp" className="h-9 text-sm" />
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
                      : 'bg-ramp-blue hover:bg-ramp-blue-dark text-white'
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
                      Permanently removes your account, all repositories, and team data. This cannot be undone.
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </Section>
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
              <ToggleRow
                label="Push notifications"
                description="Browser notifications for real-time alerts"
                checked={notifications.push}
                onCheckedChange={() => toggle('push')}
              />
              <ToggleRow
                label="Analysis complete"
                description="Notify me when a repository analysis finishes"
                checked={notifications.analysis}
                onCheckedChange={() => toggle('analysis')}
              />
              <ToggleRow
                label="Team activity"
                description="Updates when teammates connect repos or change settings"
                checked={notifications.team}
                onCheckedChange={() => toggle('team')}
              />
            </Section>
          </TabsContent>

          {/* ── Integrations ── */}
          <TabsContent value="integrations" className="mt-0">
            <Section
              title="Connected services"
              description="Link third-party accounts to enhance Ramp."
            >
              {[
                {
                  id: 'github',
                  name: 'GitHub',
                  status: 'Connected as @sarahchen',
                  connected: true,
                  icon: (
                    <Github className="h-4.5 w-4.5" />
                  ),
                  iconBg: 'bg-muted',
                },
                {
                  id: 'slack',
                  name: 'Slack',
                  status: 'Not connected',
                  connected: false,
                  icon: (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                  ),
                  iconBg: 'bg-[#4A154B]',
                },
              ].map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between gap-4 py-4 border-b border-border/40 last:border-0 last:pb-0 first:pt-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-foreground',
                        svc.iconBg,
                        svc.iconBg === 'bg-[#4A154B]' && 'text-white'
                      )}
                    >
                      {svc.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {svc.connected && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {svc.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 text-xs shrink-0',
                      !svc.connected && 'gap-1.5'
                    )}
                  >
                    {!svc.connected && <Link2 className="h-3 w-3" />}
                    {svc.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              ))}
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
                          ? 'border-ramp-blue bg-ramp-blue/5'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                      )}
                    >
                      {active && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-ramp-blue flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
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
      </div>
    </div>
  );
}