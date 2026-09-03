"use client";

import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid size-9 place-items-center rounded-md bg-primary font-display text-sm font-extrabold tracking-tight text-primary-foreground">
        <span>
          EM
          <span className="text-accent">.</span>
        </span>
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-text">
          Effet&nbsp;Mat
        </p>
        <p className="text-xs text-text-muted">CRM · Photo &amp; Vidéo</p>
      </div>
    </div>
  );
}

function SignOut({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        <LogOut className="size-4" aria-hidden />
        Se déconnecter
      </button>
    </form>
  );
}

export function AppShell({
  user,
  signOutAction,
  children,
}: {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-full md:grid md:grid-cols-[16rem_1fr]">
      {/* Sidebar — bureau */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-4 border-r border-border bg-mint/35 p-4 md:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <AppNav />
        </div>
        <div className="border-t border-border pt-3">
          <p className="truncate px-3 pb-1 text-xs text-text-muted">
            {user.email}
          </p>
          <SignOut action={signOutAction} />
        </div>
      </aside>

      {/* En-tête mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
      </header>

      {/* Tiroir mobile */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-4 bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AppNav onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="truncate px-3 pb-1 text-xs text-text-muted">
                {user.email}
              </p>
              <SignOut action={signOutAction} />
            </div>
          </div>
        </div>
      ) : null}

      <main className="min-w-0 p-4 md:p-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
