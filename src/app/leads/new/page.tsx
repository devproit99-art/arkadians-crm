import Link from "next/link";
import { RegisterProspectForm } from "@/components/leads/RegisterProspectForm";

export default function NewLeadPage() {
  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
          <Link href="/leads" className="hover:text-gold transition-colors">
            Prospects
          </Link>
          <span className="mx-2 text-light-grey">/</span>
          Register
        </div>
        <h1 className="mt-3 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
          Register new prospect
        </h1>
        <p className="mt-2 text-medium-grey max-w-2xl">
          Add a contact to the registry. They will appear as <strong>New</strong> in the pipeline.
        </p>

        <div className="mt-8 rounded-xl border border-gold/20 bg-white shadow-card p-6 sm:p-8">
          <RegisterProspectForm />
        </div>
      </div>
    </div>
  );
}
