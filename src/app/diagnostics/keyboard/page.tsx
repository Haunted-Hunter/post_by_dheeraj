"use client";

import Link from "next/link";
import { ArrowLeft, Gamepad2, ShieldCheck, Wrench, MessageSquare, Terminal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KeyboardTestGame from "@/components/KeyboardTestGame";

export default function KeyboardDiagnosticsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="sm" variant="outline" className="border-slate-800 text-slate-300 hover:text-white text-xs h-8 px-2.5">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
                Keyboard Hardware Reflex Test
              </h1>
              <Badge variant="purple" className="text-xs font-mono">
                Physical Switch Game
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapid countdown testing for unresponsive buttons, broken scissor switches, and trace faults.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:text-white text-xs h-8 gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> AI Assistant
            </Button>
          </Link>
          <Link href="/desktop-agent">
            <Button size="sm" variant="outline" className="border-slate-800 text-slate-300 hover:text-white text-xs h-8 gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Express Checkup
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Interactive Game Component */}
      <KeyboardTestGame standalone assetTag="ASSET-0142" />

      {/* Quick Info Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 pt-2">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Time-Attack Testing
          </div>
          <p className="text-[11px] text-slate-400">
            Tests responsiveness against a 3-second window. Unresponsive keys are flagged instantly.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-400" /> 1-Click ONDC Dispatch
          </div>
          <p className="text-[11px] text-slate-400">
            Dead keys automatically generate work orders for Alex Rivera (Dell/HP Certified).
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Passport Ledger
          </div>
          <p className="text-[11px] text-slate-400">
            All test passes and failure telemetry are cryptographically signed on device passport.
          </p>
        </div>
      </div>
    </div>
  );
}
