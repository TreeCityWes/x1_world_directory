"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceProvider } from "@/lib/workspace";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <WorkspaceProvider>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[color:color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="font-mono text-[11px] tracking-[0.22em] text-[var(--brass)] uppercase">
                tier_list_gen
              </span>
              <span className="hidden font-serif text-lg text-[var(--ink)] sm:inline">
                Rank room
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              {!onHome && (
                <Link href="/" className="btn-ghost">
                  All work
                </Link>
              )}
              <Link href="/packs/new" className="btn-ghost">
                New library
              </Link>
              <Link href="/lists/new" className="btn-primary">
                New list
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}
