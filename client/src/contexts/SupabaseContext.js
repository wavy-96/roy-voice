import React, { createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in client/.env.local'
  );
}

console.log('Creating Supabase client with URL:', supabaseUrl);
console.log('Anon key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

// Create a single Supabase client instance
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client created:', supabase);

const SupabaseContext = createContext(supabase);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }) => {
  console.log('SupabaseProvider rendering with children');
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

export default supabase;
