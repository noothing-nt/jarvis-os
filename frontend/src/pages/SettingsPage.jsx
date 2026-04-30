import { useState } from "react";
import { User, Key, Server, Bell, Shield, Database, LayoutTemplate, Link as LinkIcon, Save, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("api");
  const [showKey, setShowKey] = useState(false);

  const TABS = [
    { id: "profile", label: "Profile & Account", icon: User },
    { id: "api",     label: "API & Providers",   icon: Key },
    { id: "server",  label: "Server Config",     icon: Server },
    { id: "ui",      label: "Interface",         icon: LayoutTemplate },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      
      <div>
        <h1 className="text-2xl font-bold text-primary">System Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage integrations, providers, and OS preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === t.id 
                  ? "bg-surface border border-border text-primary shadow-sm" 
                  : "text-secondary hover:bg-surface/50 hover:text-primary border border-transparent"
              )}
            >
              <t.icon size={16} className={activeTab === t.id ? "text-accent" : "text-muted"} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          
          {activeTab === "api" && (
            <>
              <div className="nx-card p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
                  <Database className="text-success" size={20} />
                  <div>
                    <h2 className="text-md font-semibold text-primary">Supabase Database</h2>
                    <p className="text-xs text-muted">PostgreSQL connection & Auth settings</p>
                  </div>
                </div>
                
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="nx-label">Supabase Project URL</label>
                    <input type="text" defaultValue="https://xyz123.supabase.co" className="nx-input font-mono text-sm" />
                  </div>
                  <div>
                    <label className="nx-label">Anon Public Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"} 
                        defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                        className="nx-input font-mono text-sm pr-10" 
                      />
                      <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2 text-muted hover:text-primary">
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="nx-card p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
                  <Shield className="text-purple-400" size={20} />
                  <div>
                    <h2 className="text-md font-semibold text-primary">AI Providers</h2>
                    <p className="text-xs text-muted">Gemini & OpenAI API configurations</p>
                  </div>
                </div>
                
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="nx-label">Primary Provider</label>
                    <select className="nx-input nx-select">
                      <option value="gemini">Google Gemini (1.5 Flash)</option>
                      <option value="openai">OpenAI (GPT-4o Mini)</option>
                    </select>
                  </div>
                  <div>
                    <label className="nx-label">Gemini API Key</label>
                    <input type="password" defaultValue="AIzaSyB-xxxx..." className="nx-input font-mono text-sm" />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button className="btn btn-blue gap-2">
                    <Save size={14} /> Save AI Configuration
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "server" && (
            <div className="nx-card p-6 flex items-center justify-center min-h-[300px] text-center">
              <div>
                <Server size={32} className="text-muted mx-auto mb-3" />
                <h3 className="text-md font-semibold text-primary mb-1">Server Runtime Config</h3>
                <p className="text-sm text-muted">FastAPI runtime settings are managed via your <code>.env</code> file.<br/>Modifications require a container restart.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}