import { AlertTriangle, ChevronDown } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function ErrorsBlock({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>We hit a problem building this guide</AlertTitle>
      <AlertDescription>
        {errors.map((e, i) => (
          <span key={i} className="block">
            {e}
          </span>
        ))}
      </AlertDescription>
    </Alert>
  )
}

export function WarningsBlock({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <Collapsible
      defaultOpen={warnings.length <= 3}
      className="overflow-hidden rounded-xl border border-amber-400/60 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-5 py-4 text-left outline-none">
        <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-medium">Warnings</span>
        <Badge
          variant="outline"
          className="border-amber-400/60 text-amber-700 dark:text-amber-300"
        >
          {warnings.length}
        </Badge>
        <ChevronDown className="ml-auto size-4 shrink-0 text-amber-600 transition-transform duration-200 group-data-[state=open]:rotate-180 dark:text-amber-400" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-amber-400/25">
        <ul className="divide-y divide-amber-400/20 px-5">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2.5 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {i + 1}
              </span>
              <span className="text-sm text-amber-900/90 dark:text-amber-100/80">{w}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
