import { useState } from 'react';
import type { StorybookTopic } from '@/types';
import { mockStorybookTopics } from '@/data/mock';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  ChevronRight,
  FileCode,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export function StorybookPage() {
  const [topics] = useState<StorybookTopic[]>(mockStorybookTopics);
  const [selectedTopic, setSelectedTopic] = useState<StorybookTopic>(mockStorybookTopics[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h3 key={i} className="font-semibold text-lg mt-6 mb-3">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="ml-4 text-muted-foreground">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <li key={i} className="ml-4 text-muted-foreground">
            {line.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={i} className="h-4" />;
      }
      return (
        <p key={i} className="text-muted-foreground leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="h-full flex">
      {/* Left sidebar - Topics */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Storybook
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all duration-200',
                  selectedTopic.id === topic.id
                    ? 'bg-ramp-blue/10 text-ramp-blue'
                    : 'hover:bg-muted text-foreground'
                )}
                onClick={() => setSelectedTopic(topic)}
              >
                <div className="font-medium text-sm">{topic.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {topic.description}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right content - Topic details */}
      <div className="flex-1 flex flex-col bg-background">
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <span>Storybook</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedTopic.title}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <Badge variant="secondary" className="mb-3">
                Documentation
              </Badge>
              <h1 className="font-heading text-4xl font-bold mb-3">
                {selectedTopic.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {selectedTopic.description}
              </p>
            </div>

            <Separator className="my-8" />

            {/* Content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {formatContent(selectedTopic.content)}
            </div>

            <Separator className="my-8" />

            {/* Related files */}
            {selectedTopic.files.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Related Files
                </h3>
                <div className="grid gap-2">
                  {selectedTopic.files.map((file, i) => (
                    <Card
                      key={i}
                      className="cursor-pointer hover:border-ramp-blue/50 transition-colors"
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm flex-1">{file}</code>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Related topics */}
            {selectedTopic.relatedTopics.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTopic.relatedTopics.map((topicId) => {
                    const topic = topics.find((t) => t.id === topicId);
                    if (!topic) return null;
                    return (
                      <Button
                        key={topicId}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTopic(topic)}
                      >
                        {topic.title}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
