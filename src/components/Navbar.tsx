"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Laptop, 
  Cpu, 
  MessageSquare,
  Network,
  Gamepad2
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isPathManual = 
    pathname === "/manual" || 
    pathname === "/intake" || 
    pathname === "/desktop-agent" ||
    pathname === "/simulator" ||
    pathname === "/approvals" ||
    pathname === "/passport" ||
    pathname === "/escalations" ||
    pathname === "/graph";

  const [manualMode, setManualMode] = useState(isPathManual);

  useEffect(() => {
    if (isPathManual) {
      setManualMode(true);
    } else if (pathname === "/assistant") {
      setManualMode(false);
    } else if (pathname === "/") {
      const stored = typeof window !== "undefined" ? localStorage.getItem("reusechain_manual_mode") : null;
      setManualMode(stored === "true");
    }

    const handleModeChange = (e: any) => {
      if (e.detail?.mode === "manual") {
        setManualMode(true);
        localStorage.setItem("reusechain_manual_mode", "true");
      } else if (e.detail?.mode === "chat") {
        setManualMode(false);
        localStorage.setItem("reusechain_manual_mode", "false");
      }
    };

    window.addEventListener("entryModeChanged", handleModeChange);
    return () => window.removeEventListener("entryModeChanged", handleModeChange);
  }, [pathname]);

  const primaryNavItems = [
    { label: "Manual Data Entry", href: "/manual", icon: Laptop, highlight: true },
    { label: "AI quick check up", href: "/desktop-agent", icon: Cpu },
  ];

  return (
    <header className="navbar">
      <Link href="/assistant" className="nav-brand">
        <Cpu size={26} color="#38bdf8" />
        <span className="font-black tracking-tight text-white flex items-center gap-1.5">
          ReUseChain <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal">PC Care</span>
        </span>
      </Link>

      {/* Navigation panel: Shows the 3 main core features */}
      {manualMode ? (
        <nav className="nav-links flex items-center gap-1 animate-in fade-in duration-200">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Quick toggle to return to Chat Agent */}
          <Link
            href="/assistant"
            onClick={() => {
              localStorage.setItem("reusechain_manual_mode", "false");
              setManualMode(false);
              window.dispatchEvent(new CustomEvent("entryModeChanged", { detail: { mode: "chat" } }));
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all ml-1"
          >
            <MessageSquare size={13} />
            <span>AI chat agent</span>
          </Link>
        </nav>
      ) : (
        /* When in Chat Agent view: Clean navigation to Manual Data Entry & AI quick check up (zero graph or extra tools) */
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <Link
            href="/desktop-agent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-sm"
          >
            <Cpu size={14} className="text-cyan-400" />
            <span>AI quick check up</span>
          </Link>
          <Link
            href="/manual"
            onClick={() => {
              localStorage.setItem("reusechain_manual_mode", "true");
              setManualMode(true);
              window.dispatchEvent(new CustomEvent("entryModeChanged", { detail: { mode: "manual" } }));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-sm"
          >
            <Laptop size={14} className="text-cyan-400" />
            <span>Manual Data Entry</span>
          </Link>
        </div>
      )}
    </header>
  );
}
