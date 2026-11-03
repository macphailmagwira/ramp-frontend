import * as React from "react"
import { AlertTriangle, Check, ChevronDown, Copy, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { StorybookSetUp, StorybookSetupStep, StorybookRunOption } from "@/types"

const RELIABILITY_DOT = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-rose-500" } as const

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: do nothing */
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy command: ${text}`}
      className="shrink-0 text-zinc-100 hover:bg-zinc-800 hover:text-white"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

function StepCard({ step, index }: { step: StorybookSetupStep; index: number }) {
  const needsReview = step.command !== "" && !step.verified
  return (
    <Card className={cn(needsReview && "border-amber-400 dark:border-amber-500/60")}>
      <CardContent className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {index + 1}
        </span>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{step.title}</h3>
            <Badge variant="secondary">{step.phase}</Badge>
          </div>
          {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
          {step.command && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-950 py-0.5 pl-3 pr-1 font-mono text-sm text-zinc-50">
              <code className="overflow-x-auto whitespace-nowrap py-2">{step.command}</code>
              <CopyButton text={step.command} />
            </div>
          )}
          {step.command && step.verified && (
            <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <Check className="size-4" /> Verified in {step.source_file || "the repo"}
            </p>
          )}
          {needsReview && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" /> Not found in any file. Check it before you run it.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function OptionPanel({ option }: { option: StorybookRunOption }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {option.best_for && <p className="text-sm text-muted-foreground">Best for: {option.best_for}</p>}
        {option.requires.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">You need</span>
            {option.requires.map((r) => (
              <Badge key={r} variant="outline">{r}</Badge>
            ))}
          </div>
        )}
      </div>
      {option.steps.map((step, i) => (
        <StepCard key={`${step.title}-${i}`} step={step} index={i} />
      ))}
    </div>
  )
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

type Props = {
  section: StorybookSetUp
  onRegenerate?: () => void
  regenerating?: boolean
  errors?: string[]
}

export function SetupStep({ section, onRegenerate, regenerating = false, errors = [] }: Props) {
  const [showAllEnv, setShowAllEnv] = React.useState(false)
  const unverified = section.run_options.flatMap((o) => o.steps).filter((s) => s.command && !s.verified).length
  const envVars = showAllEnv ? section.env_vars : section.env_vars.slice(0, 6)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Set up</h1>
          <p className="max-w-prose text-muted-foreground">
            {section.summary || "How do I get this project running?"}
          </p>
        </div>
        {onRegenerate && (
          <Button variant="outline" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={cn(regenerating && "motion-safe:animate-spin")} /> Regenerate
          </Button>
        )}
      </header>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>We hit a problem building this guide</AlertTitle>
          <AlertDescription>
            {errors.map((e, i) => (
              <span key={i} className="block">{e}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state: the model produced nothing usable. */}
      {section.run_options.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>We could not find a way to run this project</AlertTitle>
          <AlertDescription>
            Regenerate this step. If it keeps failing, check that the repo has a compose file, Makefile or manifest.
          </AlertDescription>
        </Alert>
      )}

      {unverified > 0 && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>{unverified} {unverified === 1 ? "command needs" : "commands need"} review</AlertTitle>
          <AlertDescription>We could not match them to a file in the repo. They are marked below.</AlertDescription>
        </Alert>
      )}

      {section.warnings.length > 0 && (
        <Collapsible
          defaultOpen={section.warnings.length <= 3}
          className="overflow-hidden rounded-xl border border-amber-400/60 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5"
        >
          <CollapsibleTrigger className="group flex w-full items-center gap-2 px-5 py-4 text-left outline-none">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">Warnings</span>
            <Badge
              variant="outline"
              className="border-amber-400/60 text-amber-700 dark:text-amber-300"
            >
              {section.warnings.length}
            </Badge>
            <ChevronDown className="ml-auto size-4 shrink-0 text-amber-600 transition-transform duration-200 group-data-[state=open]:rotate-180 dark:text-amber-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-amber-400/25">
            <ul className="divide-y divide-amber-400/20 px-5">
              {section.warnings.map((w, i) => (
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
      )}

      {section.run_options.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Run options come ordered most reliable first, so the first tab is the default. */}
          <Tabs defaultValue="0" className="min-w-0 gap-4">
            <TabsList className="grid h-auto w-full grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3 bg-transparent p-0">
              {section.run_options.map((o, i) => (
                <TabsTrigger
                  key={`${o.name}-${i}`}
                  value={String(i)}
                  className={cn(
                    "group h-auto flex-col items-start justify-start gap-2 whitespace-normal rounded-lg border-2 border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-none transition-colors",
                    "hover:border-primary/50 hover:bg-accent/50",
                    "data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm",
                    "dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/20"
                  )}
                >
                  <span className="flex w-full items-start gap-2.5">
                    {/* radio-style indicator: empty ring when idle, filled check when selected */}
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/50 group-data-[state=active]:border-primary group-data-[state=active]:bg-primary"
                    >
                      <Check className="size-3 text-primary-foreground opacity-0 group-data-[state=active]:opacity-100" />
                    </span>
                    <span className="min-w-0 break-words leading-snug">{o.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 pl-[26px] text-xs font-normal text-muted-foreground group-data-[state=active]:text-foreground/80">
                    <span className={cn("size-2 rounded-full", RELIABILITY_DOT[o.reliability])} aria-hidden />
                    <span className="capitalize">{o.reliability} reliability</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {section.run_options.map((o, i) => (
              <TabsContent key={`${o.name}-${i}`} value={String(i)} className="mt-2">
                <OptionPanel option={o} />
              </TabsContent>
            ))}
          </Tabs>

          <aside className="space-y-4">
            {section.env_vars.length > 0 && (
              <SideCard title="Environment variables">
                <dl className="space-y-3 text-sm">
                  {envVars.map((v) => (
                    <div key={v.name}>
                      <dt className="text-xs font-medium">{v.name}</dt>
                      <dd className="text-muted-foreground">{v.purpose}</dd>
                    </div>
                  ))}
                </dl>
                {section.env_vars.length > 6 && (
                  <Button variant="link" size="sm" className="mt-2 h-auto p-0" onClick={() => setShowAllEnv((v) => !v)}>
                    {showAllEnv ? "Show fewer" : `Show all ${section.env_vars.length}`}
                  </Button>
                )}
              </SideCard>
            )}
            {section.services.length > 0 && (
              <SideCard title="Services">
                <div className="flex flex-wrap gap-1.5">
                  {section.services.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </SideCard>
            )}
            {section.files_guide.length > 0 && (
              <SideCard title="Which file is for what">
                <dl className="space-y-3 text-sm">
                  {section.files_guide.map((f) => (
                    <div key={f.file}>
                      <dt className="break-all text-xs font-medium">{f.file}</dt>
                      <dd className="text-muted-foreground">{f.purpose}</dd>
                    </div>
                  ))}
                </dl>
              </SideCard>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}