import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Room from "@/pages/Room";
import { createClient } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";

function App() {
  const { toast } = useToast();
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  
  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: "Configuration Error",
        description: "Supabase configuration is missing. Please check your environment variables.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      window.supabase = client;
      setSupabaseLoaded(true);
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Supabase. Please try again later.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      {supabaseLoaded ? (
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/room/:roomCode" component={Room} />
          <Route component={NotFound} />
        </Switch>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Loading YouTube Sync...</h2>
          </div>
        </div>
      )}
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
