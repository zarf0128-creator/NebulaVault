import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CryptoUtils } from '../lib/crypto';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [masterKey, setMasterKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        // Clear master key on logout
        if (event === 'SIGNED_OUT') {
          setMasterKey(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign up new user with email and password
   */
  const signUp = async (email, password) => {
    try {
      setError(null);
      
      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Generate salt for this user
        const salt = CryptoUtils.generateSalt();
        const saltHex = CryptoUtils.arrayBufferToHex(salt);

        // Store salt in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            salt: saltHex
          });

        if (profileError) throw profileError;

        // Derive master key
        const derivedMasterKey = await CryptoUtils.deriveMasterKey(password, salt);
        setMasterKey(derivedMasterKey);
      }

      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  /**
   * Sign in existing user
   */
  const signIn = async (email, password) => {
    try {
      setError(null);
      
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Fetch user's salt
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('salt')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile?.salt) throw new Error('User profile not found');

        // Derive master key from password and salt
        const salt = CryptoUtils.hexToArrayBuffer(profile.salt);
        const derivedMasterKey = await CryptoUtils.deriveMasterKey(password, salt);
        setMasterKey(derivedMasterKey);
      }

      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  /**
   * Sign in with Google OAuth
   */
const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};



  /**
   * Handle OAuth callback and set up encryption for OAuth users
   */
  const handleOAuthCallback = async (password) => {
    try {
      if (!user) throw new Error('No user found');

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('salt')
        .eq('user_id', user.id)
        .single();

      if (existingProfile?.salt) {
        // Profile exists, derive master key
        const salt = CryptoUtils.hexToArrayBuffer(existingProfile.salt);
        const derivedMasterKey = await CryptoUtils.deriveMasterKey(password, salt);
        setMasterKey(derivedMasterKey);
      } else {
        // New OAuth user, create profile with salt
        const salt = CryptoUtils.generateSalt();
        const saltHex = CryptoUtils.arrayBufferToHex(salt);

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            salt: saltHex
          });

        if (profileError) throw profileError;

        // Derive master key
        const derivedMasterKey = await CryptoUtils.deriveMasterKey(password, salt);
        setMasterKey(derivedMasterKey);
      }

      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  };

  /**
   * Sign out user
   */
  const signOut = async () => {
    try {
      setError(null);
      
      // Clear master key from memory
      setMasterKey(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email) => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  };

  const value = {
    user,
    masterKey,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    handleOAuthCallback,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
