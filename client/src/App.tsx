import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Room from "@/pages/Room";
import { useToast } from "@/hooks/use-toast";

function App() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize app and check prerequisites
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.warn("Supabase configuration missing. Using fallback implementation.");
          // We'll continue with local storage fallback
        } else if (!window.supabase) {
          console.warn("Supabase client not initialized in main.tsx. Using fallback.");
          // We'll continue with local storage fallback
        }
        
        // Ready to render the application
        setIsLoading(false);
      } catch (error) {
        console.error("Error during app initialization:", error);
        // Continue with fallback implementation
        setIsLoading(false);
      }
    };

    // Short timeout to ensure UI is responsive
    const timer = setTimeout(() => {
      checkSupabase();
    }, 1000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading YouTube Sync...</h2>
          <p className="text-muted-foreground mt-2">Setting up your viewing experience</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/room/:roomCode" component={Room} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

// Add supabase to window type
declare global {
  interface Window {
    supabase: any;
  }
}

export default App;
