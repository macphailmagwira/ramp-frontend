import type { Repository } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  Star,
  FileCode,
  Boxes,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  Network,
  BookOpen,
  Workflow,
} from 'lucide-react';

interface OverviewPageProps {
  repository: Repository;
}

const recentChanges = [
  { id: '1', message: 'Refactor authentication middleware', author: 'Sarah Chen', time: '2 hours ago', type: 'feat' },
  { id: '2', message: 'Fix payment webhook handler', author: 'Marcus Johnson', time: '5 hours ago', type: 'fix' },
  { id: '3', message: 'Update user profile schema', author: 'Emily Rodriguez', time: '1 day ago', type: 'feat' },
  { id: '4', message: 'Add rate limiting to API', author: 'David Kim', time: '2 days ago', type: 'feat' },
  { id: '5', message: 'Fix memory leak in worker', author: 'Sarah Chen', time: '3 days ago', type: 'fix' },
];

const serviceHealth = [
  { name: 'API Gateway', status: 'healthy', latency: '45ms', uptime: '99.9%' },
  { name: 'Auth Service', status: 'healthy', latency: '32ms', uptime: '99.8%' },
  { name: 'Payment Service', status: 'warning', latency: '120ms', uptime: '98.5%' },
  { name: 'Notification Service', status: 'healthy', latency: '28ms', uptime: '99.9%' },
];

const quickStats = [
  { label: 'Files', value: '1,247', icon: FileCode, change: '+12' },
  { label: 'Services', value: '8', icon: Boxes, change: '+1' },
  { label: 'Dependencies', value: '156', icon: Network, change: '+5' },
  { label: 'Test Coverage', value: '87%', icon: CheckCircle, change: '+3%' },
];

export function OverviewPage({ repository }: OverviewPageProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-heading text-3xl font-bold">Overview</h1>
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            Live
          </Badge>
        </div>
        <p className="text-muted-foreground">
          High-level summary of {repository.fullName}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ramp-blue/10">
                  <stat.icon className="h-4 w-4 text-ramp-blue" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500">{stat.change}</span>
                <span className="text-xs text-muted-foreground">this week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Repository info */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              Repository Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="font-medium">{repository.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Primary Language</p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        repository.language === 'TypeScript'
                          ? '#3178c6'
                          : repository.language === 'Python'
                          ? '#3776ab'
                          : repository.language === 'Go'
                          ? '#00add8'
                          : repository.language === 'Rust'
                          ? '#dea584'
                          : '#6b7280',
                    }}
                  />
                  <span className="font-medium">{repository.language}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Stars</p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{repository.stars}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Forks</p>
                <p className="font-medium">{repository.forks}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="font-medium">{repository.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDate(repository.updatedAt)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Analysis Status</p>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Up to date
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Health */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.latency}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{service.uptime}</span>
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        service.status === 'healthy'
                          ? 'bg-green-500'
                          : service.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Changes */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Recent Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      change.type === 'feat'
                        ? 'bg-ramp-blue/10 text-ramp-blue'
                        : 'bg-green-500/10 text-green-500'
                    )}
                  >
                    {change.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{change.message}</p>
                    <p className="text-xs text-muted-foreground">
                      by {change.author} • {change.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'View Architecture', icon: Network, description: 'Explore system diagram' },
                { label: 'Read Storybook', icon: BookOpen, description: 'Learn the codebase' },
                { label: 'Trace Flows', icon: Workflow, description: 'Follow feature paths' },
              ].map((action, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ramp-blue/10">
                    <action.icon className="h-4 w-4 text-ramp-blue" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
