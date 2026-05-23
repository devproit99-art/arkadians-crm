import { formatBudget } from "@/lib/budget";
import { formatDateTime12 } from "@/lib/datetime";

export type EmailTemplateType =
  | "initial_follow_up"
  | "after_viewing"
  | "payment_plan_follow_up"
  | "deposit_reminder"
  | "upgrade_upsell"
  | "reactivation";

export type WhatsappTemplateType =
  | "initial_follow_up"
  | "viewing_confirmation"
  | "callback_confirmation"
  | "payment_plan_follow_up"
  | "deposit_reminder"
  | "upgrade_upsell"
  | "reactivation";

export type WhatsappLanguage = "English" | "Roman Urdu";

export type GeneratorLeadLike = {
  id: string;
  name: string;
  status: string;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  preferredUnit?: string | null;
  preferredView?: string | null;
  urgency?: string | null;
  email?: string | null;
};

export type GeneratorActivityLike = {
  title: string;
  type: string;
  dueAt: Date | string | number | null;
};

export type GeneratorProgressLike = {
  stage: string;
  paymentStatus: string;
  nextAction: string;
  latestSignal?: string | null;
};

export type GenerateLeadEmailOptions = {
  lead: GeneratorLeadLike;
  advisorName: string;
  progress: GeneratorProgressLike;
  nextActivity?: GeneratorActivityLike | null;
  template: EmailTemplateType;
};

export type GenerateLeadWhatsappOptions = {
  lead: GeneratorLeadLike;
  advisorName: string;
  progress: GeneratorProgressLike;
  nextActivity?: GeneratorActivityLike | null;
  template: WhatsappTemplateType;
  language: WhatsappLanguage;
};

function unitLabel(u: string | null | undefined) {
  if (!u) return "";
  return u.includes("_") ? u.replaceAll("_", " ") : u;
}

function viewLabel(v: string | null | undefined) {
  if (!v) return "";
  return v.includes("_") ? v.replaceAll("_", " ") : v;
}

function budgetLabel(min: bigint | number | null | undefined, max: bigint | number | null | undefined) {
  const bMin = min == null ? null : typeof min === "bigint" ? min : BigInt(Math.trunc(min));
  const bMax = max == null ? null : typeof max === "bigint" ? max : BigInt(Math.trunc(max));
  return formatBudget(bMin, bMax);
}

function bookingLine(nextActivity?: GeneratorActivityLike | null) {
  if (!nextActivity?.dueAt) return "";
  const when = formatDateTime12(nextActivity.dueAt);
  return `Booking: ${nextActivity.title} — ${when}`;
}

