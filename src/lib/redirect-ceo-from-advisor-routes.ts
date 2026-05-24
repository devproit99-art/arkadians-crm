import { redirect } from "next/navigation";

/** CEO uses Command Centre, pipeline, prospects, activities, and construction only. */
export function redirectCeoFromAdvisorRoute(role: string | undefined | null) {
  if ((role ?? "").toLowerCase() === "ceo") {
    redirect("/");
  }
}

