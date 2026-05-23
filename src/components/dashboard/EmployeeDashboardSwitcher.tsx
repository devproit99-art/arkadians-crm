"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type DashboardUserOption = {
  id: string;
  name: string;
};

export function EmployeeDashboardSwitcher({
  options,
  selectedOwnerId,
}: {
  options: DashboardUserOption[];
  selectedOwnerId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const value = selectedOwnerId;
  const canRender = options.length > 0;

  const items = useMemo(() => options, [options]);

  if (!canRender) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-[11px] tracking-[0.2em] uppercase text-medium-grey">
        Viewing dashboard
      </span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          const nextParams = new URLSearchParams(sp.toString());
          nextParams.set("ownerId", next);
          router.push(`${pathname}?${nextParams.toString()}`);
          router.refresh();
        }}
        className="h-10 rounded-xl border border-light-grey bg-white px-3 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
      >
        {items.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}

