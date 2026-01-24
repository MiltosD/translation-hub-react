import { UserHeader } from '@/components/UserHeader';
import { TranslationsTable } from '@/components/TranslationsTable';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UserHeader />
      <main className="container py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Translations</h1>
          <p className="text-muted-foreground">
            Manage translation items and their language variants
          </p>
        </div>
        <TranslationsTable />
      </main>
    </div>
  );
};

export default Index;
