import React, { useState, useEffect, useRef } from 'react';
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OrganizationDashboard from './components/OrganizationDashboard';
import SimpleApp from './SimpleApp';
import ErrorBoundary from './components/ErrorBoundary';
import ApiErrorBoundary from './components/ApiErrorBoundary';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // 'login', 'super-admin', 'organization'
  const [supabaseError, setSupabaseError] = useState(null);
  const initialized = useRef(false);

  // Always call the hook - if it fails, the error will be caught by the provider
  const supabase = useSupabase();

  useEffect(() => {
    // Prevent multiple executions
    if (initialized.current) {
      console.log('AppContent useEffect already initialized, skipping...');
      return;
    }
    
    console.log('AppContent useEffect running...');
    initialized.current = true;
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, setting loading to false');
      setLoading(false);
    }, 3000); // 3 second timeout
    
    // Check for existing session
    const getSession = async () => {
      try {
        console.log('Getting session...');
        
        // Check if supabase is available
        if (!supabase) {
          console.error('Supabase client not available');
          setSupabaseError('Supabase client not available');
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }
        
        console.log('Session data:', session);
        
        if (session?.user) {
          console.log('User found:', session.user.email);
          setUser(session.user);
          // Determine view based on user role
          if (session.user.user_metadata?.role === 'super_admin') {
            setView('super-admin');
          } else {
            setView('organization');
          }
          // Clear loading immediately when user is found
          clearTimeout(loadingTimeout);
          setLoading(false);
        } else {
          console.log('No user session found');
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      // Clear loading when auth state changes
      clearTimeout(loadingTimeout);
      setLoading(false);
      
      if (session?.user) {
        setUser(session.user);
        if (session.user.user_metadata?.role === 'super_admin') {
          setView('super-admin');
        } else {
          setView('organization');
        }
      } else {
        setUser(null);
        setView('login');
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (authData) => {
    setUser(authData.user);
    if (authData.user.user_metadata?.role === 'super_admin') {
      setView('super-admin');
    } else {
      setView('organization');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      {user && (
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {user.user_metadata?.role === 'super_admin' ? 'Super Admin Dashboard' : 'Organization Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.email} ({user.user_metadata?.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={user ? 'pt-0' : ''}>
        {supabaseError ? (
          <SimpleApp />
        ) : (
          <>
            {view === 'login' && (
              <ApiErrorBoundary onAuthError={() => setView('login')}>
                <Login onLogin={handleLogin} />
              </ApiErrorBoundary>
            )}
            {view === 'super-admin' && (
              <ApiErrorBoundary onAuthError={() => setView('login')}>
                <SuperAdminDashboard />
              </ApiErrorBoundary>
            )}
            {view === 'organization' && (
              <ApiErrorBoundary onAuthError={() => setView('login')}>
                <OrganizationDashboard user={user} />
              </ApiErrorBoundary>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <AppContent />
      </SupabaseProvider>
    </ErrorBoundary>
  );
}

export default App;