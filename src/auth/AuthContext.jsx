import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { checkSupabaseConnection, isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { getProfile, login as loginLocal, logout as logoutLocal, register as registerLocal } from '../api';
import { isLocalBackend } from '../lib/appMode';
import { AuthContext } from './authContext';
import { useAuth } from './useAuth';

function makeLocalSession(user) {
  return {
    user: {
      id: String(user.id || user._id),
      email: user.email,
      user_metadata: {
        username: user.name,
        role: user.role,
        branchId: user.branchId || '',
        semester: user.semester || null,
      },
    },
  };
}

function makeLocalProfile(user) {
  return {
    id: String(user.id || user._id),
    username: user.name,
    avatar_url: user.profileImage || null,
    total_score: user.points || 0,
    branch_id: user.branchId || '',
    semester: user.semester || null,
    created_at: user.createdAt,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => (
    isLocalBackend ? true : isSupabaseConfigured
  ));
  const [profileLoadedFor, setProfileLoadedFor] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [configurationError] = useState(isLocalBackend || isSupabaseConfigured
    ? ''
    : 'Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.');
  const userId = session?.user?.id;
  const profileLoading = Boolean(userId && profileLoadedFor !== userId);
  const currentProfile = profile?.id === userId ? profile : null;

  useEffect(() => {
    if (isLocalBackend) {
      let active = true;
      getProfile()
        .then((user) => {
          if (!active) return;
          setSession(makeLocalSession(user));
          setProfile(makeLocalProfile(user));
          setProfileLoadedFor(String(user.id || user._id));
        })
        .catch((error) => {
          localStorage.removeItem('quiz-token');
          if (active && error.status !== 401) setProfileError(error.message || 'Unable to restore your local account.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }

    if (!isSupabaseConfigured) return undefined;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setProfileError(error.message);
        setSession(data.session);
      })
      .catch((error) => {
        if (active) setProfileError(error.message || 'Unable to restore your Supabase session.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLocalBackend || !supabase) return undefined;
    if (!supabase || !userId) return undefined;

    let active = true;
    supabase
      .from('profiles')
      .select('id, username, avatar_url, total_score, created_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setProfile(data);
        setProfileError(error?.message || (!data ? 'Your profile has not been created yet. Run the Supabase schema SQL and try signing in again.' : ''));
        setProfileLoadedFor(userId);
      })
      .catch((error) => {
        if (active) {
          setProfileError(error.message || 'Unable to load your profile.');
          setProfileLoadedFor(userId);
        }
      })

    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (isLocalBackend) {
      const user = await getProfile();
      const nextProfile = makeLocalProfile(user);
      setProfile(nextProfile);
      setProfileLoadedFor(nextProfile.id);
      setProfileError('');
      return nextProfile;
    }
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_score, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your profile has not been created yet. Run the Supabase schema SQL and try signing in again.');
    setProfile(data);
    setProfileLoadedFor(userId);
    setProfileError('');
    return data;
  }, [userId]);

  const signIn = async (email, password) => {
    if (isLocalBackend) {
      const data = await loginLocal({ email, password });
      setSession(makeLocalSession(data.user));
      setProfile(makeLocalProfile(data.user));
      setProfileLoadedFor(String(data.user.id || data.user._id));
      return data;
    }
    if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key to .env.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async ({ username, email, password, branchId, semester }) => {
    if (isLocalBackend) {
      const data = await registerLocal({ name: username, email, password, branchId, semester });
      setSession(makeLocalSession(data.user));
      setProfile(makeLocalProfile(data.user));
      setProfileLoadedFor(String(data.user.id || data.user._id));
      return { user: data.user, session: data };
    }
    if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key to .env.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async (redirectTo) => {
    if (isLocalBackend) {
      throw new Error('Google sign-in needs an active Supabase project and Google OAuth credentials. Email and password signup/login are ready in local mode.');
    }
    if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key to .env.');
    await checkSupabaseConnection();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (isLocalBackend) {
      try {
        await logoutLocal();
      } finally {
        localStorage.removeItem('quiz-token');
        setSession(null);
        setProfile(null);
        setProfileLoadedFor(null);
      }
      return;
    }
    if (!supabase) throw new Error('Supabase is not configured. Add your project URL and anon key to .env.');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    session,
    user: session?.user || null,
    profile: currentProfile,
    loading,
    profileLoading,
    profileError,
    configurationError,
    refreshProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <section className="container"><div className="panel-box empty-state"><h3>Checking your session...</h3></div></section>;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return children;
}
