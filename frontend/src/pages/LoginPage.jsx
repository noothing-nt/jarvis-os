import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Zap, Mail, Lock, LogIn, Loader2, Server } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Using Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/"); // Redirect to dashboard on success
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050914] text-primary selection:bg-accent/30 font-sans">
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden border-r border-border-subtle bg-base">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-accent/10 via-base to-base" />
        
        <div className="relative z-10">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(47,129,247,0.4)]">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
            NexusOS <span className="text-accent font-light">v2.0</span>
          </h1>
          <p className="text-muted max-w-md text-sm leading-relaxed">
            High-performance personal command center. Integrated AI telemetry, task management, and project orchestration environment.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-mono text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Core Systems Online
          </div>
          <div className="flex items-center gap-2">
            <Server size={12} />
            FastAPI Backend linked
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-sm animate-fade-in">
          
          <div className="text-center mb-10 lg:hidden">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">NexusOS</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">System Access</h2>
            <p className="text-sm text-secondary">Authenticate to initialize your workspace.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">
                Identity (Email)
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  placeholder="admin@nexus.os"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">
                Security Key (Password)
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(47,129,247,0.2)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? "Authenticating..." : "Initialize Session"}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}