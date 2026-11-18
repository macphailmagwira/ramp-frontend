import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
  accent?: string;
}

export function ComingSoonPage({
  title,
  description,
  icon: Icon,
  bullets = [],
  accent = 'bg-primary/10 text-primary',
}: ComingSoonPageProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl border border-dashed border-border px-8 py-14 text-center">
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', accent)}>
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <Badge
          variant="secondary"
          className="mt-5 rounded-full bg-foreground/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-foreground/55"
        >
          Coming soon
        </Badge>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {bullets.length > 0 && (
          <ul className="mt-6 w-full space-y-2.5 border-t border-border/60 pt-6 text-left">
            {bullets.map(bullet => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground/75">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
