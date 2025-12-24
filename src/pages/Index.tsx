import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TeamView } from '@/components/TeamView';
import { HODDashboard } from '@/components/HODDashboard';
import { TeamMemberDashboard } from '@/components/TeamMemberDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { todayISO } from '@/lib/date-utils';

const Index = () => {
  const [activeView, setActiveView] = useState<'team' | 'hod'>('team');
  const { tasks, loading, connected, addTask, updateTask, deleteTask, requestDateChange, requestClosure, approveClosure, rejectClosure, approveDateChange, rejectDateChange } = useTasks();
  const { user, signOut } = useAuth();
  const { fetchCurrentUserRole, currentUserRole, loading: roleLoading } = useUserRoles();
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

  const handleAddSubtask = async (parentTaskId: string, title: string, owner: string, targetDate: string) => {
    const today = todayISO();
    const result = await addTask({
      title,
      owner,
      status: 'open',
      created_at: today,
      current_target_date: targetDate,
      target_date_history: [targetDate],
      completed_at: null,
      date_change_pending: false,
      date_change_reason: null,
      date_change_requested_date: null,
      date_change_approved_by: null,
      closure_pending: false,
      closure_comment: null,
      closure_requested_by: null,
      closure_approved_by: null,
      parent_task_id: parentTaskId,
      waiting_for_subtask: false,
      closure_rejection_comment: null
    });

    if (result.success) {
      toast({
        title: 'Subtask added',
        description: 'The subtask has been created. Parent task is now blocked until subtask completes.',
      });
      
      // Mark parent task as waiting for subtask - excludes from performance metrics
      await updateTask(parentTaskId, {
        closure_pending: false,
        closure_comment: null,
        closure_requested_by: null,
        waiting_for_subtask: true
      });
    }

    return result;
  };

  const currentUserIsHOD = currentUserRole === 'hod';

  // Show loading while role is being determined
  if (roleLoading && !currentUserRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your dashboard...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4 max-w-[1100px]">
        <Header 
          connected={connected}
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user?.email}
          currentUser={user?.email?.split('@')[0]?.charAt(0).toUpperCase() + (user?.email?.split('@')[0]?.slice(1) || '')}
          onSignOut={handleSignOut}
          isHOD={currentUserIsHOD}
        />

        <main className="grid grid-cols-1 gap-4">
          {/* Team Member View - Only shows their own dashboard */}
          {!currentUserIsHOD && (
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">My Dashboard</CardTitle>
                <CardDescription>Your personal performance and tasks overview.</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamMemberDashboard 
                  tasks={tasks}
                  currentUser={user?.email?.split('@')[0] || ''}
                  onRequestDateChange={requestDateChange}
                  onRequestClosure={requestClosure}
                />
              </CardContent>
            </Card>
          )}

          {/* HOD Views */}
          {currentUserIsHOD && activeView === 'team' && (
            <TeamView
              tasks={tasks}
              currentUser={user?.email?.split('@')[0] || ''}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onRequestDateChange={requestDateChange}
              onRequestClosure={requestClosure}
            />
          )}
          
          {currentUserIsHOD && activeView === 'hod' && (
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
                  onAddSubtask={handleAddSubtask}
                />
              </CardContent>
            </Card>
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