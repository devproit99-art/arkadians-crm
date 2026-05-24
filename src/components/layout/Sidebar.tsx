"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArkLogo } from "@/components/shared/ArkLogo";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { navItemsForRole, type AppNavItem } from "@/lib/app-nav";

export function Sidebar({ sessionUser }: { sessionUser: SessionUser | null }) {
  const pathname = usePathname();
  const items = navItemsForRole(sessionUser?.role);
  const personalCommandCentre: AppNavItem = { href: "/", label: "Command Centre" };
  const isCeo = (sessionUser?.role ?? "").toLowerCase() === "ceo";
  const showFooterCommandLink = !isCeo;

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 bg-white relative border-r border-light-grey">
      <div className="w-full flex flex-col h-full">
        <div className="h-20 px-6 flex items-center border-b border-light-grey">
          <div className="flex items-center gap-3">
            <ArkLogo className="h-12 w-auto" />
            <div className="leading-tight">
              <div className="font-(--font-display) tracking-wide text-navy text-base">
                The Arkadians
              </div>
              <div className="text-xs text-medium-grey tracking-wider">
                Private Registry
              </div>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 flex flex-col gap-1">
          {items.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}-${index}`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "h-12 px-4 rounded-lg flex items-center text-sm tracking-wide transition-colors border border-transparent",
                  isActive
                    ? "bg-cream text-navy border-light-grey border-l-[3px] border-l-gold pl-[13px]"
                    : "text-medium-grey hover:bg-cream hover:text-navy",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-light-grey p-4 space-y-3">
          {showFooterCommandLink ? (
            <Link
              href={personalCommandCentre.href}
              aria-current={pathname === personalCommandCentre.href ? "page" : undefined}
              className={[
                "h-12 w-full px-4 rounded-lg flex items-center text-sm tracking-wide transition-colors border border-transparent",
                pathname === personalCommandCentre.href
                  ? "bg-cream text-navy border-light-grey border-l-[3px] border-l-gold pl-[13px]"
                  : "text-medium-grey hover:bg-cream hover:text-navy",
              ].join(" ")}
            >
              {personalCommandCentre.label}
            </Link>
          ) : null}
          <div className="rounded-xl bg-cream/60 border border-light-grey p-4">
            <div className="text-sm text-navy font-medium">{sessionUser?.name ?? "Guest"}</div>
            <div className="text-xs text-medium-grey mt-0.5">
              {sessionUser?.role ? sessionUser.role.replaceAll("_", " ") : "—"}
            </div>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}


