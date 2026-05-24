import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";
import { ResidenceSelector } from "@/components/game/ResidenceSelector";
import { BuyerShareUrls } from "@/components/experience/BuyerShareUrls";

export default async function GamePage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/game")}`);
  redirectCeoFromAdvisorRoute(session.role);

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
          <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Buyer Game
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            Buyers complete the questionnaire below; after the final step they can open the 3D Arkadians experience
            (from the{" "}
            <a
              href="https://github.com/cerebriustech-AutomateX/arkadians-game"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy hover:text-gold transition-colors"
            >
              arkadians-game
            </a>{" "}
            repo, served from this app). Share the public buyer links below (full URLs + copy).
          </p>
          <div className="mt-4 max-w-2xl">
            <BuyerShareUrls variant="inline" />
          </div>
          </div>
          <button
            type="button"
            className="rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow"
          >
            New Session
          </button>
        </div>

        <div className="mt-8">
          <ResidenceSelector />
        </div>
      </div>
    </div>
  );
}


