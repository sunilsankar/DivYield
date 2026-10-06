import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { verifySecurityPassword } from "../../lib/api";

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your application password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifySecurityPassword(password);
      if (res.valid) {
        onUnlock();
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Failed to verify password with the desktop engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-fade-in">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 px-8 py-8 text-white text-center relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">DivYield Locked</h2>
          <p className="text-indigo-200/80 text-xs mt-1">
            Enter your application password to access your portfolio & dividends
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Application Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password..."
                className="w-full text-sm font-medium px-4 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? "Verifying..." : "Unlock Application"}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Protected by OS Keychain hardware encryption
          </p>
        </form>
      </div>
    </div>
  );
};
