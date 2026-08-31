import { useState, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import type { Repository, AnalysisStep } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Check,
  Loader2,
  FileCode,
  GitGraph,
  Boxes,
  Network,
  BookOpen,
  Zap,
  AlertCircle,
  type LucideProps,
} from 'lucide-react';

interface RepositoryAnalysisPageProps {
  repository: Repository;
  repoId: string;
  onComplete: () => void;
}

const analysisSteps: AnalysisStep[] = [
  {
    id: '1',
    name: 'Cloning repository',
    description: 'Fetching source code from GitHub',
    status: 'pending',
    progress: 0,
  },
  {
    id: '2',
    name: 'Reading repository structure',
    description: 'Scanning files and directories',
    status: 'pending',
    progress: 0,
  },
  {
    id: '3',
    name: 'Mapping dependencies',
    description: 'Analyzing import relationships',
    status: 'pending',
    progress: 0,
  },
  {
    id: '4',
    name: 'Detecting services',
    description: 'Identifying microservices and modules',
    status: 'pending',
    progress: 0,
  },
  {
    id: '5',
    name: 'Creating documentation',
    description: 'Generating storybook and flows',
    status: 'pending',
    progress: 0,
  },
];

const stepIcons: Record<string, ComponentType<LucideProps>> = {
  '1': FileCode,
  '2': GitGraph,
  '3': Boxes,
  '4': Network,
  '5': BookOpen,
};

const statusToStepIndex: Record<string, number> = {
  pending: 0,
  cloning: 0,
  indexing_files: 1,
  mapping_deps: 2,
  extracting_symbols: 3,
  building_call_graph: 3,
  generating_docs: 4,
  complete: 4,
  failed: -1,
};

export function RepositoryAnalysisPage({ repository, repoId, onComplete }: RepositoryAnalysisPageProps) {
  const [steps, setSteps] = useState<AnalysisStep[]>(analysisSteps);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await api.scan.getStatus(repoId);
        const stepIdx = statusToStepIndex[data.status] ?? 0;

        if (data.status === 'failed') {
          setError('Scan failed. Please try again.');
          return;
        }

        setSteps((prev) =>
          prev.map((step) => {
            const numIdx = parseInt(step.id, 10) - 1;
            if (numIdx < stepIdx) {
              return { ...step, status: 'completed', progress: 100 };
            }
            if (numIdx === stepIdx) {
              return { ...step, status: 'in_progress', progress: data.progress };
            }
            return { ...step, status: 'pending', progress: 0 };
          })
        );

        setOverallProgress(data.progress);

        if (data.status === 'complete' && !completedRef.current) {
          completedRef.current = true;
          setTimeout(onComplete, 800);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [repoId, onComplete]);

  const currentStepIndex = steps.findIndex((s) => s.status === 'in_progress');
  const activeIdx = currentStepIndex >= 0 ? currentStepIndex : steps.length - 1;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="relative w-full max-w-xl text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2 tracking-tight">Scan failed</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Button
            className="bg-ramp-blue text-white hover:bg-ramp-blue-dark shadow-sm hover:shadow-glow-sm"
            onClick={onComplete}
          >
            Go to overview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ramp-blue/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-ramp-blue/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-xl animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ramp-blue shadow-glow mb-6">
            <Zap className="h-8 w-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2 tracking-tight">
            Analyzing repository
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {repository.fullName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-medium text-foreground">Overall progress</span>
            <span className="text-[13px] text-muted-foreground tabular-nums font-mono">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress
            value={overallProgress}
            className="bg-muted [&_[data-slot=progress-indicator]]:bg-ramp-blue"
          />
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.id];
            const isActive = index === activeIdx;
            const isCompleted = step.status === 'completed';

            return (
              <Card
                key={step.id}
                className={cn(
                  '!p-0 rounded-xl border transition-all duration-300',
                  isActive && 'border-ramp-blue/40 bg-ramp-blue/[0.06] shadow-glow-sm',
                  isCompleted && 'border-emerald-500/25 bg-emerald-500/[0.04]',
                  !isActive && !isCompleted && 'border-border/70 bg-card/60'
                )}
              >
                <CardContent className="!p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg transition-colors shrink-0',
                        isActive && 'bg-ramp-blue/10 border border-ramp-blue/20',
                        isCompleted && 'bg-emerald-500/10 border border-emerald-500/20',
                        !isActive && !isCompleted && 'bg-muted/60 border border-border/50'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 text-ramp-blue animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-muted-foreground/70" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium text-[14px]',
                            isActive && 'text-ramp-blue',
                            isCompleted && 'text-emerald-600 dark:text-emerald-400',
                            !isActive && !isCompleted && 'text-foreground'
                          )}
                        >
                          {step.name}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground">{step.description}</p>
                    </div>

                    {/* Progress */}
                    {isActive && (
                      <div className="w-16 shrink-0">
                        <div className="text-right text-[13px] font-semibold text-ramp-blue tabular-nums">
                          {Math.round(step.progress)}%
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-[13px] text-muted-foreground/80 mt-8">
          This may take a few minutes for large repositories
        </p>
      </div>
    </div>
  );
}
