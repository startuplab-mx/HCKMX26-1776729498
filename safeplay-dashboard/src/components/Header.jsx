import { Shield, Activity } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Branding izquierda */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-pink-500" strokeWidth={2.5} />
            <div className="absolute inset-0 blur-lg bg-pink-500/50 -z-10"></div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400">
              707
            </h1>
            <p className="text-xs text-slate-500 -mt-1">
              Child Safety Platform
            </p>
          </div>
        </div>

        {/* Info del cliente + estado */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-200">SafePark Demo</p>
            <p className="text-xs text-slate-500">Cliente piloto</p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <span className="text-xs font-medium text-emerald-400">
              Online
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}