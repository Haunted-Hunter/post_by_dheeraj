import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export interface LearnedKnowledgeItem {
  id: string;
  escalationId: string;
  symptomSignature: string;
  keywords: string[];
  adminResponse: string;
  learnedRule: string;
  resolvedBy: string;
  passportHash: string;
  learnedAt: Date;
  timesApplied: number;
}

// Non-symptom conversational and escalation words that must never be treated as diagnostic signatures
const NON_SYMPTOM_WORDS = new Set([
  "please", "escalate", "admin", "help", "matter", "what", "whats", "problem", "this", "that",
  "with", "have", "your", "from", "getting", "behavior", "encountered", "during", "issue",
  "ticket", "report", "system", "tell", "need", "could", "would", "should", "know", "dont",
  "does", "like", "when", "then", "into", "about", "just", "some", "other", "user", "device",
  "across", "which", "there", "their", "here", "were", "been", "also", "only", "more", "forward",
  "error", "check", "code", "bugs"
]);

// In-memory hot cache for instant lookup
const learnedCache: Map<string, LearnedKnowledgeItem> = new Map();

/**
 * Seed initial standard domain knowledge rules if cache is empty
 */
function ensureBaseRules() {
  if (learnedCache.size === 0) {
    const baseRule: LearnedKnowledgeItem = {
      id: "rule-aspm-pcie",
      escalationId: "ESC-PRESET-01",
      symptomSignature: "pcie aspm power state collision wifi latency",
      keywords: ["aspm", "pcie", "realtek", "wlan", "0x800f", "race condition"],
      adminResponse: "For PCIe ASPM power state collisions, disable ASPM L1.2 in BIOS and enforce High Performance power plan in Windows. Update Realtek WLAN driver to v6001.0.15.341.",
      learnedRule: "For PCIe ASPM power state collisions, disable ASPM L1.2 in BIOS and enforce High Performance power plan.",
      resolvedBy: "Lead Systems Administrator (via Telegram)",
      passportHash: sha256("BASE_RULE_ASPM_PCIE"),
      learnedAt: new Date(),
      timesApplied: 3,
    };
    learnedCache.set(baseRule.id, baseRule);
  }
}

/**
 * Commit a newly resolved Admin Escalation to the Self-Learning Knowledge Base
 */
