import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/inventory")}`);
  const isAdmin = (session.role ?? "").toLowerCase() === "admin";
  const src = isAdmin
    ? "/inventory/index.html?scope=admin&v=3"
    : "/inventory/index.html?scope=user&status=available&v=3";

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div>
          <h1 className="font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
            Inventory
          </h1>
          <p className="mt-2 text-medium-grey max-w-2xl">
            {isAdmin
              ? "Admin inventory management. Full stock visibility across all statuses."
              : "Browse available inventory and current interest/viewing signals."}
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-light-grey bg-white shadow-card overflow-hidden">
          <iframe
            title="Arkadians Inventory"
            src={src}
            className="w-full min-h-[78vh]"
          />
        </div>
      </div>
    </div>
  );
}
