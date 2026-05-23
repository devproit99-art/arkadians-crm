import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminCreateUserClient } from "@/components/admin/AdminCreateUserClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect(`/login?from=${encodeURIComponent("/admin/users")}`);
  const isAdmin = (session.role ?? "").toLowerCase() === "admin";
  if (!isAdmin) redirect("/");

  return (
    <div className="px-5 sm:px-8 py-8">
      <div className="w-full max-w-none">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              Admin
            </div>
            <h1 className="mt-2 font-(--font-display) text-3xl sm:text-4xl text-navy tracking-tight">
              User Management
            </h1>
            <p className="mt-2 text-medium-grey max-w-2xl">
              Create user accounts and assign access by role.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-navy hover:border-gold hover:bg-cream/40 transition-colors"
          >
            Back to Command Centre
          </Link>
        </div>

        <div className="mt-8">
          <AdminCreateUserClient />
        </div>
      </div>
    </div>
  );
}