export function generateLeadEmail(options: GenerateLeadEmailOptions): { subject: string; body: string } {
  const { lead, advisorName, progress, nextActivity, template } = options;
  const budget = budgetLabel(lead.budgetMin, lead.budgetMax);
  const interestBits = [unitLabel(lead.preferredUnit), viewLabel(lead.preferredView) ? `${viewLabel(lead.preferredView)} view` : ""]
    .filter(Boolean)
    .join(" · ");
  const booking = bookingLine(nextActivity);

  const greeting = `Dear ${lead.name || "Client"},`;
  const signoff = `Warm regards,\n${advisorName}\nArkadians`;

  const baseDetails = [
    interestBits ? `Interest: ${interestBits}` : "",
    budget && budget !== "—" ? `Budget: ${budget}` : "",
    `Stage: ${lead.status.replaceAll("_", " ")}`,
    booking,
  ]
    .filter(Boolean)
    .join("\n");

  if (template === "initial_follow_up") {
    return {
      subject: `Arkadians — Next steps for your enquiry`,
      body: [
        greeting,
        "",
        "Thank you for reaching out to Arkadians. I’d like to understand your preferences and recommend the best available options.",
        "",
        baseDetails ? `Quick summary:\n${baseDetails}` : "",
        "",
        "If you share your preferred timeline and the unit/view you’re leaning towards, I’ll shortlist options and propose a suitable viewing or call time.",
        "",
        signoff,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (template === "after_viewing") {
    return {
      subject: `Arkadians — Thank you for the viewing`,
      body: [
        greeting,
        "",
        "Thank you for your time today. Based on what you liked during the viewing, I can shortlist the best matching units and share a clear pricing + payment plan breakdown.",
        "",
        baseDetails ? `Summary:\n${baseDetails}` : "",
        "",
        `Recommended next step: ${progress.nextAction}`,
        "",
        "If you’d like, I can reserve the best option on hold while we finalize the plan.",
        "",
        signoff,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (template === "payment_plan_follow_up") {
    return {
      subject: `Arkadians — Payment plan options`,
      body: [
        greeting,
        "",
        "Sharing the next steps for the payment plan so you have full clarity.",
        "",
        baseDetails ? `Details:\n${baseDetails}` : "",
        "",
        `Current progress: ${progress.stage} · ${progress.paymentStatus}`,
        "",
        "If you confirm the preferred unit/view and your target monthly range, I’ll send the most suitable plan and lock in the timeline.",
        "",
        signoff,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (template === "deposit_reminder") {
    return {
      subject: `Arkadians — Deposit & reservation confirmation`,
      body: [
        greeting,
        "",
        "As discussed, the next step is the deposit to confirm reservation and secure the unit.",
        "",
        baseDetails ? `Reference:\n${baseDetails}` : "",
        "",
        `Current progress: ${progress.stage} · ${progress.paymentStatus}`,
        "",
        "If you’d like, I can share the exact deposit amount, account details, and the confirmation checklist so everything is smooth and documented.",
        "",
        signoff,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (template === "upgrade_upsell") {
    return {
      subject: `Arkadians — A premium option you may prefer`,
      body: [
        greeting,
        "",
        "Based on your preferences, there’s an upgrade option that typically suits clients looking for a better view/layout and long-term value.",
        "",
        baseDetails ? `Your criteria:\n${baseDetails}` : "",
        "",
        "If you confirm your top priority (view, size, or payment flexibility), I’ll send 2–3 upgraded recommendations with a clean comparison.",
        "",
        signoff,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  // reactivation
  return {
    subject: `Arkadians — Quick check-in`,
    body: [
      greeting,
      "",
      "Just checking in — I have a few options that match what you were looking for, and I can share updated availability and pricing.",
      "",
      baseDetails ? `Last known preferences:\n${baseDetails}` : "",
      "",
      "Would you prefer a quick call, or should I send a shortlist on WhatsApp first?",
      "",
      signoff,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function generateLeadWhatsapp(options: GenerateLeadWhatsappOptions): { message: string } {
  const { lead, advisorName, progress, nextActivity, template, language } = options;
  const budget = budgetLabel(lead.budgetMin, lead.budgetMax);
  const unit = unitLabel(lead.preferredUnit);
  const view = viewLabel(lead.preferredView);
  const when = nextActivity?.dueAt ? formatDateTime12(nextActivity.dueAt) : "";

  const isUrdu = language === "Roman Urdu";
  const name = lead.name || "Client";

  function line(...parts: Array<string | null | undefined>) {
    return parts.filter(Boolean).join(" ");
  }

  if (template === "initial_follow_up") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, ${advisorName} from Arkadians.`,
            line("Aap ke enquiry ke liye shukriya.", unit ? `Unit: ${unit}.` : null, view ? `View: ${view}.` : null),
            budget && budget !== "—" ? `Budget: ${budget}.` : "",
            "Aap ka best time call/visit ke liye kab hai?",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, ${advisorName} from Arkadians.`,
            line("Thanks for your enquiry.", unit ? `Unit: ${unit}.` : null, view ? `View: ${view}.` : null),
            budget && budget !== "—" ? `Budget: ${budget}.` : "",
            "What’s the best time for a quick call or viewing?",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  if (template === "viewing_confirmation") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, viewing confirm karni thi.`,
            when ? `Timing: ${when}` : "",
            "Aap please OK reply kar dein, aur main location/details share kar deta hun.",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, confirming your viewing.`,
            when ? `Time: ${when}` : "",
            "Please reply OK and I’ll share the location + details.",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  if (template === "callback_confirmation") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, callback confirm karni thi.`,
            when ? `Time: ${when}` : "",
            "Agar timing change karni ho to bata dein.",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, confirming our callback.`,
            when ? `Time: ${when}` : "",
            "If you want to adjust the time, just let me know.",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  if (template === "payment_plan_follow_up") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, payment plan options share kar raha hun.`,
            line(unit ? `Unit: ${unit}.` : null, view ? `View: ${view}.` : null),
            `Next step: ${progress.nextAction}`,
            "Aap apni preferred monthly range bata dein to main best plan finalize kar dun.",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, sharing payment plan options.`,
            line(unit ? `Unit: ${unit}.` : null, view ? `View: ${view}.` : null),
            `Next step: ${progress.nextAction}`,
            "If you share your preferred monthly range, I’ll finalize the best plan.",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  if (template === "deposit_reminder") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, unit secure karne ke liye deposit/reservation next step hai.`,
            budget && budget !== "—" ? `Budget: ${budget}.` : "",
            "Main deposit amount + confirmation checklist share kar deta hun—OK?",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, the next step to secure the unit is the deposit/reservation.`,
            budget && budget !== "—" ? `Budget: ${budget}.` : "",
            "Shall I share the deposit amount + confirmation checklist?",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  if (template === "upgrade_upsell") {
    return {
      message: isUrdu
        ? [
            `Salam ${name}, aap ki preference ke mutabiq ek premium upgrade option hai.`,
            "Aap ko priority kya hai: view, size ya payment flexibility?",
            "Main 2–3 best options shortlist karke bhej deta hun.",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hi ${name}, based on your preferences there’s a premium upgrade option you may like.`,
            "What’s your top priority: view, size, or payment flexibility?",
            "I’ll share a shortlist of the best options.",
          ]
            .filter(Boolean)
            .join("\n"),
    };
  }

  // reactivation
  return {
    message: isUrdu
      ? [
          `Salam ${name}, ${advisorName} from Arkadians.`,
          "Quick check-in—kuch fresh options available hain.",
          "Aap call prefer karen ge ya main WhatsApp par shortlist bhej doon?",
        ].join("\n")
      : [
          `Hi ${name}, ${advisorName} from Arkadians.`,
          "Quick check-in — I have a few updated options available.",
          "Would you prefer a quick call, or should I send a shortlist here first?",
        ].join("\n"),
  };
}

