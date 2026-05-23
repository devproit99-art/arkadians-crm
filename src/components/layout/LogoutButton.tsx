"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void doLogout()}
      className="h-9 rounded-full border border-light-grey text-medium-grey hover:text-navy hover:bg-cream transition-colors px-3 text-xs font-semibold tracking-wide"
    >
      Log out
    </button>
  );
}

async function doLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}
