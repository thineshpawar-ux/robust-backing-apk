import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  connected: boolean;
  activeView: 'team' | 'hod' | 'roles';
  onViewChange: (view: 'team' | 'hod' | 'roles') => void;
  userEmail?: string;
  currentUser?: string;
  onSignOut: () => void;
  isHOD?: boolean;
}

export function Header({ connected, activeView, onViewChange, userEmail, currentUser, onSignOut, isHOD }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="font-semibold text-base">
        Supplier Quality To-Do List
        <span className="block text-xs text-muted-foreground font-normal mt-0.5">
          One team view and one HOD summary. Zero excuses.
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {userEmail && (
          <span className="text-xs text-muted-foreground hidden sm:inline capitalize font-medium">
            {userEmail.split('@')[0]} {isHOD && '(HOD)'}
          </span>
        )}
        
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
          {isHOD && (
            <button
              type="button"
              onClick={() => onViewChange('roles')}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1",
                activeView === 'roles' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              Roles
            </button>
          )}
        </div>

        {currentUser && (
          <NotificationBell userId={currentUser} />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="rounded-full h-8 gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
