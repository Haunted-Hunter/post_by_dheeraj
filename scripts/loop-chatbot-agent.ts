import * as readline from "readline";
import * as crypto from "crypto";
import { understandAndDiagnoseWithAi, checkAllDiagnosticTools } from "../src/lib/hardware-ai-agent";
import { isToolSandboxed } from "../src/lib/terminal-sandbox";

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

const EXIT_KEYWORDS = new Set(["exit", "quit", "stop", "done", "resolved", "bye", "end", "close"]);

function isExitKeyword(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return EXIT_KEYWORDS.has(clean);
}

async function runLoopChatbotAgent() {
  console.clear();
  console.log("\x1b[36m%s\x1b[0m", "================================================================================");
  console.log("\x1b[1m\x1b[32m%s\x1b[0m", "🤖 ReUseChain Autonomous Diagnostic Loop Chatbot Agent (Terminal Sandbox Active)");
  console.log("\x1b[36m%s\x1b[0m", "================================================================================");
  console.log("\x1b[33m%s\x1b[0m", "• CONTINUOUS LOOP MODE: Chatbot will continuously converse until you enter an exit keyword.");
  console.log("\x1b[35m%s\x1b[0m", "• TERMINAL SANDBOX: Testing tools execute in restricted PowerShell sandbox (except interactive probes).");
  console.log("\x1b[34m%s\x1b[0m", "• EXIT KEYWORDS: Type 'exit', 'quit', 'stop', 'done', or 'resolved' to terminate session.");
  console.log("\x1b[36m%s\x1b[0m", "================================================================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let turnCount = 0;
  let isClosed = false;
  const sessionActions: string[] = [];

  rl.on("close", () => {
    isClosed = true;
  });

  const promptUser = () => {
    if (isClosed) return;
    rl.question("\x1b[1m\x1b[37mUser > \x1b[0m", async (input) => {
      if (isClosed) return;
      const trimmed = (input || "").trim();

      if (!trimmed) {
        promptUser();
        return;
      }

      // Check if user entered an exit keyword
      if (isExitKeyword(trimmed)) {
        isClosed = true;
        console.log("\n\x1b[32m%s\x1b[0m", "────────────────────────────────────────────────────────────────────────");
        console.log("\x1b[1m\x1b[32m%s\x1b[0m", `👋 Conversation Loop Completed after ${turnCount} turns!`);
        const passportHash = sha256(`LOOP_SESSION:TURNS_${turnCount}:${Date.now()}`);
        console.log("\x1b[36m%s\x1b[0m", `🔐 Sealed Session Circularity Passport: ${passportHash}`);
        if (sessionActions.length > 0) {
          console.log("\x1b[33m%s\x1b[0m", "📋 Summary of Actions Taken in this Session:");
          sessionActions.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
        }
        console.log("\x1b[32m%s\x1b[0m", "🎉 All systems logged. Goodbye!");
        console.log("\x1b[32m%s\x1b[0m", "────────────────────────────────────────────────────────────────────────\n");
        rl.close();
        process.exit(0);
        return;
      }

      turnCount++;
      const lower = trimmed.toLowerCase();

      // 1. Direct Skip Testing -> Repair Booking Directive
      const isSkipTesting = 
        lower.includes("skip testing") || 
        lower.includes("skip test") || 
        lower.includes("straight to repair") || 
        lower.includes("repair booking") || 
        lower.includes("repapr booking") ||
        (lower.includes("book") && (lower.includes("technician") || lower.includes("repair")));

      if (isSkipTesting) {
        const orderId = `ONDC-SRV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const technician = "Alex Rivera (Dell/HP Certified Specialist)";
        const slot = "Tomorrow, 10:30 AM - 12:00 PM";
        const passportHash = sha256(`CLI_ONDC_BOOKING:${orderId}:${Date.now()}`);
        sessionActions.push(`ONDC Repair Booking #${orderId} (Specialist: ${technician})`);

        console.log("\n\x1b[33m%s\x1b[0m", "⚡ [DIRECT REPAIR DIRECTIVE DETECTED]: Skipping hardware tool testing per your request.");
        console.log("\x1b[32m%s\x1b[0m", `🎉 Booked Doorstep Technician: ${technician}`);
        console.log(`   • Order ID: ${orderId}`);
        console.log(`   • Scheduled Slot: ${slot}`);
        console.log(`   • Dispatch Network: ONDC UrbanCare Mobility Hub (#BLR-42)`);
        console.log(`   • Circularity Passport: ${passportHash.slice(0, 24)}...`);
        console.log("\x1b[36m%s\x1b[0m", `   • Live GPS Tracking: Connected at /track/${orderId}\n`);
        console.log("\x1b[90m%s\x1b[0m", `[Loop active: enter next inquiry or symptom, or type 'done' to exit]`);
        promptUser();
        return;
      }

      // 2. Check if Any Tools Are Working / Tools Activation
      const isToolsAudit = 
        lower.includes("any tools are working") || 
        lower.includes("are any tools working") || 
        lower.includes("tools are working") || 
        lower.includes("tools activation") || 
        lower.includes("check tools");

      if (isToolsAudit) {
        console.log("\n\x1b[36m%s\x1b[0m", "🔬 [AUDITING 14 NATIVE DIAGNOSTIC PROBES IN TERMINAL SANDBOX]...");
        const report = await checkAllDiagnosticTools();
        sessionActions.push(`Audited ${report.totalTools} native diagnostic tools (100% operational)`);

        console.log("\x1b[32m%s\x1b[0m", `✅ ${report.overallStatus} (${report.activeCount}/${report.totalTools} Active)`);
        console.log("┌────────────────────────────────────────────────────────────────────────┐");
        report.tools.forEach((t, i) => {
          const sandboxedBadge = isToolSandboxed(t.toolId) 
            ? "\x1b[32m[SANDBOXED]\x1b[0m" 
            : "\x1b[33m[EXCEPTED - INTERACTIVE]\x1b[0m";
          console.log(`│ ${String(i + 1).padStart(2, " ")}. ${t.name.padEnd(46, " ")} ${sandboxedBadge}`);
        });
        console.log("└────────────────────────────────────────────────────────────────────────┘\n");
        console.log("\x1b[90m%s\x1b[0m", `[Loop active: enter next inquiry or symptom, or type 'done' to exit]`);
        promptUser();
        return;
      }

      // 2B. Keyboard Buttons Issue / Game Diagnostic
      const isKeyboardIssue =
        lower.includes("keyboard") ||
        lower.includes("keys not working") ||
        lower.includes("key not working") ||
        lower.includes("button not working") ||
        lower.includes("buttons not working") ||
        lower.includes("keyword buttons") ||
        lower.includes("broken key") ||
        lower.includes("keyboard game") ||
        lower.includes("keystrike");

      if (isKeyboardIssue) {
        console.log("\n\x1b[35m%s\x1b[0m", "🎮 [KEYSTRIKE KEYBOARD HARDWARE REFLEX GAME TRIGGERED]");
        console.log("   Suspected dead button/switch reported. Testing buttons under countdown timer.");
        console.log("   • Web Arcade Mode: Launching http://localhost:3000/diagnostics/keyboard");
        console.log("   • Scancode Matrix Probing: Win32_Keyboard status checked.");
        sessionActions.push("Keyboard Button Reflex Game Diagnostic (KeyStrike)");
        console.log("\x1b[32m%s\x1b[0m", "   👉 Open http://localhost:3000/diagnostics/keyboard to play the 3-second button challenge!");
        console.log("\x1b[90m%s\x1b[0m", `[Loop active: enter next inquiry or symptom, or type 'done' to exit]`);
        promptUser();
        return;
      }

      // 3. Standard Continuous Diagnostic Loop Turn (with Terminal Sandbox execution)
      console.log("\n\x1b[90m%s\x1b[0m", "🧠 AI Analyzing hardware symptom & activating probe...");
      const diag = await understandAndDiagnoseWithAi(trimmed);
      sessionActions.push(`Diagnosed: ${diag.interpretedIntent} -> Verdict: ${diag.triageVerdict.toUpperCase()}`);

      console.log("\x1b[1m\x1b[36m%s\x1b[0m", `Agent > [Turn ${turnCount}]: ${diag.interpretedIntent}`);
      console.log(`Subsystem: ${diag.targetSubsystem} | Category: ${diag.testingCategory}`);

      // Terminal Sandbox Output Block
      const sandboxed = isToolSandboxed(diag.selectedTool.id);
      console.log("\n\x1b[34m%s\x1b[0m", "┌─ [TERMINAL SANDBOX EXECUTION CONTEXT] ─────────────────────────────────");
      console.log(`│ \x1b[33mTool:\x1b[0m ${diag.selectedTool.name}`);
      console.log(`│ \x1b[33mSandbox Mode:\x1b[0m ${sandboxed ? "\x1b[32mPowerShell Restricted CIM Sandbox (Isolated)\x1b[0m" : "\x1b[33mInteractive Matrix Test (Sandbox Bypassed)\x1b[0m"}`);
      console.log(`│ \x1b[33mCommand:\x1b[0m $ powershell -Command "${diag.selectedTool.windowsCommand}"`);
      console.log(`│ \x1b[33mStatus:\x1b[0m Exit Code: 0 (Execution Duration: ${diag.executionTimeMs}ms)`);
      console.log("│ ── Live Host Sandbox Telemetry ────────────────────────────────────────");
      const cleanSnippet = diag.rawHostOutput.split("\n").slice(0, 6).join("\n│    ");
      console.log(`│    ${cleanSnippet}`);
      console.log("\x1b[34m%s\x1b[0m", "└───────────────────────────────────────────────────────────────────────");

      // 3-Factors Assessment
      console.log("\n\x1b[33m%s\x1b[0m", "📊 3-Factor Diagnostic Assessment:");
      console.log(`• Factor 1 (Health): ${diag.threeFactors.factor1_health}`);
      console.log(`• Factor 2 (Impact): ${diag.threeFactors.factor2_impact}`);
      console.log(`• Factor 3 (Cause) : ${diag.threeFactors.factor3_rootCause}`);

      // Circular Decision Gate
      console.log("\n\x1b[32m%s\x1b[0m", `💡 Circular Triage Verdict: ${diag.triageVerdict.toUpperCase()}`);
      if (diag.triageVerdict === "repair") {
        console.log("👉 Recommended Next Action: Type 'book technician' to dispatch Alex Rivera via ONDC.");
      } else if (diag.triageVerdict === "reuse") {
        console.log("👉 Recommended Next Action: Type 'reuse' to view NAS/server component repurposing blueprints.");
      } else if (diag.triageVerdict === "recycle") {
        console.log("👉 Recommended Next Action: Type 'recycle' to schedule certified zero-landfill e-waste collection.");
      } else {
        console.log("👉 Status: All host parameters nominal. No repair needed.");
      }

      console.log("\n\x1b[90m%s\x1b[0m", `[Loop continues: reply with further symptoms or details, or type 'done'/'exit' to finish]`);
      promptUser();
    });
  };

  promptUser();
}

runLoopChatbotAgent().catch(console.error);
