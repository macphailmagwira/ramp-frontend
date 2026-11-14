import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FlowsPanel } from "./LearnStep"
import { ErrorsBlock, WarningsBlock } from "./StepAlerts"
import type { StorybookFlow } from "@/types"

type Props = {
  flows: StorybookFlow[]
  repoId?: string | null
  onRegenerate?: () => void
  regenerating?: boolean
  errors?: string[]
  warnings?: string[]
}

export function FlowsStep({
  flows,
  repoId,
  onRegenerate,
  regenerating = false,
  errors = [],
  warnings = [],
}: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Flows and Features</h1>
          <p className="max-w-prose text-muted-foreground">
            Follow how a request or action moves through the code, end to end.
          </p>
        </div>
        {onRegenerate && (
          <Button variant="outline" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={cn(regenerating && "motion-safe:animate-spin")} /> Regenerate
          </Button>
        )}
      </header>

      <ErrorsBlock errors={errors} />
      {flows.length === 0 && warnings.length > 0 && <WarningsBlock warnings={warnings} />}

      <FlowsPanel flows={flows} repoId={repoId} warnings={warnings} />
    </div>
  )
}
