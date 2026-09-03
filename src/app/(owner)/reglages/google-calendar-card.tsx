import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { googleConnected, googleEnabled, listCalendars } from "@/lib/google";
import { getSettings } from "@/lib/settings";
import { disconnectGoogleAction, saveGoogleCalendarsAction } from "./actions";

export async function GoogleCalendarCard({ notice }: { notice?: string }) {
  const enabled = googleEnabled();
  const connected = enabled && (await googleConnected());
  const settings = await getSettings();
  const calendars = connected ? await listCalendars() : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Agenda</CardTitle>
        <span
          className={
            connected
              ? "text-xs font-medium text-success"
              : "text-xs font-medium text-text-muted"
          }
        >
          {connected
            ? `Connecté${settings.googleConnectedEmail ? ` — ${settings.googleConnectedEmail}` : ""}`
            : enabled
              ? "Non connecté"
              : "Non configuré"}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notice === "connecte" ? (
          <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
            Google Agenda connecté.
          </p>
        ) : notice === "erreur" ? (
          <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            La connexion à Google a échoué. Réessayez.
          </p>
        ) : notice === "absent" ? (
          <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
            Ajoutez d&apos;abord les identifiants Google dans .env.
          </p>
        ) : null}

        {!enabled ? (
          <p className="text-sm text-text-muted">
            Ajoutez <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>{" "}
            (et idéalement <code>GOOGLE_TOKEN_ENC_KEY</code>) dans <code>.env</code>,
            avec l&apos;API Google Calendar activée et l&apos;URI de redirection{" "}
            <code>/api/google/oauth/callback</code>.
          </p>
        ) : !connected ? (
          <>
            <p className="text-sm text-text-muted">
              Connectez votre agenda Google pour éviter les doubles réservations et
              voir vos séances dans Google Agenda.
            </p>
            <a
              href="/api/google/oauth/start"
              className={buttonVariants({ size: "sm" }) + " self-start"}
            >
              Connecter Google Agenda
            </a>
          </>
        ) : (
          <>
            <form
              action={saveGoogleCalendarsAction}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="workCalendarId"
                  className="text-sm font-medium text-text"
                >
                  Agenda où créer les séances
                </label>
                <select
                  id="workCalendarId"
                  name="workCalendarId"
                  defaultValue={settings.googleCalendarId ?? ""}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                >
                  <option value="">Agenda principal</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary}
                      {c.primary ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-text">
                  Agendas à considérer comme « occupé »
                </p>
                <p className="text-xs text-text-muted">
                  Les créneaux en conflit avec un événement de ces agendas ne
                  seront pas proposés aux clients.
                </p>
                <div className="flex flex-col gap-1.5 pt-1">
                  {calendars.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        name="busyCalendarIds"
                        value={c.id}
                        defaultChecked={settings.googleBusyCalendarIds.includes(
                          c.id,
                        )}
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      {c.summary}
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" size="sm" className="self-start">
                Enregistrer les agendas
              </Button>
            </form>

            <form
              action={disconnectGoogleAction}
              className="border-t border-border pt-3"
            >
              <Button type="submit" variant="ghost" size="sm" className="text-danger">
                Déconnecter Google Agenda
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
