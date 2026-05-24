"use client";

import { useMemo, useState } from "react";

type CreateUserRole = "admin" | "ceo" | "manager" | "sales_rep" | "viewer";

const ROLE_LABEL: Record<CreateUserRole, string> = {
  admin: "Admin",
  ceo: "CEO",
  manager: "Sales Manager",
  sales_rep: "Property Consultant",
  viewer: "Viewer",
};

export function AdminCreateUserClient() {
  const roleOptions = useMemo(() => Object.entries(ROLE_LABEL) as Array<[CreateUserRole, string]>, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CreateUserRole>("sales_rep");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password, role }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : null;
        setMsg({ tone: "error", text: message ?? "Could not create user." });
        return;
      }

      setMsg({ tone: "success", text: "User created." });
      setName("");
      setEmail("");
      setPassword("");
      setRole("sales_rep");
    } catch {
      setMsg({ tone: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-light-grey bg-white shadow-card p-6">
      <div className="font-(--font-display) text-lg text-navy">Create a user</div>
      <p className="mt-2 text-sm text-medium-grey max-w-2xl">
        Admin-only. Create accounts for consultants, managers, CEO, or additional admins.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-2 h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>

        <label className="block">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as CreateUserRole)}
            className="mt-2 h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            {roleOptions.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            type="email"
            className="mt-2 h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>

        <label className="block">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            type="password"
            className="mt-2 h-11 w-full rounded-lg border border-light-grey bg-white px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="h-11 rounded-lg border border-navy/20 bg-navy px-5 text-xs font-semibold tracking-[0.2em] uppercase text-white hover:shadow-[0_4px_15px_rgba(10,22,40,0.22)] transition-shadow disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create user"}
        </button>

        {msg ? (
          <div
            className={[
              "text-sm",
              msg.tone === "success" ? "text-success" : "text-warning",
            ].join(" ")}
          >
            {msg.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}


