import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";
import { GamePlayClient } from "@/components/game/GamePlayClient";

export default async function GamePlayPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/game/play")}`);
  redirectCeoFromAdvisorRoute(session.role);

  return (
    <GamePlayClient backHref="/game" questionnaireHomeHref="/game" requireGameSession={false} />
  );
}
