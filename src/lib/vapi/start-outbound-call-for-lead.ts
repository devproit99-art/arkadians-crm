/**
 * Outbound Vapi call for an existing CRM lead: creates a CallLog, then POSTs to Vapi.
 *
 * Callers today: manual UI only (`POST /api/vapi/outbound-call` with trigger `manual_ui`).
 * Future: import this from WhatsApp handlers, email workers, website-form routes, or
 * lead-import webhooks and pass the matching `OutboundCallTrigger` (and optionally extend
 * variableValues). Nothing in this file runs on lead create — wire triggers explicitly.
 */

import { CallLogDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildVapiLeadContext } from "@/lib/vapi-lead-context";

const VAPI_CALL_URL = "https://api.vapi.ai/call";

export type OutboundCallTrigger =
  | "manual_ui"
  | "whatsapp"
  | "email"
  | "website_form"
  | "lead_import_webhook";

export type StartOutboundCallInput = {
  leadId: string;
  trigger: OutboundCallTrigger;
};

export type StartOutboundCallErrorBody = {
  code: string;
  message: string;
  details?: string;
};

export type StartOutboundCallResult =
  | {
      ok: true;
      data: { callLogId: string; vapiCallId: string; status: "ringing" };
    }
  | {
      ok: false;
      httpStatus: number;
      error: StartOutboundCallErrorBody;
    };

type VapiCreateCallResponse = {
  id?: string;
  message?: string;
  error?: string;
};

export function vapiOutboundEnvMissing(): string[] {
  const missing: string[] = [];
  if (!process.env.VAPI_PRIVATE_KEY?.trim()) missing.push("VAPI_PRIVATE_KEY");
  if (!process.env.VAPI_PHONE_NUMBER_ID?.trim()) missing.push("VAPI_PHONE_NUMBER_ID");
  if (!process.env.VAPI_ASSISTANT_ID?.trim()) missing.push("VAPI_ASSISTANT_ID");
  return missing;
}

function normalizeCustomerPhone(raw: string): string {
  return raw.trim();
}

function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Single entry point for “call this lead via Vapi”. Safe to await from routes or jobs.
 * Does not validate UUID format (do that at the HTTP boundary if needed).
 */
export async function startOutboundCallForLead(
  input: StartOutboundCallInput,
): Promise<StartOutboundCallResult> {
  if (!hasDatabase()) {
    return {
      ok: false,
      httpStatus: 501,
      error: {
        code: "DATABASE_NOT_CONFIGURED",
        message: "DATABASE_URL is not configured for write operations.",
      },
    };
  }

  const missingEnv = vapiOutboundEnvMissing();
  if (missingEnv.length > 0) {
    return {
      ok: false,
      httpStatus: 503,
      error: {
        code: "VAPI_NOT_CONFIGURED",
        message: `Missing required environment variables: ${missingEnv.join(", ")}.`,
      },
    };
  }

  const lead = await prisma.lead.findFirst({
    where: { id: input.leadId, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      source: true,
      budgetMin: true,
      budgetMax: true,
      preferredUnit: true,
      preferredView: true,
      urgency: true,
      language: true,
    },
  });

  if (!lead) {
    return {
      ok: false,
      httpStatus: 404,
      error: { code: "LEAD_NOT_FOUND", message: "Lead not found." },
    };
  }

  const phone = lead.phone != null ? normalizeCustomerPhone(lead.phone) : "";
  if (!phone) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        code: "LEAD_NO_PHONE",
        message: "Lead has no phone number; cannot place outbound call.",
      },
    };
  }

  const startedAt = new Date();

  const callLog = await prisma.callLog.create({
    data: {
      leadId: lead.id,
      direction: CallLogDirection.OUTBOUND,
      status: "initiated",
      startedAt,
    },
  });

  const privateKey = process.env.VAPI_PRIVATE_KEY!.trim();
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID!.trim();
  const assistantId = process.env.VAPI_ASSISTANT_ID!.trim();

  const emailStr = lead.email?.trim() ?? "";

  // Keep Vapi variables minimal; assistant should confirm known CRM details.
  const ctx = buildVapiLeadContext({
    id: lead.id,
    name: lead.name,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    preferredUnit: lead.preferredUnit ?? null,
    preferredView: lead.preferredView ?? null,
    urgency: lead.urgency,
  });

  const variableValues: Record<string, string> = {
    leadId: ctx.leadId,
    callLogId: callLog.id,
    name: ctx.name,
    propertyInterest: ctx.propertyInterest,
    budgetText: ctx.budgetText,
    buyingIntent: ctx.buyingIntent,
    preferredView: ctx.preferredView,
    currentDate: ctx.currentDate,
    currentTime: ctx.currentTime,
    currentDateTime: ctx.currentDateTime,
    timezone: ctx.timezone,
  };

  const vapiPayload = {
    assistantId,
    phoneNumberId,
    customer: {
      number: phone,
      name: lead.name,
      ...(emailStr ? { email: emailStr } : {}),
    },
    assistantOverrides: {
      variableValues,
    },
  };

  const vapiRes = await fetch(VAPI_CALL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${privateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vapiPayload),
  });

  const vapiText = await vapiRes.text();
  let vapiJson: VapiCreateCallResponse | null = null;
  try {
    vapiJson = vapiText ? (JSON.parse(vapiText) as VapiCreateCallResponse) : null;
  } catch {
    vapiJson = null;
  }

  if (!vapiRes.ok) {
    const detail =
      vapiJson?.message ??
      vapiJson?.error ??
      (vapiText ? vapiText.slice(0, 500) : `HTTP ${vapiRes.status}`);
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status: "failed",
        outcome: detail.slice(0, 500),
      },
    });
    return {
      ok: false,
      httpStatus: 502,
      error: {
        code: "VAPI_CALL_FAILED",
        message: "Vapi rejected the outbound call request.",
        details: detail,
      },
    };
  }

  const vapiCallId = vapiJson?.id;
  if (!vapiCallId || typeof vapiCallId !== "string") {
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status: "failed",
        outcome: "Vapi response missing call id.",
      },
    });
    return {
      ok: false,
      httpStatus: 502,
      error: {
        code: "VAPI_INVALID_RESPONSE",
        message: "Vapi did not return a call id.",
      },
    };
  }

  await prisma.callLog.update({
    where: { id: callLog.id },
    data: {
      vapiCallId,
      status: "ringing",
    },
  });

  return {
    ok: true,
    data: {
      callLogId: callLog.id,
      vapiCallId,
      status: "ringing",
    },
  };
}
