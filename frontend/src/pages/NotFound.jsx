import { useNavigate } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base text-center p-6 animate-fade-in">
      <div className="w-20 h-20 bg-danger/10 border border-danger/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(248,81,73,0.2)]">
        <AlertTriangle size={36} className="text-danger" />
      </div>
      <h1 className="text-6xl font-black text-primary mb-2 tracking-tight">404</h1>
      <h2 className="text-xl font-semibold text-primary mb-4">System Path Not Found</h2>
      <p className="text-sm text-secondary max-w-md mb-8 leading-relaxed">
        The directory or module you are looking for does not exist in the current OS architecture. 
        It may have been moved, deleted, or you lack the required clearance.
      </p>
      <button 
        onClick={() => navigate("/")}
        className="btn btn-blue px-6 py-2.5 text-sm gap-2"
      >
        <Home size={16} />
        Return to Command Center
      </button>
    </div>
  );
}