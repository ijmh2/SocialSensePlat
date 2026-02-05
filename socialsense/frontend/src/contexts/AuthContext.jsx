import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { authApi } from '../utils/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(0);
  const profileFetchRef = useRef(false);

  useEffect(() => {
    // Safety timeout - force un-hang after 5s
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[AUTH] Loading safety timeout triggered.');
        setLoading(false);
      }
    }, 5000);

    // Initial session check
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) console.error('[AUTH] Session error:', error);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile();
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State change:', event);
        setUser(session?.user ?? null);
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          fetchProfile();
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setTokenBalance(0);
          profileFetchRef.current = false;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    if (profileFetchRef.current) return;
    profileFetchRef.current = true;
    try {
      const { data } = await authApi.getProfile();
      setProfile(data.profile);
      setTokenBalance(data.profile?.token_balance || 0);
    } catch (error) {
      console.error('[AUTH] Profile fetch failed:', error.message);
    } finally {
      profileFetchRef.current = false;
    }
  };

  const refreshTokenBalance = async () => {
    try {
      const { data } = await authApi.getTokenBalance();
      setTokenBalance(data.token_balance);
      return data.token_balance;
    } catch (error) {
      console.error('Failed to refresh token balance:', error);
      return tokenBalance;
    }
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
  };

  const value = {
    user,
    profile,
    loading,
    tokenBalance,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    refreshTokenBalance,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
