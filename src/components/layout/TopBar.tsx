import { LogoutButton } from "./LogoutButton";
import { usePathname } from "next/navigation";

export function TopBar({
  user,
  role,
}: {
  user: { name: string; email: string } | null;
  role?: string | null;
}) {
  const pathname = usePathname();
  const isCeo = (role ?? "").toLowerCase() === "ceo";
  const title = pathname.startsWith("/admin")
    ? "Arkadians Command Centre"
    : pathname.startsWith("/ceo")
      ? "Executive overview"
      : pathname === "/" && isCeo
        ? "Executive dashboard"
        : "The Arkadians Client Portfolio";
  return (
    <header className="sticky top-0 z-30 w-full bg-white/85 backdrop-blur border-b border-light-grey">
      <div className="h-16 px-5 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 h-9 rounded-full bg-cream border border-light-grey" />
          <div className="text-navy font-semibold tracking-tight text-base sm:text-lg">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-9 rounded-full border border-light-grey text-medium-grey hover:text-navy hover:bg-cream transition-colors px-3 text-xs tracking-wide"
            aria-label="Briefings"
          >
            Briefings
          </button>
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-navy max-w-[160px] truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-medium-grey max-w-[160px] truncate">
                  {user.email}
                </span>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-full bg-cream border border-light-grey"
              aria-hidden
            />
          )}
        </div>
      </div>
    </header>
  );
}
