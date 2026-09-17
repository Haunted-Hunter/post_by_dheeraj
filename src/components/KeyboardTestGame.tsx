"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Gamepad2, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Volume2, 
  VolumeX, 
  Wrench, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Audio Synthesizer via Web Audio API
class GameAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playHit() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playMiss() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch (e) {}
  }

  playVictory() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
      });
    } catch (e) {}
  }
}

const audio = new GameAudio();

export interface KeyItem {
  id: string; // e.g. "KeyW", "Semicolon", "Space", "Enter"
  label: string;
  display: string;
  subsystemRow?: string;
  expectedCodes: string[];
}

const DEFAULT_SPRINT_KEYS: KeyItem[] = [
  { id: "Space", label: "Spacebar", display: "SPACE", expectedCodes: ["Space"] },
  { id: "KeyW", label: "W Key", display: "W", expectedCodes: ["KeyW"] },
  { id: "KeyA", label: "A Key", display: "A", expectedCodes: ["KeyA"] },
  { id: "KeyS", label: "S Key", display: "S", expectedCodes: ["KeyS"] },
  { id: "KeyD", label: "D Key", display: "D", expectedCodes: ["KeyD"] },
  { id: "Semicolon", label: "Semicolon (;)", display: ";", expectedCodes: ["Semicolon"] },
  { id: "Enter", label: "Enter / Return", display: "ENTER", expectedCodes: ["Enter", "NumpadEnter"] },
  { id: "Backspace", label: "Backspace", display: "⌫ BACKSPACE", expectedCodes: ["Backspace"] },
  { id: "Tab", label: "Tab Key", display: "TAB", expectedCodes: ["Tab"] },
  { id: "Escape", label: "Escape", display: "ESC", expectedCodes: ["Escape"] },
  { id: "ShiftLeft", label: "Shift", display: "SHIFT", expectedCodes: ["ShiftLeft", "ShiftRight"] },
  { id: "ArrowRight", label: "Right Arrow", display: "→ ARROW", expectedCodes: ["ArrowRight"] },
];

interface KeyboardTestGameProps {
  onComplete?: (report: any) => void;
  standalone?: boolean;
  assetTag?: string;
}

