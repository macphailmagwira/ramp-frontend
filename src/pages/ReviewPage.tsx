import { GitPullRequest } from 'lucide-react';

export function ReviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8 sm:px-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <GitPullRequest className="h-6 w-6 text-foreground/70" />
          Review
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pull requests across your connected repositories.
        </p>
      </div>

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-center">
        <GitPullRequest className="h-8 w-8 text-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          No pull requests to review yet.
        </p>
      </div>
    </div>
  );
}
