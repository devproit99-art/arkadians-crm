export type AppNavItem = { href: string; label: string };

/** Full nav for managers, sales, and viewers (not CEO). */
export const STAFF_NAV_ITEMS: AppNavItem[] = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/pipeline/my-board", label: "My Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/leads", label: "Prospects" },
  { href: "/calls", label: "Calls" },
  { href: "/activities", label: "Activities" },
  { href: "/game", label: "Buyer Game" },
  { href: "/experience", label: "Buyer share link" },
  { href: "/construction", label: "Construction" },
  { href: "/settings", label: "Settings" },
];

const CEO_EXCLUDED_HREFS = new Set<string>([
  "/pipeline/my-board",
  "/calendar",
  "/calls",
  "/game",
  "/experience",
  "/settings",
]);

const ADMIN_NAV_PREFIX: AppNavItem[] = [
  { href: "/admin", label: "Arkadians Command Centre" },
  { href: "/admin/users", label: "User Management" },
  { href: "/inventory", label: "Inventory (Admin)" },
];

export function navItemsForRole(role: string | undefined | null): AppNavItem[] {
  const r = (role ?? "").toLowerCase();
  if (r === "admin") {
    return [...ADMIN_NAV_PREFIX, ...STAFF_NAV_ITEMS];
  }
  if (r === "ceo") {
    return [
      { href: "/ceo", label: "Executive overview" },
      { href: "/", label: "Command Centre" },
      ...STAFF_NAV_ITEMS.filter((item) => !CEO_EXCLUDED_HREFS.has(item.href)),
    ];
  }
  return STAFF_NAV_ITEMS;
}

