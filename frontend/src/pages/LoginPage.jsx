import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
    <div className="min-h-screen flex font-sans">
      
      {/* ── Left Panel - Cinematic Batman Aesthetic (60% Width) ── */}
      <div className="hidden lg:flex w-[60%] flex-col justify-between p-14 relative overflow-hidden" style={{ backgroundColor: "#050505" }}>
        {/* Subtle Amber/Gold Glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.06),transparent_60%)]" />
        
        <div className="relative z-10">
          {/* Classic Yellow Oval Bat-Symbol Image */}
          <div className="mb-10">
            <img 
              src="/bat_logo.png" 
              alt="Batman Classic Logo" 
              className="w-32 h-auto drop-shadow-[0_0_25px_rgba(234,179,8,0.35)] transition-all hover:scale-105 duration-500" 
            />
          </div>
          
          <h1 className="text-5xl font-black tracking-tight text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            NOOTHING
          </h1>
          <p className="text-[#EAB308] font-mono font-bold uppercase tracking-widest mb-6 text-sm">
            Life DB • Secure Terminal
          </p>
          <p className="text-[#94A3B8] max-w-md text-sm leading-relaxed font-medium">
            Your encrypted autonomous intelligence center. Integrated telemetry, secure surveillance, and high-level project orchestration environment.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs font-mono font-bold text-[#64748B]">
          <div className="flex items-center gap-2 text-[#EAB308]">
            <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse shadow-[0_0_8px_#EAB308]" />
            Batcave Network Online
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#EAB308]" />
            End-to-End Encrypted
          </div>
        </div>
      </div>

      {/* ── Right Panel - Light Form Aesthetic (40% Width) ── */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 relative shadow-[-20px_0_40px_rgba(0,0,0,0.3)] z-10" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[24px] border border-[#E2E8F0] shadow-[0_8px_30px_rgba(0,0,0,0.04)] animate-fade-in">
          
          {/* Mobile Branding (Only visible on small screens) */}
          <div className="text-center mb-8 lg:hidden">
            <img 
              src="/bat_logo.png" 
              alt="Batman Classic Logo" 
              className="w-20 h-auto mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] mb-4" 
            />
            <h2 className="text-2xl font-black text-[#0F172A]" style={{ fontFamily: "'Syne', sans-serif" }}>NOOTHING</h2>
            <p className="text-[#EAB308] font-mono font-bold uppercase tracking-widest mt-1 text-[10px]">Life DB</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#0F172A] mb-2 tracking-tight">System Access</h2>
            <p className="text-sm font-medium text-[#64748B]">Authenticate to initialize your workspace.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#EF4444]/20 text-[#991B1B] text-sm font-semibold flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wider">
                Identity (Email)
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all"
                  placeholder="bruce@noothing.os"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wider">
                Security Key (Password)
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] transition-all placeholder-[#CBD5E1]"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* ── Remember Me & Forgot Password Row ── */}
            <div className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#EAB308] focus:ring-[#EAB308] cursor-pointer transition-colors"
                  />
                </div>
                <span className="text-xs font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                  Remember this device
                </span>
              </label>
              <a href="#" className="text-xs font-bold text-[#EAB308] hover:text-[#D97706] transition-colors">
                Lost Key?
              </a>
            </div>

            {/* ── Submit Button (Batman Accent Color) ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#EAB308] hover:bg-[#D97706] text-[#050505] font-black tracking-wide text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 shadow-[0_4px_15px_rgba(234,179,8,0.3)]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {loading ? "Authenticating..." : "Initialize Session"}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}