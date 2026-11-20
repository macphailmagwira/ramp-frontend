import { useCallback, useEffect, useState } from 'react';
import type { AccountMemberResponse, TeamMember, User } from '@/types';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { gradientFor, initialsOf } from '@/lib/avatar';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Mail,
  Shield,
  User as UserIcon,
  Crown,
  CalendarDays,
  UserRoundPlus,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface TeamPageProps {
  user: User | null;
  onLogout?: () => void;
}

type RoleFilter = 'all' | 'admin' | 'member';

const ROLE_CONFIG: Record<
  TeamMember['role'],
  {
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  owner: {
    icon: Crown,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  admin: {
    icon: Shield,
    className: 'bg-ramp-blue/10 text-ramp-blue border-ramp-blue/20',
  },
  member: {
    icon: UserIcon,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admins' },
  { value: 'member', label: 'Members' },
];

function Avatar({ member, className }: { member: TeamMember; className?: string }) {
  const [errored, setErrored] = useState(false);
  const initials = initialsOf(member.name);
  const seed = member.id || member.email || member.name || 'user';

  if (!member.avatar || errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white shrink-0',
          className
        )}
        style={{ background: gradientFor(seed) }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={member.avatar}
      alt={member.name}
      onError={() => setErrored(true)}
      className={cn('rounded-full object-cover shrink-0 ring-2 ring-border/40', className)}
    />
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MemberCard({
  member,
  isYou,
  canDelete,
  onDelete,
}: {
  member: TeamMember;
  isYou: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { icon: RoleIcon, className: roleCls } = ROLE_CONFIG[member.role];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ramp-blue/40 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-ramp-blue/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {canDelete && (
        <button
          type="button"
          aria-label={`Remove ${member.name}`}
          title="Remove member"
          onClick={onDelete}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      <div className="flex items-start gap-3.5">
        <Avatar member={member} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-sm text-foreground">{member.name}</p>
            {isYou && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                You
              </span>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'mt-1.5 h-5 gap-1 rounded-md px-1.5 text-[10px] font-medium capitalize',
              roleCls
            )}
          >
            <RoleIcon className="size-2.5" />
            {member.role}
          </Badge>
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0" />
          <span>Joined {formatDate(member.joinedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function toTeamMember(member: AccountMemberResponse): TeamMember {
  return {
    id: member.id,
    name: `${member.first_name} ${member.last_name}`.trim() || member.email,
    email: member.email,
    avatar: '',
    role: member.role === 'admin' ? 'admin' : 'member',
    joinedAt: member.created_at,
    repositories: [],
  };
}

export function TeamPage({ user, onLogout }: TeamPageProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.accountRole === 'admin';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.accounts.listMembers();
      setMembers(data.map(toTeamMember));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    api.accounts
      .getMe()
      .then((data) => setCompanyName(data.name))
      .catch(() => setCompanyName(''));
  }, []);

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && (m.role === 'admin' || m.role === 'owner')) ||
      (roleFilter === 'member' && m.role === 'member');
    return matchesSearch && matchesRole;
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setFormError('');
  };

  const closeDialog = () => {
    const addedMember = createdCredentials !== null;
    setDialogOpen(false);
    resetForm();
    setCreatedCredentials(null);
    setShowPassword(false);
    setCopied(false);
    if (addedMember) void loadMembers();
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    const { name, email: memberEmail, password: memberPassword } = createdCredentials;
    const text = `Name: ${name}\nEmail: ${memberEmail}\nTemporary password: ${memberPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy — select the details and copy them manually');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const created = await api.users.addMember({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      setCreatedCredentials({
        name: `${created.first_name} ${created.last_name}`.trim() || created.email,
        email: created.email,
        password,
      });
      setShowPassword(false);
      setCopied(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await api.users.remove(memberToDelete.id);
      toast.success(`${memberToDelete.name} was removed from the account`);
      setMemberToDelete(null);
      await loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
      setMemberToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.accounts.delete();
      onLogout?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteAccountOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-ramp-blue/[0.07] to-transparent">
        <div className="pointer-events-none absolute -top-28 right-1/4 size-80 rounded-full bg-ramp-blue/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-72 rounded-full bg-ramp-blue-light/20 blur-[100px]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-9 pt-10 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ramp-blue">
            <Users className="size-3.5" />
            {companyName || 'Company'}
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Team</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Every member can access all workspaces and repositories in{' '}
                {companyName || 'this account'}. Add or remove people to control account access.
              </p>
            </div>

            {isAdmin ? (
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (open) setDialogOpen(true);
                  else closeDialog();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <UserRoundPlus className="size-4" />
                    Add member
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[440px]">
                  {createdCredentials ? (
                    <>
                      <DialogHeader>
                        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                          <Check className="size-5" />
                        </div>
                        <DialogTitle className="text-base">Member added</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                          Share these sign-in details with{' '}
                          <span className="font-medium text-foreground">
                            {createdCredentials.name}
                          </span>
                          .
                        </DialogDescription>
                      </DialogHeader>

                      <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                          <span className="font-semibold">Copy these credentials now.</span> The
                          password is shown only once and cannot be recovered later.
                        </p>
                      </div>

                      <div className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-xs text-muted-foreground">Name</span>
                          <span className="truncate text-sm font-medium">
                            {createdCredentials.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-xs text-muted-foreground">Email</span>
                          <span className="truncate text-sm font-medium">
                            {createdCredentials.email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-xs text-muted-foreground">Password</span>
                          <div className="flex items-center gap-1.5">
                            <span className="max-w-[180px] truncate font-mono text-sm text-foreground">
                              {showPassword ? createdCredentials.password : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowPassword((v) => !v)}
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="mt-5 flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => void copyCredentials()}
                        >
                          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                          {copied ? 'Copied' : 'Copy credentials'}
                        </Button>
                        <Button type="button" onClick={closeDialog}>
                          Done
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-ramp-blue/10 text-ramp-blue ring-1 ring-inset ring-ramp-blue/20">
                          <UserRoundPlus className="size-5" />
                        </div>
                        <DialogTitle className="text-base">Add a team member</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                          They get access to all workspaces and repositories as soon as they are
                          added. No invitation email is sent, share their sign-in credentials with
                          them directly.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        {formError && (
                          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            {formError}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="first-name" className="text-sm font-medium">
                              First name
                            </Label>
                            <Input
                              id="first-name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="John"
                              className="h-9"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="last-name" className="text-sm font-medium">
                              Last name
                            </Label>
                            <Input
                              id="last-name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Smith"
                              className="h-9"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="member-email" className="text-sm font-medium">
                            Email address
                          </Label>
                          <Input
                            id="member-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="h-9"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="member-password" className="text-sm font-medium">
                            Temporary password
                          </Label>
                          <Input
                            id="member-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="h-9"
                            minLength={8}
                            required
                          />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={closeDialog}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={submitting || !email || password.length < 8}
                          >
                            {submitting ? 'Adding…' : 'Add member'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            ) : (
              <p className="shrink-0 self-center text-xs text-muted-foreground">
                Only account admins can add members.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="mb-5">
          <div className="mb-4 flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-foreground">Members</h2>
            <Badge variant="secondary" className="rounded-full px-2 text-[11px] tabular-nums">
              {members.length}
            </Badge>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-lg bg-muted/30 pl-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                {ROLE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setRoleFilter(filter.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                      roleFilter === filter.value
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {filteredMembers.length}/{members.length}
              </span>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card py-16 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadMembers()}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border/60 bg-muted/30"
              />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
              <Users className="size-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No members found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search or role filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isYou={member.email === user?.email}
                canDelete={isAdmin && member.email !== user?.email}
                onDelete={() => setMemberToDelete(member)}
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <section className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Deleting {companyName ? `“${companyName}”` : 'this account'} permanently removes
                    all members, connected repositories, workspaces, and documents. This cannot be
                    undone.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="gap-2 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteAccountOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete account
              </Button>
            </div>
          </section>
        )}
      </div>

      <AlertDialog
        open={memberToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to all workspaces and repositories in the account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteMember();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removing…' : 'Remove member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {companyName ? `“${companyName}”` : 'this account'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account and all of its data — members, connected
              repositories, workspaces, and documents. Everyone is signed out immediately. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteAccount();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
