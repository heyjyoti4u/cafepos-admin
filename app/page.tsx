"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChefHat, Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (authError) {
      setError("Incorrect email or password. Please try again!");
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.replace("/dashboard");
    } else {
      setError("Something went wrong. Please re-enter credentials.");
      setLoading(false);
    }
  };

  // Session check loader — same as dashboard
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-slate-950/60 px-8 pt-8 pb-6 border-b border-slate-800 flex flex-col items-center gap-3">
          <div className="bg-orange-600 p-3 rounded-xl shadow-lg shadow-orange-600/30">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Cafe Cookies</h1>
            <p className="text-slate-400 text-sm mt-1">Admin POS Terminal</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 py-7 space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl font-medium">
              <span className="text-base">❌</span>
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="admin@cafecookies.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                required
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Login to POS
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-950/40 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600">🔒 Authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}
