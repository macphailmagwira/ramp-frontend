import type { LucideIcon } from 'lucide-react';
import {
  GitPullRequest,
  GitCommit,
  Code2,
  FlaskConical,
  FileText,
  Rocket,
} from 'lucide-react';

export interface AgentTokenUsage {
  /** Approximate tokens consumed each time the agent runs. */
  perRun: string;
  /** Rough monthly token spend at typical usage. */
  monthly: string;
  /** Short billing/usage note shown under the stats. */
  note: string;
}

export interface AgentCatalogItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** One-line pitch shown next to the name. */
  tagline: string;
  /** Longer paragraph describing the agent. */
  description: string;
  /** Explain the mechanics in a sentence or two. */
  howItWorks: string;
  /** Concrete outcomes the user can expect. */
  benefits: string[];
  /** What causes the agent to run. */
  triggers: string[];
  tokenUsage: AgentTokenUsage;
  /** Tailwind classes for the soft icon surface + glyph colour. */
  accent: string;
}

export const AVAILABLE_AGENTS: AgentCatalogItem[] = [
  {
    id: 'pr',
    label: 'PR Agent',
    icon: GitPullRequest,
    tagline: 'Reviews and summarizes every pull request.',
    description:
      'An autonomous reviewer that reads the full diff, leaves inline comments on risky changes, runs a quick checklist, and writes a plain-language summary so maintainers can merge with confidence.',
    howItWorks:
      'When a pull request is opened or updated, the agent pulls the diff and related context, runs heuristic and model-based checks, and posts a structured review. It learns your repo conventions over time and stays quiet when everything looks good.',
    benefits: [
      'Catch bugs and regressions before humans review',
      'Auto-generated PR summaries for faster sign-off',
      'Consistent style and convention enforcement',
    ],
    triggers: ['Pull request opened', 'Pull request updated', 'Review requested'],
    tokenUsage: {
      perRun: '~6K tokens',
      monthly: '~90K tokens',
      note: 'Billed only when a pull request changes.',
    },
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'commit',
    label: 'Commit Agent',
    icon: GitCommit,
    tagline: 'Writes clear, conventional commit messages.',
    description:
      'Turns a messy working tree into a tidy, atomic set of commits with conventional, human-readable messages — so your history stays reviewable and your changelog writes itself.',
    howItWorks:
      'The agent groups related changes, infers intent from the diff, and proposes conventional-commit messages (feat, fix, refactor, …). You can accept, tweak, or regenerate each one before anything is committed.',
    benefits: [
      'Clean, searchable git history',
      'Conventional commits for automatic releases',
      'Less context-switching while you work',
    ],
    triggers: ['Stage changes', 'Request a commit', 'Before push'],
    tokenUsage: {
      perRun: '~2K tokens',
      monthly: '~40K tokens',
      note: 'Billed per commit you generate.',
    },
    accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'review',
    label: 'Code Review Agent',
    icon: Code2,
    tagline: 'Deep, line-by-line architecture review.',
    description:
      'Goes beyond style to reason about design, error handling, and maintainability. Flags coupling, missing tests, and subtle edge cases that quick checks miss.',
    howItWorks:
      'On demand or on a schedule, the agent reviews the changeset against the surrounding codebase, traces data flow, and returns prioritized findings with suggested fixes and links to relevant files.',
    benefits: [
      'Surfaces architectural risk early',
      'Actionable fixes, not just warnings',
      'Shared review standards across the team',
    ],
    triggers: ['Manual run', 'Nightly sweep', 'Large diff (>500 lines)'],
    tokenUsage: {
      perRun: '~12K tokens',
      monthly: '~150K tokens',
      note: 'Billed per review you trigger.',
    },
    accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    id: 'test',
    label: 'Test Agent',
    icon: FlaskConical,
    tagline: 'Generates tests for new and changed code.',
    description:
      'Keeps coverage honest by drafting unit and integration tests for untested paths, then running them to confirm they actually pass in your environment.',
    howItWorks:
      'The agent inspects changed functions, infers expected behavior, and writes tests that match your existing framework and patterns. It runs them, iterates on failures, and opens a PR with the green suite.',
    benefits: [
      'Higher coverage with no busywork',
      'Tests that match your style and stack',
      'Self-verifying output before review',
    ],
    triggers: ['Pull request opened', 'Manual run', 'Missing coverage'],
    tokenUsage: {
      perRun: '~9K tokens',
      monthly: '~120K tokens',
      note: 'Billed per generated test suite.',
    },
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'docs',
    label: 'Docs Agent',
    icon: FileText,
    tagline: 'Keeps documentation in sync with code.',
    description:
      'Watches for API and behavior changes and proposes documentation updates — READMEs, reference docs, and inline comments — so your docs never drift from reality.',
    howItWorks:
      'When code that is referenced by docs changes, the agent drafts the corresponding doc diff, links it to the source, and opens a reviewable update you can accept in one click.',
    benefits: [
      'Documentation that stays accurate',
      'Less manual doc maintenance',
      'Newcomer-friendly onboarding',
    ],
    triggers: ['Public API changed', 'README referenced', 'Manual run'],
    tokenUsage: {
      perRun: '~5K tokens',
      monthly: '~70K tokens',
      note: 'Billed when doc updates are proposed.',
    },
    accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'release',
    label: 'Release Agent',
    icon: Rocket,
    tagline: 'Automates changelogs and releases.',
    description:
      'Turns merged work into polished release notes and versioned tags, then coordinates the rollout so shipping is a button press instead of an afternoon.',
    howItWorks:
      'The agent collects merged changes since the last release, groups them by type, writes a human changelog, bumps the version, and prepares the release — with a dry-run preview you approve first.',
    benefits: [
      'Consistent, well-written changelogs',
      'Friction-free, repeatable releases',
      'Clear history for users and stakeholders',
    ],
    triggers: ['Version bump requested', 'Milestone reached', 'Manual run'],
    tokenUsage: {
      perRun: '~4K tokens',
      monthly: '~30K tokens',
      note: 'Billed per release you prepare.',
    },
    accent: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
];
