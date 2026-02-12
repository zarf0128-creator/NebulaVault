import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();

  const [step, setStep] = useState("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setStep("loading");
      setError("");

      // Exchange the code for a session first
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }

      // Now wait for session
      let session = null;
      let attempts = 0;
      const maxAttempts = 15;

      while (!session && attempts < maxAttempts) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          session = data.session;
          break;
        }
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }

      if (!session) {
        throw new Error("Failed to establish session. Please try logging in again.");
      }

      // Check if user already has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("salt")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profile?.salt) {
        setNeedsPassword(true);
        setStep("enterPassword");
      } else {
        setNeedsPassword(false);
        setStep("setPassword");
      }
    } catch (e) {
      console.error("OAuth callback error:", e);
      setError(e.message || "Authentication failed");
      setStep("error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!needsPassword && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setStep("processing");

    try {
      const { error: callbackError } = await handleOAuthCallback(password);
      if (callbackError) throw callbackError;

      navigate("/dashboard");
    } catch (e) {
      console.error("Password setup error:", e);
      setError(e.message || "Failed to set up encryption");
      setStep(needsPassword ? "enterPassword" : "setPassword");
    }
  };

  // Loading State
  if (step === "loading" || step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md w-full fade-in">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg mb-2">
            {step === "loading" ? "Completing sign in..." : "Setting up encryption..."}
          </p>
          <p className="text-gray-500 text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  // Error State
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center fade-in">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
          <div className="alert-error mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary w-full"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Password Entry/Setup Form
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full fade-in">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {needsPassword ? "Enter Vault Password" : "Set Vault Password"}
          </h1>
          <p className="text-gray-400 text-sm">
            {needsPassword 
              ? "Enter your vault password to decrypt your files" 
              : "Create a password to encrypt your files. It cannot be recovered."}
          </p>
        </div>

        {error && (
          <div className="alert-error mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!needsPassword && (
          <div className="alert-warning mb-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-yellow-300 text-sm">
                <strong>Important:</strong> This password cannot be recovered. If you lose it, your files cannot be decrypted.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              {needsPassword ? "Vault Password" : "Create Password"}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoFocus
            />
          </div>

