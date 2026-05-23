import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EditProspectForm } from "@/components/leads/EditProspectForm";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasDatabase()) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
            <Link href="/leads" className="hover:text-gold transition-colors">
              Prospects
            </Link>
            <span className="mx-2 text-light-grey">/</span>
            Edit
          </div>
          <h1 className="mt-3 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Edit prospect
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            Editing is only available for prospects saved in the database.
          </p>
          <div className="mt-8 rounded-xl border border-gold/20 bg-white shadow-card p-6 sm:p-8">
            <Link
              href={`/leads/${id}`}
              className="rounded-lg border border-light-grey bg-white px-6 py-3 text-sm font-semibold text-navy hover:border-gold hover:bg-cream/40 transition-colors"
            >
              Back to prospect
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      source: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      preferredUnit: true,
      preferredView: true,
      urgency: true,
      language: true,
      notes: true,
    },
  });

  if (!lead) {
    return (
      <div className="px-5 sm:px-8 py-8">
        <div className="w-full max-w-none">
          <Link
            href="/pipeline"
            className="text-sm font-medium text-medium-grey hover:text-navy transition-colors"
          >
            ← Back to pipeline
          </Link>
          <div className="mt-6 rounded-xl border border-light-grey bg-white shadow-card p-6">
            <div className="font-(--font-display) text-lg text-navy">Prospect not found</div>
            <p className="mt-2 text-medium-grey text-sm">
              This lead does not exist, was removed, or is not editable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
          <Link href="/leads" className="hover:text-gold transition-colors">
            Prospects
          </Link>
          <span className="mx-2 text-light-grey">/</span>
          <Link href={`/leads/${lead.id}`} className="hover:text-gold transition-colors">
            {lead.name}
          </Link>
          <span className="mx-2 text-light-grey">/</span>
          Edit
        </div>
        <h1 className="mt-3 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
          Edit prospect
        </h1>
        <p className="mt-2 text-medium-grey max-w-2xl">
          Update this prospect’s profile. Changes are saved immediately to the CRM.
        </p>

        <div className="mt-8 rounded-xl border border-gold/20 bg-white shadow-card p-6 sm:p-8">
          <EditProspectForm
            lead={{
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              source: lead.source,
              status: lead.status,
              budgetMin: lead.budgetMin != null ? Number(lead.budgetMin) : null,
              budgetMax: lead.budgetMax != null ? Number(lead.budgetMax) : null,
              preferredUnit: lead.preferredUnit,
              preferredView: lead.preferredView,
              urgency: lead.urgency,
              language: lead.language,
              notes: lead.notes,
            }}
          />
        </div>
      </div>
    </div>
  );
}

