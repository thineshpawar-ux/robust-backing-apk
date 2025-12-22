import { useState } from 'react';
import { Header } from '@/components/Header';
import { TeamView } from '@/components/TeamView';
import { HODDashboard } from '@/components/HODDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeView, setActiveView] = useState<'team' | 'hod'>('team');
  const { tasks, loading, connected, addTask, updateTask, deleteTask, toggleStatus } = useTasks();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Signed out',
        description: 'You have been logged out successfully.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4 max-w-[1100px]">
        <Header 
          connected={connected}
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user?.email}
          onSignOut={handleSignOut}
        />

        <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_1.3fr] gap-4">
          {activeView === 'team' ? (
            <div className="lg:col-span-2">
              <TeamView
                tasks={tasks}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onToggleStatus={toggleStatus}
              />
            </div>
          ) : (
            <div className="lg:col-span-2">
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">HOD dashboard</CardTitle>
                  <CardDescription>Short IBCS-style summary: volume, execution, slippage, behaviour.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HODDashboard tasks={tasks} />
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {loading && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-sm text-muted-foreground">Loading tasks...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
