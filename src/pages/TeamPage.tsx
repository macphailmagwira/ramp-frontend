import { useState } from 'react';
import type { TeamMember } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
// Team page component
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
} from 'lucide-react';

interface TeamPageProps {
  members: TeamMember[];
}

const roleIcons: Record<TeamMember['role'], React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleColors: Record<TeamMember['role'], string> = {
  owner: 'bg-yellow-500/10 text-yellow-500',
  admin: 'bg-ramp-blue/10 text-ramp-blue',
  member: 'bg-muted text-muted-foreground',
};

export function TeamPage({ members }: TeamPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('member');
  const [copied, setCopied] = useState(false);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyInvite = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2 mb-2">
            <Users className="h-7 w-7 text-muted-foreground" />
            Team
          </h1>
          <p className="text-muted-foreground">
            Manage team members and their repository access
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-ramp-blue hover:bg-ramp-blue-dark text-white gap-2">
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team on Ramp.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['member', 'admin', 'owner'] as const).map((role) => (
                    <button
                      key={role}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        inviteRole === role
                          ? 'border-ramp-blue bg-ramp-blue/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                      onClick={() => setInviteRole(role)}
                    >
                      <div className="font-medium capitalize text-sm">{role}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {role === 'owner'
                          ? 'Full access'
                          : role === 'admin'
                          ? 'Manage team'
                          : 'View only'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Or share invite link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value="https://ramp.dev/invite/abc123"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInvite}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                className="w-full bg-ramp-blue hover:bg-ramp-blue-dark text-white"
                disabled={!inviteEmail}
              >
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Members', value: members.length },
          { label: 'Owners', value: members.filter((m) => m.role === 'owner').length },
          { label: 'Admins', value: members.filter((m) => m.role === 'admin').length },
          { label: 'Members', value: members.filter((m) => m.role === 'member').length },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Members list */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Team Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => {
              const RoleIcon = roleIcons[member.role];
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-12 h-12 rounded-full"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs capitalize', roleColors[member.role])}
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      <span>•</span>
                      <span>Joined {formatDate(member.joinedAt)}</span>
                    </div>
                  </div>

                  {/* Repositories */}
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {member.repositories.length} repositories
                    </span>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Invite
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
