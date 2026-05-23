import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirectCeoFromAdvisorRoute } from "@/lib/redirect-ceo-from-advisor-routes";
import { GamePlayClient } from "@/components/game/GamePlayClient";

export default async function ExperiencePlayPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/experience/play")}`);
  redirectCeoFromAdvisorRoute(session.role);

  const googleOn = Boolean(process.env.NEXT_PUBLIC_GOOGLE_GAME_CLIENT_ID?.trim());
  return (
    <GamePlayClient
      backHref="/experience"
      questionnaireHomeHref="/experience"
      requireGameSession={googleOn}
    />
  );
}
