import { cn } from '@/lib/utils';

interface HeaderProps {
  connected: boolean;
  activeView: 'team' | 'hod';
  onViewChange: (view: 'team' | 'hod') => void;
}

export function Header({ connected, activeView, onViewChange }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="font-semibold text-base">
        Supplier Quality To-Do List
        <span className="block text-xs text-muted-foreground font-normal mt-0.5">
          One team view and one HOD summary. Zero excuses.
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span 
          className={cn(
            "text-xs border rounded-full px-2.5 py-1 transition-colors",
            connected 
              ? "border-success text-success bg-success/10" 
              : "border-destructive text-destructive bg-destructive/10"
          )}
        >
          {connected ? 'Cloud: connected' : 'Cloud: connecting...'}
        </span>
        
        <div className="inline-flex rounded-full border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('team')}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeView === 'team' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => onViewChange('hod')}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeView === 'hod' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            HOD
          </button>
        </div>
      </div>
    </header>
  );
}
