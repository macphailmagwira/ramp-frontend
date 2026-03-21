import { useState, useEffect } from 'react';
import type { Repository, AnalysisStep } from '@/types';
// Repository analysis page
import { cn } from '@/lib/utils';
import {
  Check,
  Loader2,
  FileCode,
  GitGraph,
  Boxes,
  Network,
  BookOpen,
  Zap,
} from 'lucide-react';

interface RepositoryAnalysisPageProps {
  repository: Repository;
  onComplete: () => void;
}

const analysisSteps: AnalysisStep[] = [
  {
    id: '1',
    name: 'Reading repository structure',
    description: 'Scanning files and directories',
    status: 'pending',
    progress: 0,
  },
  {
    id: '2',
    name: 'Mapping dependencies',
    description: 'Analyzing import relationships',
    status: 'pending',
    progress: 0,
  },
  {
    id: '3',
    name: 'Detecting services',
    description: 'Identifying microservices and modules',
    status: 'pending',
    progress: 0,
  },
  {
    id: '4',
    name: 'Generating architecture model',
    description: 'Building system diagram',
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

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  '1': FileCode,
  '2': GitGraph,
  '3': Boxes,
  '4': Network,
  '5': BookOpen,
};

export function RepositoryAnalysisPage({ repository, onComplete }: RepositoryAnalysisPageProps) {
  const [steps, setSteps] = useState<AnalysisStep[]>(analysisSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        const currentStep = newSteps[currentStepIndex];

        if (currentStep) {
          if (currentStep.status === 'pending') {
            currentStep.status = 'in_progress';
          } else if (currentStep.status === 'in_progress') {
            currentStep.progress += Math.random() * 15;

            if (currentStep.progress >= 100) {
              currentStep.progress = 100;
              currentStep.status = 'completed';

              if (currentStepIndex < newSteps.length - 1) {
                setCurrentStepIndex((prev) => prev + 1);
              }
            }
          }
        }

        // Calculate overall progress
        const totalProgress = newSteps.reduce((sum, step) => {
          if (step.status === 'completed') return sum + 100;
          if (step.status === 'in_progress') return sum + step.progress;
          return sum;
        }, 0);
        setOverallProgress(totalProgress / newSteps.length);

        return newSteps;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [currentStepIndex]);

  // Auto-complete when all steps are done
  useEffect(() => {
    if (overallProgress >= 100) {
      const timeout = setTimeout(onComplete, 800);
      return () => clearTimeout(timeout);
    }
  }, [overallProgress, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ramp-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-ramp-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ramp-blue/10 mb-6">
            <Zap className="h-8 w-8 text-ramp-blue" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">
            Analyzing repository
          </h1>
          <p className="text-muted-foreground">
            {repository.fullName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-ramp-blue transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.id];
            const isActive = index === currentStepIndex;
            const isCompleted = step.status === 'completed';

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all duration-300',
                  isActive && 'border-ramp-blue/50 bg-ramp-blue/5',
                  isCompleted && 'border-green-500/30 bg-green-500/5',
                  !isActive && !isCompleted && 'border-border bg-card'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                    isActive && 'bg-ramp-blue/10',
                    isCompleted && 'bg-green-500/10',
                    !isActive && !isCompleted && 'bg-muted'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 text-ramp-blue animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        isActive && 'text-ramp-blue',
                        isCompleted && 'text-green-500'
                      )}
                    >
                      {step.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>

                {/* Progress */}
                {isActive && (
                  <div className="w-16">
                    <div className="text-right text-sm font-medium text-ramp-blue">
                      {Math.round(step.progress)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          This may take a few minutes for large repositories
        </p>
      </div>
    </div>
  );
}
