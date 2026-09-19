"use client";

import Link from "next/link";
import { 
  Laptop, 
  Cpu, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Recycle,
  ScanSearch,
  Network,
} from "lucide-react";

const entryPoints = [
  {
    number: "01",
    label: "Manual triage",
    title: "Describe the device",
    description: "Enter symptoms and system specs for a governed first read.",
    href: "/manual",
    icon: Laptop,
    tone: "lime",
    action: "Open intake",
  },
  {
    number: "02",
    label: "Live telemetry",
    title: "Probe the machine",
    description: "Read Windows health, thermal signals, and component state.",
    href: "/desktop-agent",
    icon: Cpu,
    tone: "cyan",
    action: "Run a check",
  },
  {
    number: "03",
    label: "Guided reasoning",
    title: "Talk it through",
    description: "Ask the agent to combine evidence and recommend an afterlife.",
    href: "/assistant",
    icon: MessageSquare,
    tone: "coral",
    action: "Open assistant",
  },
] as const;

export default function HomePage() {
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> ReUseChain / PC care operating system</div>
          <h1>Give every device<br /><em>a next life.</em></h1>
          <p className="hero-lede">A decision loop for diagnosing hardware, choosing the right intervention, and keeping useful components in circulation.</p>
          <div className="hero-actions">
            <Link href="/manual" className="primary-action">Start with a device <ArrowRight size={16} /></Link>
            <Link href="/graph" className="secondary-action"><Network size={16} /> View system map</Link>
          </div>
        </div>

        <div className="signal-panel" aria-label="ReUseChain decision loop">
          <div className="signal-orbit orbit-one" />
          <div className="signal-orbit orbit-two" />
          <div className="signal-core"><Recycle size={29} /><span>DEVICE<br />AFTERLIFE</span></div>
          <div className="signal-node node-top"><ScanSearch size={15} /><span>DIAGNOSE</span></div>
          <div className="signal-node node-right"><ShieldCheck size={15} /><span>GOVERN</span></div>
          <div className="signal-node node-bottom"><Recycle size={15} /><span>RECIRCULATE</span></div>
          <div className="signal-meta"><span className="live-dot" /> decision graph online <span>v0.9.61</span></div>
        </div>
      </section>

      <section className="workflow-strip">
        <div><span className="section-kicker">01 / Choose your signal</span><h2>Start where the evidence lives.</h2></div>
        <p>Every entry point lands in the same governed workflow. Pick the fastest source of truth for the machine in front of you.</p>
      </section>

      <section className="entry-grid">
        {entryPoints.map((entry) => {
          const Icon = entry.icon;
          return <Link key={entry.href} href={entry.href} className={`entry-card entry-${entry.tone}`}>
            <div className="entry-top"><span className="entry-number">{entry.number}</span><Icon size={22} /></div>
            <div><span className="entry-label">{entry.label}</span><h3>{entry.title}</h3><p>{entry.description}</p></div>
            <span className="entry-link">{entry.action} <ArrowRight size={15} /></span>
          </Link>;
        })}
      </section>

      <section className="status-rail">
        <div><Activity size={16} /><span>Terminal sandbox</span><strong>READY</strong></div>
        <div><ShieldCheck size={16} /><span>Governance layer</span><strong>ENFORCED</strong></div>
        <div><Zap size={16} /><span>Recovery routes</span><strong>REPAIR / REUSE / RECYCLE</strong></div>
      </section>
    </div>
  );
}
