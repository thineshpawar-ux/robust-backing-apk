import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TeamView } from '@/components/TeamView';
import { HODDashboard } from '@/components/HODDashboard';
import { RoleManagement } from '@/components/RoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeView, setActiveView] = useState<'team' | 'hod' | 'roles'>('team');
  const { tasks, loading, connected, addTask, updateTask, deleteTask, requestDateChange, requestClosure, approveClosure, rejectClosure, approveDateChange, rejectDateChange } = useTasks();
  const { user, signOut } = useAuth();
  const { fetchCurrentUserRole, isHOD } = useUserRoles();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchCurrentUserRole(user.id);
    }
  }, [user?.id]);

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

  const currentUserIsHOD = isHOD(user?.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4 max-w-[1100px]">
        <Header 
          connected={connected}
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user?.email}
          currentUser={user?.email?.split('@')[0] || ''}
          onSignOut={handleSignOut}
          isHOD={currentUserIsHOD}
        />

        <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_1.3fr] gap-4">
          {activeView === 'team' && (
            <div className="lg:col-span-2">
              <TeamView
                tasks={tasks}
                currentUser={user?.email?.split('@')[0] || ''}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onRequestDateChange={requestDateChange}
                onRequestClosure={requestClosure}
              />
            </div>
          )}
          
          {activeView === 'hod' && (
            <div className="lg:col-span-2">
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">HOD Dashboard</CardTitle>
                  <CardDescription>IBCS-style summary: volume, execution, slippage, approvals.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HODDashboard 
                    tasks={tasks}
                    currentUserEmail={user?.email}
                    currentUserId={user?.id}
                    onApproveDateChange={approveDateChange}
                    onRejectDateChange={rejectDateChange}
                    onApproveClosure={approveClosure}
                    onRejectClosure={rejectClosure}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'roles' && (
            <div className="lg:col-span-2">
              <RoleManagement currentUserId={user?.id} />
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