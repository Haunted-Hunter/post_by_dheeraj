import { NextRequest, NextResponse } from "next/server";
import { parseTelegramAdminCommand, getSimulatedTelegramQueue, sendTelegramMessage, TELEGRAM_BACKUP_BOT_TOKEN } from "@/lib/telegram-service";
import { recordLearnedResolution } from "@/lib/self-learning-agent";
import { prisma } from "@/lib/prisma";
import { understandAndDiagnoseWithAi } from "@/lib/hardware-ai-agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Standard Telegram Webhook payload structure: { update_id, message: { from, chat, text, ... } }
    const message = body.message || body;
    const text = message.text || message.caption || body.command || "";
    const fromUser = message.from?.first_name 
      ? `${message.from.first_name} ${message.from.last_name || ""}`.trim()
      : "Lead Systems Administrator (via Telegram)";
    const chatId = message.chat?.id || body.chatId;

    if (!text) {
      return NextResponse.json({ ok: true, note: "Ignored empty message" });
    }

    const parsed = parseTelegramAdminCommand(text);

    if (parsed.command === "reply" && parsed.ticketId && parsed.resolutionMessage) {
      // Look up target escalation ticket
      let targetId = parsed.ticketId;
      let esc = await prisma.adminEscalation.findUnique({ where: { id: targetId } });

      // Fallback: search by prefix match or recent pending ticket if user provided short ID
      if (!esc) {
        const pending = await prisma.adminEscalation.findMany({
          where: { status: "pending" },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        const matched = pending.find((p) => p.id.startsWith(targetId) || targetId.includes(p.id.slice(0, 6)));
        if (matched) {
          esc = matched;
          targetId = matched.id;
        }
      }

      if (!esc) {
        return NextResponse.json({
          ok: false,
          error: `Escalation ticket #${targetId} not found in database`,
          telegramReply: `⚠️ Error: Could not find pending ticket #${targetId}. Check ticket ID and try again.`
        }, { status: 404 });
      }

      // Record learned resolution and seal in Passport
      const resolution = await recordLearnedResolution({
        escalationId: targetId,
        adminResponse: parsed.resolutionMessage,
        resolvedBy: `${fromUser} (via Telegram Bot)`,
      });

      // Deliver to user channel (Telegram Backup Bot or active Web Session)
      const { deliverResolutionToUserChat } = await import("@/lib/telegram-service");
      await deliverResolutionToUserChat(targetId, parsed.resolutionMessage);

      const responseText = [
        `✅ *[ESCALATION RESOLVED & DELIVERED]*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🎫 *Ticket:* \`${targetId}\``,
        `👤 *Resolved by:* ${fromUser}`,
        `💬 *Message Sent to User Chat:*`,
        `"${parsed.resolutionMessage}"`,
        ``,
        `🧠 *Self-Learning Model Calibrated:*`,
        `_Rule permanently committed to knowledge base. Future occurrences of this issue will now be solved autonomously by the AI!_`,
        `🔐 *Passport Hash:* \`${resolution.passportHash.slice(0, 16)}...\``
      ].join("\n");

      return NextResponse.json({
        ok: true,
        action: "resolution_recorded",
        ticketId: targetId,
        telegramReply: responseText,
        passportHash: resolution.passportHash,
      });
    }

    if (parsed.command === "status") {
      const pendingCount = await prisma.adminEscalation.count({ where: { status: "pending" } });
      return NextResponse.json({
        ok: true,
        telegramReply: `📊 *System Status:* ${pendingCount} escalations pending admin review. Use /reply <ticketId> <message> to respond.`
      });
    }

    if (parsed.command === "help" || text === "/start") {
      const helpMsg = `🤖 *ReUseChain PC Care & Triage Bot*\nCommands:\n• Describe any PC symptom or issue (e.g. "my laptop is overheating", "screen blue error", "keyboard buttons broken") to receive instant hardware diagnosis and circular suggestions!\n• \`/reply <ticketId> <resolution>\` - (Admins) Deliver resolution to user chat and train the AI\n• \`/status\` - View pending escalation queue`;
      if (chatId) await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, helpMsg);
      return NextResponse.json({ ok: true, telegramReply: helpMsg });
    }

    // Handle user PC symptom / diagnostic inquiry using same cognitive AI logic
    const aiDiag = await understandAndDiagnoseWithAi(text);

    const telegramReply = [
      `🤖 *ReUseChain PC Care AI (Telegram Backup Bot)*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 *Issue Diagnosis:* *${aiDiag.interpretedIntent}*`,
      `🧩 *Affected Component:* \`${aiDiag.affectedComponent}\``,
      ``,
      `📊 *Diagnostic Assessment:*`,
      `• *Health:* ${aiDiag.threeFactors.factor1_health}`,
      `• *Impact:* ${aiDiag.threeFactors.factor2_impact}`,
      `• *Root Cause:* ${aiDiag.threeFactors.factor3_rootCause}`,
      ``,
      `⚠️ *Tool Notice:* _Terminal commands and hardware sandbox probes execute on local PC console only. Because this session is remote on Telegram, live command execution is restricted. Remote cognitive triage applied._`,
      ``,
      `💡 *Recommended Circular Next Steps:*`,
      ``,
      `🛠️ *1. REPAIR (Doorstep Technician via ONDC)*`,
      `Book certified specialist Alex Rivera to service or replace hardware on-site.`,
      `• Schedule slot: Tomorrow, 10:30 AM Express Slot`,
      ``,
      `🔁 *2. REUSE & PARTS RESALE VALUATION*`,
      `If decommissioning this PC, working components can be sold or repurposed:`,
      `• *24GB DDR4 RAM:* Estimated Resale Value: *$45 - $55*`,
      `• *Samsung 512GB NVMe SSD:* Estimated Resale Value: *$38 - $48*`,
      `• *15.6" FHD IPS Display:* Estimated Resale Value: *$65 - $80*`,
      `💰 *Total Estimated Working Parts Resale Value:* *$185 - $235*`,
      ``,
      `🛠️ *How to make use of other components:*`,
      `• *NVMe SSD:* Slot into a $12 USB-C M.2 enclosure for a 1,000 MB/s external portable backup drive.`,
      `• *Display Panel:* Pair with an inexpensive $15 eDP-to-HDMI driver board to build a secondary portable monitor.`,
      `• *Motherboard/CPU:* Flash TrueNAS / OpenMediaVault to run a low-power 24/7 Home Server or NAS node.`,
      ``,
      `♻️ *3. RECYCLE (Certified Zero-Landfill)*`,
      `If device is non-repairable, schedule R2v3 zero-landfill e-waste pickup with guaranteed scrap credits (+$18.50).`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join("\n");

    if (chatId) {
      await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, telegramReply);
    }

    return NextResponse.json({
      ok: true,
      aiDiagnosis: aiDiag,
      telegramReply,
    });

  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const queue = getSimulatedTelegramQueue();
  const pendingCount = await prisma.adminEscalation.count({ where: { status: "pending" } });

  return NextResponse.json({
    status: "active",
    endpoint: "/api/telegram/webhook",
    pendingEscalationsCount: pendingCount,
    recentDispatches: queue.slice(0, 10),
  });
}