export default function KeyboardTestGame({
  onComplete,
  standalone = false,
  assetTag = "ASSET-0142",
}: KeyboardTestGameProps) {
  // Game Configuration State
  const [timeLimitSec, setTimeLimitSec] = useState<number>(3.0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeQueue, setActiveQueue] = useState<KeyItem[]>(DEFAULT_SPRINT_KEYS);

  // Game Play State
  const [gameState, setGameState] = useState<"idle" | "countdown" | "playing" | "ended">("idle");
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(3000);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);

  // Results Trackers
  const [results, setResults] = useState<
    Record<string, { status: "passed" | "failed"; latencyMs: number; key: KeyItem }>
  >({});
  const [recentHitFeedback, setRecentHitFeedback] = useState<{
    key: string;
    status: "hit" | "miss";
    latencyMs?: number;
  } | null>(null);

  // Backend Booking State
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDispatched, setBookingDispatched] = useState<any>(null);

  // Synchronization Refs for Rock-Solid Event & Timer Handling
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyStartTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const gameStateRef = useRef<"idle" | "countdown" | "playing" | "ended">("idle");
  const currentIndexRef = useRef<number>(0);
  const activeQueueRef = useRef<KeyItem[]>(DEFAULT_SPRINT_KEYS);
  const timeLimitSecRef = useRef<number>(3.0);
  const resultsRef = useRef<
    Record<string, { status: "passed" | "failed"; latencyMs: number; key: KeyItem }>
  >({});

  // Synchronize refs with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);

  useEffect(() => {
    timeLimitSecRef.current = timeLimitSec;
  }, [timeLimitSec]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audio.enabled = next;
  };

  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  // Start individual key challenge
  const startQuestion = (index: number) => {
    clearAllTimers();

    if (index >= activeQueueRef.current.length) {
      finishGame();
      return;
    }

    setCurrentIndex(index);
    currentIndexRef.current = index;
    setGameState("playing");
    gameStateRef.current = "playing";
    setRecentHitFeedback(null); // Clear previous key hit/miss badge

    const limitMs = timeLimitSecRef.current * 1000;
    setTimeLeftMs(limitMs);
    const startTime = Date.now();
    keyStartTimeRef.current = startTime;

    const stepMs = 40;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, limitMs - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        handleKeyTimeout(index);
      }
    }, stepMs);
  };

  // Start the 3-2-1 countdown
  const handleStartGame = () => {
    clearAllTimers();
    setResults({});
    resultsRef.current = {};
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setBookingDispatched(null);
    setRecentHitFeedback(null);
    setGameState("countdown");
    gameStateRef.current = "countdown";
    setCountdownNum(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
      } else {
        clearInterval(interval);
        startQuestion(0);
      }
    }, 800);
  };

  // User failed to press key in time (Catches error within time bound)
  const handleKeyTimeout = (index: number) => {
    clearAllTimers();
    const currentKey = activeQueueRef.current[index] || activeQueue[index];
    if (!currentKey) return;

    audio.playMiss();
    setRecentHitFeedback({ key: currentKey.display, status: "miss" });
    setStreak(0);

    const failedEntry = {
      status: "failed" as const,
      latencyMs: timeLimitSecRef.current * 1000,
      key: currentKey,
    };

    setResults((prev) => {
      const updated = {
        ...prev,
        [currentKey.id]: failedEntry,
      };
      resultsRef.current = updated;
      return updated;
    });

    // Pause briefly (450ms) so user sees the red TIMEOUT flash before advancing
    transitionTimeoutRef.current = setTimeout(() => {
      startQuestion(index + 1);
    }, 450);
  };

  // User pressed key on physical keyboard
  const handlePhysicalKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameStateRef.current !== "playing") return;

    const index = currentIndexRef.current;
    const queue = activeQueueRef.current;
    const currentKey = queue[index];
    if (!currentKey) return;

    // Check if pressed key matches expected scancode or key label
    const isMatch =
      currentKey.expectedCodes.includes(e.code) ||
      currentKey.id === e.code ||
      e.key.toLowerCase() === currentKey.display.toLowerCase() ||
      (currentKey.id === "Semicolon" && (e.key === ";" || e.code === "Semicolon")) ||
      (currentKey.id === "Space" && (e.code === "Space" || e.key === " ")) ||
      (currentKey.id === "Escape" && (e.code === "Escape" || e.key === "Escape"));

    if (isMatch) {
      e.preventDefault();
      clearAllTimers();

      const latency = Math.max(1, Date.now() - keyStartTimeRef.current);
      audio.playHit();

      setRecentHitFeedback({ key: currentKey.display, status: "hit", latencyMs: latency });
      const points = 100 + Math.max(0, Math.round((timeLimitSecRef.current * 1000 - latency) / 20));
      setScore((prev) => prev + points);
      setStreak((prev) => {
        const next = prev + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });

      const passedEntry = {
        status: "passed" as const,
        latencyMs: latency,
        key: currentKey,
      };

      setResults((prev) => {
        const updated = {
          ...prev,
          [currentKey.id]: passedEntry,
        };
        resultsRef.current = updated;
        return updated;
      });

      transitionTimeoutRef.current = setTimeout(() => {
        startQuestion(index + 1);
      }, 300);
    }
  }, []);

  // Listen to physical keyboard events (attached once, never torn down on re-render)
  useEffect(() => {
    const handleKeyDownListener = (e: KeyboardEvent) => {
      handlePhysicalKeyDown(e);
    };

    window.addEventListener("keydown", handleKeyDownListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDownListener);
      clearAllTimers();
    };
  }, [handlePhysicalKeyDown]);

  // Finish game & compile results
  const finishGame = () => {
    clearAllTimers();
    setGameState("ended");
    gameStateRef.current = "ended";

    const allResults = resultsRef.current;
    const deadKeysList = Object.entries(allResults)
      .filter(([_, r]) => r.status === "failed")
      .map(([id, r]) => r.key.label || id);

    if (deadKeysList.length === 0) {
      audio.playVictory();
    } else {
      audio.playMiss();
    }

    const report = {
      totalKeysTested: activeQueueRef.current.length,
      deadKeys: deadKeysList,
      score,
      maxStreak,
      allPassed: deadKeysList.length === 0,
      results: allResults,
    };

    if (onComplete) {
      onComplete(report);
    }
  };

  // Dispatch Doorstep Technician via existing API
  const handleAutoDispatchRepair = async () => {
    setBookingLoading(true);
    try {
      const deadKeysList = Object.entries(results)
        .filter(([_, r]) => r.status === "failed")
        .map(([id, r]) => r.key.label || id);

      const res = await fetch("/api/diagnostics/keyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetTag,
          deadKeys: deadKeysList,
          totalKeysTested: activeQueue.length,
          symptomReported: `Physical Button Test Failed: ${deadKeysList.join(", ")}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBookingDispatched(data);
      }
    } catch (e) {
      console.error("Failed to auto dispatch repair:", e);
    } finally {
      setBookingLoading(false);
    }
  };

  const currentTargetKey = activeQueue[currentIndex];
  const progressRatio = gameState === "playing" ? timeLeftMs / (timeLimitSec * 1000) : 1;
  const passedCount = Object.values(results).filter((r) => r.status === "passed").length;
  const failedCount = Object.values(results).filter((r) => r.status === "failed").length;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`rounded-2xl border border-purple-500/30 bg-slate-950/95 text-slate-100 shadow-2xl overflow-hidden transition-all ${
        standalone ? "p-6 sm:p-8 max-w-4xl mx-auto" : "p-4 sm:p-5"
      }`}
    >
      {/* Top Game Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                KeyStrike <span className="text-purple-400 text-xs font-mono">Reflex Test</span>
              </h3>
              <Badge variant="purple" className="text-[10px] px-1.5 py-0 font-mono">
                Hardware Speed Game
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Press each button on your keyboard before the countdown timer expires!
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Time limit selector */}
          {gameState === "idle" && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {[2.0, 3.0, 5.0].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeLimitSec(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    timeLimitSec === t
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-purple-400">Streak: {streak}🔥</span>
              <span className="text-emerald-400 font-bold">{score} pts</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="py-5">
        {/* STATE 1: IDLE */}
        {gameState === "idle" && (
          <div className="text-center py-6 space-y-4 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 mb-1 shadow-lg shadow-purple-950/50">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Suspect Broken Keyboard Buttons?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test your keyboard matrix under time pressure. The app will prompt you with buttons.
                Press each key within <strong>{timeLimitSec} seconds</strong>. Any unresponsive key is flagged as a physical switch defect.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {DEFAULT_SPRINT_KEYS.slice(0, 8).map((k) => (
                <span
                  key={k.id}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 shadow-inner"
                >
                  {k.display}
                </span>
              ))}
              <span className="text-[10px] text-slate-500">+4 more</span>
            </div>

            <div className="pt-3">
              <Button
                onClick={handleStartGame}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-purple-600/30"
              >
                <Play className="w-4 h-4 fill-current" /> Start Keyboard Reflex Test
              </Button>
            </div>
          </div>
        )}

        {/* STATE 2: COUNTDOWN */}
        {gameState === "countdown" && (
          <div className="text-center py-10 space-y-2">
            <div className="text-6xl font-black font-mono text-purple-400 animate-ping">
              {countdownNum}
            </div>
            <p className="text-xs text-slate-400 font-medium">Get your fingers ready on the keyboard...</p>
          </div>
        )}

        {/* STATE 3: PLAYING */}
        {gameState === "playing" && currentTargetKey && (
          <div className="space-y-5 max-w-lg mx-auto">
            {/* HUD Status Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-2">
              <span className="font-mono">
                Key <strong className="text-white">{currentIndex + 1}</strong> of {activeQueue.length}
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                ✓ {passedCount} working • ✗ {failedCount} missed
              </span>
            </div>

            {/* Countdown Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-75 ease-linear rounded-full ${
                    progressRatio > 0.5
                      ? "bg-gradient-to-r from-purple-500 to-cyan-400"
                      : progressRatio > 0.25
                      ? "bg-amber-500"
                      : "bg-rose-500 animate-pulse"
                  }`}
                  style={{ width: `${Math.max(0, progressRatio * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
                <span>PRESS NOW!</span>
                <span className={progressRatio <= 0.25 ? "text-rose-400 font-bold" : ""}>
                  {(timeLeftMs / 1000).toFixed(1)}s remaining
                </span>
              </div>
            </div>

            {/* Target Button Display Card */}
            <div className="relative p-6 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 text-center shadow-xl shadow-purple-950/40">
              <div className="text-[11px] uppercase tracking-widest text-purple-300 font-bold mb-2">
                Press Target Key:
              </div>

              {/* Huge Visual Keycap */}
              <div className="inline-block px-8 py-5 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-purple-400/60 shadow-2xl shadow-purple-500/20 text-white font-mono font-black text-4xl sm:text-5xl tracking-tight animate-bounce">
                {currentTargetKey.display}
              </div>

              <div className="mt-3 text-xs text-slate-400">
                Key name: <strong className="text-slate-200">{currentTargetKey.label}</strong>
              </div>

              {/* Real-time Hit/Miss Flash Banner */}
              {recentHitFeedback && (
                <div
                  className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono px-3 py-0.5 rounded-full border ${
                    recentHitFeedback.status === "hit"
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/80 border-rose-500/50 text-rose-300"
                  }`}
                >
                  {recentHitFeedback.status === "hit"
                    ? `⚡ HIT in ${recentHitFeedback.latencyMs}ms!`
                    : `⚠️ TIMEOUT: Unresponsive!`}
                </div>
              )}
            </div>

            {/* Interactive Visual Key Matrix Strip */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
              {activeQueue.map((k, idx) => {
                const res = results[k.id];
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={k.id}
                    className={`py-2 px-1 rounded-lg border text-center font-mono text-[10px] transition-all ${
                      isCurrent
                        ? "border-purple-400 bg-purple-600/30 text-white font-bold ring-2 ring-purple-500/50"
                        : res?.status === "passed"
                        ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-bold"
                        : res?.status === "failed"
                        ? "border-rose-500/60 bg-rose-950/40 text-rose-300 line-through"
                        : "border-slate-800 bg-slate-900/60 text-slate-400"
                    }`}
                  >
                    <div>{k.display.length > 5 ? k.display.slice(0, 3) : k.display}</div>
                    <div className="text-[8px] opacity-70">
                      {res?.status === "passed"
                        ? `${res.latencyMs}ms`
                        : res?.status === "failed"
                        ? "DEAD"
                        : "..."}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATE 4: GAME ENDED & DIAGNOSTIC REPORT */}
        {gameState === "ended" && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Header Result */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-purple-500/20 text-purple-400 mb-1">
                <Trophy className="w-6 h-6" />
              </div>

              <h4 className="text-lg font-bold text-white">Diagnostic Reflex Test Completed!</h4>

              <div className="flex justify-center gap-4 text-xs font-mono pt-1">
                <div>
                  <span className="text-slate-400 block">Score</span>
                  <span className="text-emerald-400 font-black text-base">{score} pts</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tested</span>
                  <span className="text-white font-black text-base">{activeQueue.length} Keys</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Passed</span>
                  <span className="text-emerald-300 font-black text-base">{passedCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dead / Failed</span>
                  <span className={`font-black text-base ${failedCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
                    {failedCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Hardware Assessment */}
            {failedCount === 0 ? (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-xs space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All Tested Buttons 100% Operational!
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Every button registered successfully within the required time limit. Switch contacts, debounce registers, and matrix traces are fully functional. No doorstep technician repair is required!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-xs space-y-3">
                <div className="font-bold text-rose-300 flex items-center gap-1.5 text-sm">
                  <XCircle className="w-4 h-4 text-rose-400" /> Physical Hardware Defect Detected!
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">Unresponsive / Timed-Out Buttons:</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(results)
                      .filter(([_, r]) => r.status === "failed")
                      .map(([id, r]) => (
                        <span
                          key={id}
                          className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold"
                        >
                          {r.key.display} ({r.key.label})
                        </span>
                      ))}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div>
                    <strong>Triage Classification:</strong>{" "}
                    {failedCount >= 3
                      ? "Keyboard Matrix Ribbon Cable Trace Fracture (Critical)"
                      : "Individual Switch Contact Fatigue (Moderate)"}
                  </div>
                  <div>
                    <strong>Recommended Action:</strong>{" "}
                    {failedCount >= 3
                      ? "OEM Keyboard Membrane & Flex Ribbon Assembly Replacement"
                      : "Precision Switch Cleaning / Mechanical Switch Swap"}
                  </div>
                </div>

                {/* 1-Click ONDC Doorstep Repair Dispatch */}
                {!bookingDispatched ? (
                  <Button
                    onClick={handleAutoDispatchRepair}
                    disabled={bookingLoading}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 gap-2 shadow-lg shadow-amber-900/30"
                  >
                    <Wrench className="w-4 h-4" />
                    {bookingLoading
                      ? "Dispatching Certified Doorstep Tech..."
                      : "Book Alex Rivera (Doorstep Technician via ONDC)"}
                  </Button>
                ) : (
                  <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 space-y-1 text-[11px]">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Doorstep Work Order Dispatched!
                    </div>
                    <div className="text-slate-300">
                      Technician: <strong>{bookingDispatched.executionHandoff?.technicianName || "Alex Rivera (Dell/HP Certified)"}</strong>
                    </div>
                    <div className="text-slate-400">
                      Service: {bookingDispatched.executionHandoff?.serviceType} • Tracking #{bookingDispatched.executionHandoff?.bookingId?.slice(0, 8)}
                    </div>
                    <div className="text-[10px] text-purple-300 font-mono mt-1">
                      ✓ Cryptographic Passport Event Committed to Blockchain Ledger
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Play Again */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleStartGame}
                className="flex-1 border-slate-800 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retest Keyboard (Play Again)
              </Button>
              <Link href="/assistant">
                <Button
                  variant="outline"
                  className="border-purple-500/40 text-purple-300 hover:text-white text-xs h-8 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Back to AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
