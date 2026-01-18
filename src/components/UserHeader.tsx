import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const UserHeader = () => {
  const { user, isAdmin, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <span className="text-foreground">LDS Translation Manager</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2 text-sm">
            {isAdmin ? (
              <>
                <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.username}</span>
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Administrator</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.username}</span>
                <Badge variant="secondary" className="text-xs">
                  {user.client}
                </Badge>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
