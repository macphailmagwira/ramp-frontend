import { useState } from 'react';
import type { TeamMember } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  User,
  Crown,
  Trash2,
  Edit,
  Copy,
  Check,
  GitFork,
} from 'lucide-react';

interface TeamPageProps {
  members: TeamMember[];
}

const ROLE_CONFIG: Record<
  TeamMember['role'],
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  owner: {
    icon: Crown,
    label: 'Owner',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  member: {
    icon: User,
    label: 'Member',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

// Deterministic pastel avatar bg from name
function avatarColor(name: string) {
  const colors = [
    ['bg-violet-100 dark:bg-violet-900/40', 'text-violet-700 dark:text-violet-300'],
    ['bg-sky-100 dark:bg-sky-900/40', 'text-sky-700 dark:text-sky-300'],
    ['bg-emerald-100 dark:bg-emerald-900/40', 'text-emerald-700 dark:text-emerald-300'],
    ['bg-rose-100 dark:bg-rose-900/40', 'text-rose-700 dark:text-rose-300'],
    ['bg-amber-100 dark:bg-amber-900/40', 'text-amber-700 dark:text-amber-300'],
    ['bg-teal-100 dark:bg-teal-900/40', 'text-teal-700 dark:text-teal-300'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function Avatar({ member }: { member: TeamMember }) {
  const [errored, setErrored] = useState(false);
  const initials = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const [bg, fg] = avatarColor(member.name);

  if (!member.avatar || errored) {
    return (
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0', bg, fg)}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={member.avatar}
      alt={member.name}
      onError={() => setErrored(true)}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-border/40"
    />
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-muted/40 rounded-xl px-5 py-4 border border-border/50">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

function RolePicker({
  value,
  onChange,
}: {
  value: TeamMember['role'];
  onChange: (r: TeamMember['role']) => void;
}) {
  const roles: { id: TeamMember['role']; title: string; desc: string }[] = [
    { id: 'member', title: 'Member', desc: 'Read-only access' },
    { id: 'admin', title: 'Admin', desc: 'Manage team & repos' },
    { id: 'owner', title: 'Owner', desc: 'Full billing access' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {roles.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={cn(
              'p-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ramp-blue',
              active
                ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_var(--color-ramp-blue,#9ca3af)]'
                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
            )}
          >
            <div className={cn('text-sm font-semibold', active ? 'text-ramp-blue' : 'text-foreground')}>{r.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{r.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

export function TeamPage({ members }: TeamPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('member');
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyInvite = () => {
    navigator.clipboard.writeText('https://ramp.dev/invite/abc123').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Group by role for section headers
  const ownerCount  = members.filter((m) => m.role === 'owner').length;
  const adminCount  = members.filter((m) => m.role === 'admin').length;
  const memberCount = members.filter((m) => m.role === 'member').length;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Team</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage members, roles, and repository access.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0">
                <Plus className="h-3.5 w-3.5" />
                Invite member
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-base">Invite a team member</DialogTitle>
                <DialogDescription className="text-sm">
                  They'll receive an email to join your Ramp workspace.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Role</Label>
                  <RolePicker value={inviteRole} onChange={setInviteRole} />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">or share a link</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value="https://ramp.dev/invite/abc123"
                    className="font-mono text-xs h-9 text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleCopyInvite}
                    aria-label="Copy invite link"
                  >
                    {copied
                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!inviteEmail}
                >
                  Send invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard label="Total" value={members.length} sub="active members" />
          <StatCard label="Owners" value={ownerCount} />
          <StatCard label="Admins" value={adminCount} />
          <StatCard label="Members" value={memberCount} />
        </div>

        {/* ── Search + count ── */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredMembers.length} of {members.length}
          </span>
        </div>

        {/* ── Member list ── */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">

          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Users className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No members match your search.</p>
            </div>
          ) : (
            filteredMembers.map((member, i) => {
              const { icon: RoleIcon, className: roleCls } = ROLE_CONFIG[member.role];
              const isLast = i === filteredMembers.length - 1;

              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group',
                    !isLast && 'border-b border-border/50'
                  )}
                >
                  {/* Avatar */}
                  <Avatar member={member} />

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground leading-snug">
                        {member.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-medium px-1.5 py-0 h-5 gap-1 rounded-md border capitalize', roleCls)}
                      >
                        <RoleIcon className="h-2.5 w-2.5" />
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px]">{member.email}</span>
                      </span>
                      <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                      <span className="hidden sm:inline">Joined {formatDate(member.joinedAt)}</span>
                    </div>
                  </div>

                  {/* Repos pill — md+ */}
                  <div className="hidden md:flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 shrink-0">
                    <GitFork className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {member.repositories.length} {member.repositories.length === 1 ? 'repo' : 'repos'}
                    </span>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                        aria-label="Member actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit role
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Resend invite
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer note ── */}
        {members.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-5">
            {members.length} member{members.length !== 1 ? 's' : ''} total
            {' · '}
            <button className="underline underline-offset-2 hover:text-foreground transition-colors">
              View audit log
            </button>
          </p>
        )}
      </div>
    </div>
  );
}