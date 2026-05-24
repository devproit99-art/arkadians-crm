import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";
import { ExperienceClient } from "@/components/experience/ExperienceClient";

export default async function ExperiencePage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/experience")}`);
  redirectCeoFromAdvisorRoute(session.role);

  return (
    <div className="min-h-full bg-cream px-5 sm:px-8 py-10">
      <div className="max-w-[980px] mx-auto">
        <div className="mb-8">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Arkadians · Buyer journey</div>
          <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">Discover your residence</h1>
        </div>
        <ExperienceClient />
      </div>
    </div>
  );
}

