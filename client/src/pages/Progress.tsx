import { Navigation } from '@/components/Navigation';
import GamifiedProgress from '@/components/GamifiedProgress';

export default function Progress() {
  return (
    <div className="p-6 space-y-6">
      <Navigation />
      
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-bold">Progress Tracking</h1>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Track your team's achievements, progress streaks, and completion rewards based on authentic order fulfillment data.
      </div>

      <GamifiedProgress />
    </div>
  );
}