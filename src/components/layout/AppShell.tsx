"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { SessionUser } from "@/lib/auth";

export function AppShell({
  children,
  sessionUser,
}: {
  children: ReactNode;
  sessionUser: SessionUser | null;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <div className="min-h-full bg-cream">{children}</div>;
  }

  return (
    <div className="min-h-full flex">
      <Sidebar sessionUser={sessionUser} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          user={sessionUser ? { name: sessionUser.name, email: sessionUser.email } : null}
          role={sessionUser?.role ?? null}
        />
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#FAFAFA]">{children}</main>
      </div>
    </div>
  );
}
