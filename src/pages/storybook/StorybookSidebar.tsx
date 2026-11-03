import * as React from "react"
import { AlertTriangle, BookOpen, Check, Loader2, Lock, PanelLeftClose, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { StorybookStepStatus, StorybookStep } from "@/types"

// One entry per status: the icon, the colour of its round node, and its label.
const STATUS: Record<StorybookStepStatus, { icon: LucideIcon; node: string; text: string; label: string; spin?: boolean }> = {
  ready: { icon: Check, node: "bg-sidebar-primary text-sidebar-primary-foreground", text: "text-sidebar-foreground/70", label: "Ready" },
  generating: { icon: Loader2, node: "border border-sidebar-border text-sidebar-foreground", text: "text-sidebar-foreground/70", label: "Generating", spin: true },
  failed: { icon: AlertTriangle, node: "bg-destructive/15 text-destructive", text: "text-destructive", label: "Failed, retry" },
  locked: { icon: Lock, node: "bg-sidebar-accent text-muted-foreground", text: "text-muted-foreground", label: "Locked" },
}

type Props = React.HTMLAttributes<HTMLDivElement> & {
  project: { name: string; tags?: string[] }
  steps: StorybookStep[]
  activeId: string
  onStepSelect: (id: string) => void
  savedFile?: string
  onCollapse?: () => void
}

export function StorybookSidebar({ project, steps, activeId, onStepSelect, savedFile, onCollapse, className, ...props }: Props) {
  const ready = steps.filter((s) => s.status === "ready").length

  return (
    <div
      className={cn(
        "flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground font-sans",
        className
      )}
      {...props}
    >
      <SidebarHeader>
        <div className="flex items-start justify-between gap-2">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Storybooks</span>
                  <span className="truncate text-xs text-sidebar-foreground/70"></span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Collapse sidebar"
              onClick={onCollapse}
              className="mt-0.5 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Project card + progress. */}
        <SidebarGroup>
          <div className="space-y-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 p-2.5">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-tight">{project.name}</p>
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-sidebar-foreground/70">Progress</span>
                <span className="font-medium">{ready} of {steps.length} ready</span>
              </div>
              <Progress value={steps.length ? (ready / steps.length) * 100 : 0} className="h-1" aria-label="Steps ready" />
            </div>
          </div>
        </SidebarGroup>

        {/* The steps. A connector line joins the round nodes; it is teal-filled after a finished step. */}
        <SidebarGroup>
          <SidebarGroupLabel>Steps</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {steps.map((step, i) => {
                const s = STATUS[step.status]
                const Icon = s.icon
                const last = i === steps.length - 1
                return (
                  <SidebarMenuItem
                    key={step.id}
                    className={cn(
                      "relative",
                      !last && "after:absolute after:left-[21px] after:top-[38px] after:h-6 after:w-px after:bg-sidebar-border",
                      !last && step.status === "ready" && "after:bg-sidebar-primary"
                    )}
                  >
                    <SidebarMenuButton
                      size="lg"
                      isActive={step.id === activeId}
                      aria-current={step.id === activeId ? "step" : undefined}
                      tooltip={`${step.title}: ${s.label}`}
                      onClick={() => onStepSelect(step.id)}
                    >
                      <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full", s.node)}>
                        <Icon className={cn("size-3.5", s.spin && "motion-safe:animate-spin")} />
                      </span>
                      <span className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-medium">{step.title}</span>
                        <span className={cn("truncate text-xs font-normal", s.text)}>{step.detail ?? s.label}</span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        {savedFile && (
          <p className="px-2 text-xs text-sidebar-foreground/70">
            Saved as <span className="block break-all font-mono text-sidebar-foreground">{savedFile}</span>
          </p>
        )}
      </SidebarFooter>
    </div>
  )
}
