import { useQuery } from '@tanstack/react-query';
import WorkflowEnhancements from '../components/WorkflowEnhancements';
import KanbanBoard from '../components/KanbanBoard';
import CompletionStats from '../components/CompletionStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Zap, Kanban, Trophy } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

export default function Workflow() {
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Production Workflow</h1>
        <p className="text-muted-foreground">
          Manage your frame shop production with enhanced workflow tools and kanban board
        </p>
      </div>

      <Tabs defaultValue="kanban" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Team Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-6">
          <KanbanBoard />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <WorkflowEnhancements orders={orders} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <CompletionStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}