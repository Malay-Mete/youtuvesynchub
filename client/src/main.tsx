import { createRoot } from "react-dom/client";
import { createClient } from '@supabase/supabase-js';
import App from "./App";
import "./index.css";

// Initialize Supabase at app startup
try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseAnonKey) {
    // @ts-ignore - Define supabase on the window object for global access
    window.supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Supabase credentials missing. Check environment variables.');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(<App />);
