import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordLearnedResolution } from "@/lib/self-learning-agent";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let ticketId = searchParams.get("ticketId") || searchParams.get("id");

    let escalation: any = null;
    if (ticketId) {
      escalation = await prisma.adminEscalation.findUnique({
        where: { id: ticketId },
      });
    }

    if (!escalation) {
      // Fallback: check most recent pending escalation
      escalation = await prisma.adminEscalation.findFirst({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      });
      if (escalation) {
        ticketId = escalation.id;
      }
    }

    if (!escalation) {
      return NextResponse.json(
        { success: false, error: `Escalation #${ticketId || "pending"} not found` },
        { status: 404 }
      );
    }

    // If still pending, check live Telegram getUpdates for admin replies
    if (escalation.status === "pending") {
      try {
        const {
          TELEGRAM_ADMIN_BOT_TOKEN,
          parseTelegramAdminCommand,
          deliverResolutionToUserChat,
          sendTelegramMessage,
        } = await import("@/lib/telegram-service");

        const tgRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/getUpdates?limit=10`
        );
        if (tgRes.ok) {
          const uJson = await tgRes.json();
          if (uJson.ok && Array.isArray(uJson.result)) {
            for (const update of uJson.result) {
              const msg = update.message;
              if (!msg) continue;
              const rawText = (msg.text || msg.caption || "").trim();
              const replyToText = msg.reply_to_message?.text;
              const chatId = msg.chat?.id;

              const parsed = parseTelegramAdminCommand(rawText, replyToText);
              if (parsed.command === "reply" && parsed.resolutionMessage) {
                const targetMatch =
                  !parsed.ticketId ||
                  escalation.id.startsWith(parsed.ticketId) ||
                  parsed.ticketId.includes(escalation.id.slice(0, 6));

                if (targetMatch) {
                    const fromUser = msg.from?.first_name
                      ? `${msg.from.first_name} ${msg.from.last_name || ""}`.trim()
                      : "Lead Systems Administrator";

                    await recordLearnedResolution({
                      escalationId: escalation.id,
                      adminResponse: parsed.resolutionMessage,
                      resolvedBy: `${fromUser} (via Telegram Bot)`,
                    });

                    await deliverResolutionToUserChat(escalation.id, parsed.resolutionMessage);

                    // Acknowledge update offset so it's not processed repeatedly
                    await fetch(
                      `https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/getUpdates?offset=${update.update_id + 1}&limit=1`
                    );

                    if (chatId) {
                      await sendTelegramMessage(
                        TELEGRAM_ADMIN_BOT_TOKEN,
                        chatId,
                        `✅ *[Solution Applied to User Chat]*\nTicket: \`#${escalation.id.slice(0, 8)}\`\nStatus: Resolved & Delivered!`
                      );
                    }

                    const updatedEsc = await prisma.adminEscalation.findUnique({
                      where: { id: ticketId || escalation.id },
                    });

                    if (updatedEsc) {
                      return NextResponse.json({
                        success: true,
                        data: {
                          id: updatedEsc.id,
                          status: updatedEsc.status,
                          adminResponse: updatedEsc.adminResponse,
                          learnedRule: updatedEsc.learnedRule,
                          resolvedBy: updatedEsc.resolvedBy,
                          urgency: updatedEsc.urgency,
                          updatedAt: updatedEsc.updatedAt,
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (tgErr: any) {
        console.warn("Auto-check Telegram updates in status route:", tgErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: escalation.id,
        status: escalation.status,
        adminResponse: escalation.adminResponse,
        learnedRule: escalation.learnedRule,
        resolvedBy: escalation.resolvedBy,
        urgency: escalation.urgency,
        updatedAt: escalation.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to query escalation status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Quick simulate endpoint for testing Telegram Admin replies
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, escalationId, adminResponse, learnedRule, resolvedBy } = body;
    const targetId = ticketId || escalationId;

    if (!targetId || !adminResponse) {
      return NextResponse.json(
        { success: false, error: "ticketId and adminResponse are required" },
        { status: 400 }
      );
    }

    const result = await recordLearnedResolution({
      escalationId: targetId,
      adminResponse,
      learnedRule: learnedRule || "Verified resolution recorded to self-learning memory.",
      resolvedBy: resolvedBy || "Lead Systems Administrator (via Telegram Bot)",
    });

    return NextResponse.json({
      success: true,
      message: "Admin resolution recorded! Delivered to live user chat and model calibrated.",
      data: result.learnedItem,
      passportHash: result.passportHash,
    });
  } catch (error: any) {
    console.error("Failed to resolve escalation via status route:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
