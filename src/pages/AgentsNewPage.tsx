import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, ArrowLeft } from 'lucide-react';

interface AgentsNewPageProps {
  onBack: () => void;
}

export function AgentsNewPage({ onBack }: AgentsNewPageProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.05]">
          <Bot className="h-5 w-5 text-foreground/60" />
        </div>
        <h1 className="text-xl font-semibold">Add a new agent</h1>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <Input
            value={name}
            placeholder="e.g. Release Agent"
            onChange={e => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Description</span>
          <Textarea
            value={description}
            placeholder="What should this agent do?"
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={onBack}>
            Create agent
          </Button>
        </div>
      </div>
    </div>
  );
}
