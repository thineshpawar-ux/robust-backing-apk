import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { KeyRound } from 'lucide-react';

const authSchema = z.object({
  name: z.string().trim().min(1, { message: 'Please select your name' }),
  password: z.string().min(4, { message: 'Password must be at least 4 characters' })
});

const resetSchema = z.object({
  name: z.string().trim().min(1, { message: 'Please select your name' }),
  securityAnswer: z.string().trim().min(1, { message: 'Please enter your pet name' }),
  newPassword: z.string().min(4, { message: 'Password must be at least 4 characters' })
});

type AuthMode = 'login' | 'signup' | 'reset';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { teamMembers, loading: membersLoading } = useTeamMembers();
  const { user, signIn, signUp, verifySecurityAnswer } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get active team members
  const activeMembers = teamMembers.filter(m => m.is_active);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const validateAuthForm = () => {
    const result = authSchema.safeParse({ name, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateResetForm = () => {
    const result = resetSchema.safeParse({ name, securityAnswer, newPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  // Convert name to email format
  const nameToEmail = (name: string) => `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'reset') {
      await handlePasswordReset();
      return;
    }

    if (!validateAuthForm()) return;

    setLoading(true);
    const email = nameToEmail(name);
    const selectedMember = activeMembers.find(m => m.name === name);
    const isHod = selectedMember?.is_hod || false;
    
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login failed',
              description: 'User not found. Please sign up first.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Login failed',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: `Welcome back, ${name}!`,
            description: 'You have been logged in successfully.'
          });
        }
      } else if (mode === 'signup') {
        if (!securityAnswer.trim()) {
          setErrors({ securityAnswer: 'Please enter your favorite pet name for password recovery' });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name, securityAnswer, isHod);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Sign up failed',
              description: 'This name is already registered. Please log in instead.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: `Welcome, ${name}! You can now access the app.`
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateResetForm()) return;

    setLoading(true);
    const email = nameToEmail(name);
    
    try {
      // Check if security answer matches
      const isValid = verifySecurityAnswer(email, securityAnswer);

      if (!isValid) {
        toast({
          title: 'Reset failed',
          description: 'Incorrect pet name or user not found. Please try again.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Security answer matched - in localStorage mode, we can just log them in
      toast({
        title: 'Security verified!',
        description: 'Logging you in now...',
      });
      
      // Auto sign in
      await signIn(email, '');
      
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: 'An error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPassword('');
    setSecurityAnswer('');
    setNewPassword('');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">
            Supplier Quality To-Do List
          </CardTitle>
          <CardDescription>
            {mode === 'login' && 'Sign in to access your team tasks'}
            {mode === 'signup' && 'Create an account to get started'}
            {mode === 'reset' && 'Reset your password'}
          </CardDescription>
          <p className="text-xs text-amber-600 mt-2">
            📦 Offline Mode - Data stored locally in browser
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Select value={name} onValueChange={setName} disabled={membersLoading}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={membersLoading ? "Loading..." : "Select your name"} />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map(member => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name} {member.is_hod && '(HOD)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10"
                  required
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1.5">
                <Label htmlFor="securityAnswer" className="text-xs text-muted-foreground">
                  🐾 Favorite Pet Name (for password recovery)
                </Label>
                <Input
                  id="securityAnswer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="e.g., Tommy, Fluffy, Max"
                  className="h-10"
                  required
                />
                {errors.securityAnswer && (
                  <p className="text-xs text-destructive">{errors.securityAnswer}</p>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10"
                  required
                />
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword}</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full rounded-full" 
              disabled={loading || !name}
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign In' : 
                mode === 'signup' ? 'Create Account' : 
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-center">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => { resetForm(); setMode('signup'); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  First time? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setMode('reset'); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                >
                  <KeyRound className="h-3 w-3" />
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => { resetForm(); setMode('login'); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => { resetForm(); setMode('login'); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>

          <div className="mt-6 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <strong>First time users:</strong> Click "Sign up", select your name, set your pet name for recovery, and create a password.
            <br />
            <strong>HOD:</strong> Hariharan (can approve closures & manage team)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
