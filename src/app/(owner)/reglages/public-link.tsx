"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PublicLink({ url, enabled }: { url: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page de réservation publique</CardTitle>
        <span
          className={
            enabled
              ? "text-xs font-medium text-success"
              : "text-xs font-medium text-text-muted"
          }
        >
          {enabled ? "Active" : "Désactivée"}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Partagez ce lien avec vos clients pour qu'ils réservent directement dans
          votre horaire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-muted px-3 py-2 text-sm">
            {url}
          </code>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? (
              <>
                <Check className="size-4" /> Copié
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copier
              </>
            )}
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="size-4" /> Ouvrir
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
