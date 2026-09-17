"use client";

import Link from "next/link";
import { 
  Laptop, 
  Cpu, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* 1. Concise, Non-Booklike Header */}
      <div className="text-center space-y-2">
        <Badge variant="emerald" className="px-2.5 py-0.5 text-[11px] uppercase tracking-wider font-semibold">
          ⚡ PC Care & Circular Hardware Platform
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          How would you like to resolve your PC issue?
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Choose a method below to diagnose hardware, inspect telemetry, or triage circular repair.
        </p>
      </div>

      {/* 2. The 3 Core Primary Entry Points (Only Main Things) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Option 1: Manual Data Entry */}
        <Link href="/manual" className="group">
          <div className="h-full p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-cyan-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Laptop className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                1. Manual Data Entry
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter system specs and symptoms to receive a fast 3-factor diagnostic triage verdict.
              </p>
            </div>
            <div className="pt-2">
              <Button size="sm" className="w-full bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white text-xs font-semibold h-8 gap-1.5 transition-colors">
                Open Form Entry <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Link>

        {/* Option 2: AI Quick Check Up */}
        <Link href="/desktop-agent" className="group">
          <div className="h-full p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-emerald-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                2. AI Quick Check Up
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Probe live Windows host telemetry, hardware sensor health, and thermal performance.
              </p>
            </div>
            <div className="pt-2">
              <Button size="sm" className="w-full bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold h-8 gap-1.5 transition-colors">
                Launch Check Up <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Link>

        {/* Option 3: AI Chat Agent */}
        <Link href="/assistant" className="group">
          <div className="h-full p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-purple-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                3. AI Chat Agent
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chat in natural language. Spawns terminal sandbox diagnostic tools and tests when requested.
              </p>
            </div>
            <div className="pt-2">
              <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold h-8 gap-1.5 shadow-md shadow-purple-600/30">
                Start Chat Agent <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Minimal Status Footer */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> ONDC Doorstep Repair
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-500" /> Terminal Sandbox Active
          </span>
          <span>•</span>
          <span>Zero-Landfill Circular Triage</span>
        </div>
      </div>
    </div>
  );
}