export async function recordLearnedResolution(params: {
  escalationId: string;
  adminResponse: string;
  learnedRule?: string;
  resolvedBy?: string;
}): Promise<{
  success: boolean;
  learnedItem: LearnedKnowledgeItem;
  passportHash: string;
}> {
  ensureBaseRules();

  const { escalationId, adminResponse, resolvedBy = "Lead Systems Administrator (via Telegram)" } = params;

  // 1. Fetch current escalation from Prisma
  const escalation = await prisma.adminEscalation.findUnique({
    where: { id: escalationId },
  });

  if (!escalation) {
    throw new Error(`Escalation ticket #${escalationId} not found`);
  }

  // 2. Synthesize or clean the learned rule
  let ruleText = params.learnedRule;
  if (!ruleText || ruleText.trim().length < 5) {
    ruleText = `Resolution for "${escalation.symptomSummary.slice(0, 60)}": ${adminResponse.slice(0, 140)}`;
  }

  // 3. Update Escalation in Prisma
  const updated = await prisma.adminEscalation.update({
    where: { id: escalationId },
    data: {
      adminResponse,
      learnedRule: ruleText,
      resolvedBy,
      status: "resolved",
    },
  });

  // 4. Log to Circularity Passport with cryptographic hash
  const eventHash = sha256(`LEARNED_RULE:${escalationId}:${adminResponse}:${Date.now()}`);
  const dev = escalation.deviceId
    ? await prisma.device.findUnique({ where: { id: escalation.deviceId } })
    : await prisma.device.findFirst();
  const deviceId = dev?.id || (await prisma.device.findFirst())?.id;

  if (deviceId) {
    const lastEvent = await prisma.passportEvent.findFirst({ orderBy: { timestamp: "desc" } });
    const prevHash = lastEvent ? lastEvent.eventHash : "GENESIS_BLOCK_000000000000000000000000000000000000";

    await prisma.passportEvent.create({
      data: {
        deviceId,
        eventCategory: "control",
        eventType: "TELEGRAM_ADMIN_KNOWLEDGE_SEALED",
        actor: resolvedBy,
        description: `Agent self-improved via Telegram admin response. Learned rule: ${ruleText.slice(0, 160)}`,
        eventHash,
        prevHash,
      },
    });
  }

  // 5. Extract strictly technical keywords from query & symptom for fast matching
  const combinedText = `${escalation.queryText} ${escalation.symptomSummary}`.toLowerCase();
  const tokens = Array.from(new Set(
    combinedText
      .replace(/[^a-z0-9_\-\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !NON_SYMPTOM_WORDS.has(t))
  ));

  const learnedItem: LearnedKnowledgeItem = {
    id: `learned-${escalationId}`,
    escalationId,
    symptomSignature: escalation.symptomSummary.toLowerCase(),
    keywords: tokens,
    adminResponse,
    learnedRule: ruleText,
    resolvedBy,
    passportHash: eventHash,
    learnedAt: new Date(),
    timesApplied: 0,
  };

  learnedCache.set(learnedItem.id, learnedItem);

  return {
    success: true,
    learnedItem,
    passportHash: eventHash,
  };
}

/**
 * Check if a new user query or photo symptoms match previously learned admin knowledge
 */
export async function findLearnedKnowledgeMatch(
  queryText: string,
  photoContext?: string
): Promise<{
  matched: boolean;
  match?: LearnedKnowledgeItem;
  similarityScore: number;
  explanation?: string;
}> {
  ensureBaseRules();

  const text = `${queryText} ${photoContext || ""}`.toLowerCase();

  // If user is explicitly requesting admin escalation or stating AI does not know, NEVER intercept with learned knowledge
  const isEscalationRequest = 
    text.includes("admin") ||
    text.includes("escalat") ||
    text.includes("forward") ||
    text.includes("not sure") ||
    text.includes("dont know") ||
    text.includes("don't know") ||
    text.includes("cant answer") ||
    text.includes("can't answer") ||
    text.includes("cannot answer") ||
    text.includes("seek help") ||
    text.includes("seek for help");

  if (isEscalationRequest) {
    return { matched: false, similarityScore: 0 };
  }

  // Also query database for any resolved escalations that might not be in the hot cache
  try {
    const dbResolved = await prisma.adminEscalation.findMany({
      where: {
        status: "resolved",
        adminResponse: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    for (const esc of dbResolved) {
      const cacheKey = `learned-${esc.id}`;
      if (!learnedCache.has(cacheKey) && esc.adminResponse) {
        const combined = `${esc.queryText} ${esc.symptomSummary}`.toLowerCase();
        const tokens = Array.from(new Set(
          combined
            .replace(/[^a-z0-9_\-\s]/g, " ")
            .split(/\s+/)
            .filter((t) => t.length > 3 && !NON_SYMPTOM_WORDS.has(t))
        ));
        learnedCache.set(cacheKey, {
          id: cacheKey,
          escalationId: esc.id,
          symptomSignature: esc.symptomSummary.toLowerCase(),
          keywords: tokens,
          adminResponse: esc.adminResponse,
          learnedRule: esc.learnedRule || "Verified admin protocol.",
          resolvedBy: esc.resolvedBy || "Lead Systems Administrator (via Telegram)",
          passportHash: sha256(`PREV_RESOLVED:${esc.id}`),
          learnedAt: esc.updatedAt,
          timesApplied: 1,
        });
      }
    }
  } catch (err) {
    // If DB read fails, continue with in-memory cache
  }

  let bestMatch: LearnedKnowledgeItem | null = null;
  let highestScore = 0;

  for (const item of Array.from(learnedCache.values())) {
    let matchesCount = 0;

    // Check specific error codes (e.g. 0x800f, 0x000000d1, 0x80070005, etc.)
    const hexCodes = text.match(/0x[0-9a-f]+/gi);
    if (hexCodes && hexCodes.length > 0) {
      for (const hex of hexCodes) {
        if (item.symptomSignature.includes(hex.toLowerCase()) || item.keywords.includes(hex.toLowerCase())) {
          matchesCount += 4;
        }
      }
    }

    // Check non-stopword keyword token overlaps
    for (const token of item.keywords) {
      if (!NON_SYMPTOM_WORDS.has(token) && text.includes(token)) {
        matchesCount += 1;
      }
    }

    // Direct signature substring inclusion
    if (item.symptomSignature.length > 12 && text.includes(item.symptomSignature.slice(0, 24))) {
      matchesCount += 3;
    }

    const score = item.keywords.length > 0 ? matchesCount / Math.max(item.keywords.length * 0.5, 3) : 0;

    if (matchesCount >= 3 && score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore >= 0.7) {
    bestMatch.timesApplied += 1;
    return {
      matched: true,
      match: bestMatch,
      similarityScore: Math.min(highestScore, 0.99),
      explanation: `Knowledge match found (Ticket #${bestMatch.escalationId}). Resolution previously provided by ${bestMatch.resolvedBy}.`,
    };
  }

  return {
    matched: false,
    similarityScore: 0,
  };
}

/**
 * Retrieve all registered learned rules
 */
export function getAllLearnedKnowledge(): LearnedKnowledgeItem[] {
  ensureBaseRules();
  return Array.from(learnedCache.values());
}
