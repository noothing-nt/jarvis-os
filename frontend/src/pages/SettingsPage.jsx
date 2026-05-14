import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, Key, Server, LayoutTemplate, 
  Save, Eye, EyeOff, Shield, Database, 
  Mail, Lock, CheckCircle2, AlertCircle 
} from "lucide-react";
import clsx from "clsx";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Auth State
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI State
  const [showKey, setShowKey] = useState(false);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const TABS = [
    { id: "profile", label: "Account & Security", icon: User },
    { id: "api",     label: "API & Providers",    icon: Key },
    { id: "server",  label: "Server Config",      icon: Server },
    { id: "ui",      label: "Interface",          icon: LayoutTemplate },
  ];

  // Fetch Current User on Load
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
        setEmail(user.email || "");
      }
    };
    fetchUser();
  }, []);

  // Update Supabase Auth Profile
  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage(null);

    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match!" });
      setLoading(false);
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      setLoading(false);
      return;
    }

    try {
      const updates = { data: { full_name: fullName } };
      let emailChanged = false;

      // Add email if changed
      if (email !== user?.email) {
        updates.email = email;
        emailChanged = true;
      }

      // Add password if provided
      if (newPassword) {
        updates.password = newPassword;
      }

      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      setUser(data.user);
      setNewPassword("");
      setConfirmPassword("");
      
      if (emailChanged) {
        setMessage({ type: "success", text: "Profile updated! Please check your new email inbox to verify the change." });
      } else {
        setMessage({ type: "success", text: "Security credentials updated successfully!" });
      }

    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
      // Auto clear success message
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    // STRICT HEIGHT CONSTRAINT: Fits viewport perfectly
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "calc(100vh - 64px)", padding: "24px" }} className="animate-fade-in">
      
      {/* ── Header ── */}
      <div className="mb-6 flex-shrink-0">
        <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "4px", color: "#0F172A" }}>
          System Settings
        </h1>
        <p style={{ fontSize: "14px", color: "#64748B", fontWeight: 500 }}>
          Manage your credentials, integrations, and OS preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* ── Navigation Sidebar ── */}
        <div className="space-y-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold transition-all border",
                activeTab === t.id 
                  ? "bg-white border-[#E2E8F0] text-[#7C3AED] shadow-[0_4px_20px_rgba(0,0,0,0.02)]" 
                  : "bg-transparent text-[#64748B] hover:bg-white/50 hover:text-[#0F172A] border-transparent"
              )}
            >
              <t.icon size={18} className={activeTab === t.id ? "text-[#7C3AED]" : "text-[#94A3B8]"} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <div className="md:col-span-3 space-y-6">
          
          {/* ══════════════════════════════════════════════════════ */}
          {/* PROFILE & SECURITY TAB (Fully Functional)            */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
              
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#F1F5F9]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#F3E8FF] text-[#7C3AED]">
                  <Shield size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>Account & Security</h2>
                  <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Update your login ID (Email) and master password.</p>
                </div>
              </div>

              {/* Status Message */}
              {message && (
                <div className={clsx(
                  "flex items-start gap-3 p-4 rounded-2xl mb-8 border",
                  message.type === "success" ? "bg-[#D1FAE5] border-[#10B981]/20 text-[#065F46]" : "bg-[#FEE2E2] border-[#EF4444]/20 text-[#991B1B]"
                )}>
                  {message.type === "success" ? <CheckCircle2 size={20} className="text-[#10B981] mt-0.5" /> : <AlertCircle size={20} className="text-[#EF4444] mt-0.5" />}
                  <p className="text-sm font-semibold leading-relaxed">{message.text}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* User ID Section */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Identity</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2">FULL NAME</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-11 pr-4 py-3 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2">USER ID (EMAIL ADDRESS)</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-11 pr-4 py-3 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" 
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-[#94A3B8] mt-2">Changing this will require email verification.</p>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Master Password</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2">NEW PASSWORD</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input 
                        type={showPass1 ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-11 pr-11 py-3 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder-[#CBD5E1]" 
                      />
                      <button onClick={() => setShowPass1(!showPass1)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#7C3AED] transition-colors">
                        {showPass1 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2">CONFIRM NEW PASSWORD</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input 
                        type={showPass2 ? "text" : "password"} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retype new password"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-11 pr-11 py-3 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder-[#CBD5E1]" 
                      />
                      <button onClick={() => setShowPass2(!showPass2)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#7C3AED] transition-colors">
                        {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-6 border-t border-[#F1F5F9] flex justify-end">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0" 
                  style={{ backgroundColor: "#7C3AED", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
                >
                  <Save size={16} /> {loading ? "Updating Vault..." : "Save Security Credentials"}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* API & PROVIDERS TAB                                  */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#F1F5F9]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#D1FAE5] text-[#10B981]">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>Supabase Connection</h2>
                    <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>PostgreSQL database & Auth settings (Managed in .env)</p>
                  </div>
                </div>
                
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Project URL</label>
                    <input type="text" readOnly value={import.meta.env.VITE_SUPABASE_URL || "Connected via .env file"} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-mono text-[#64748B] outline-none opacity-80" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Anon Public Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"} 
                        readOnly 
                        value={import.meta.env.VITE_SUPABASE_ANON_KEY || "Connected via .env file"} 
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-mono text-[#64748B] outline-none opacity-80 pr-12" 
                      />
                      <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#7C3AED] transition-colors">
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#F1F5F9]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FEF3C7] text-[#F59E0B]">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>AI Intelligence Providers</h2>
                    <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Manage Gemini & OpenAI API configurations</p>
                  </div>
                </div>
                
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Primary Provider</label>
                    <select className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all">
                      <option value="gemini">Google Gemini (1.5 Flash)</option>
                      <option value="openai">OpenAI (GPT-4o Mini)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">API Key</label>
                    <input type="password" placeholder="Paste your API key here..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder-[#CBD5E1]" />
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-[#F1F5F9] flex justify-end">
                  <button className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0F172A", boxShadow: "0 4px 15px rgba(15,23,42,0.2)" }}>
                    <Save size={16} /> Save Integrations
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* SERVER CONFIG TAB                                    */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "server" && (
            <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "64px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-6">
                <Server size={36} className="text-[#94A3B8]" />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>Hardware Bridge & Server</h3>
              <p style={{ fontSize: "14px", color: "#64748B", fontWeight: 500, maxWidth: "400px", lineHeight: "1.6" }}>
                FastAPI runtime settings and ESP32 MQTT configurations are managed directly via your system's <code className="bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-md text-xs border border-[#E2E8F0]">.env</code> file. Modifications require a container restart.
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* INTERFACE TAB                                        */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "ui" && (
            <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "64px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-6">
                <LayoutTemplate size={36} className="text-[#94A3B8]" />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>SaaS Interface Theme</h3>
              <p style={{ fontSize: "14px", color: "#64748B", fontWeight: 500, maxWidth: "400px", lineHeight: "1.6" }}>
                Light SaaS Theme is currently locked as your primary system interface. Deep Dark customization module coming in v2.1.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}