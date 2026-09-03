import "server-only";
import { google, type calendar_v3 } from "googleapis";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID, getSettings } from "@/lib/settings";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function redirectUri(): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/google/oauth/callback`
  );
}

export function googleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(),
  );
}

export function getAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeAndStore(code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google n'a pas renvoyé de jeton de rafraîchissement. Révoquez l'accès de l'application dans votre compte Google puis reconnectez-vous.",
    );
  }
  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email ?? null;
  } catch {
    /* facultatif */
  }

  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      googleRefreshToken: encryptSecret(tokens.refresh_token),
      googleConnectedEmail: email,
    },
  });
}

async function authedClient() {
  if (!googleEnabled()) return null;
  const settings = await getSettings();
  if (!settings.googleRefreshToken) return null;

  const client = oauthClient();
  client.setCredentials({
    refresh_token: decryptSecret(settings.googleRefreshToken),
  });
  return client;
}

export async function googleConnected(): Promise<boolean> {
  if (!googleEnabled()) return false;
  const settings = await getSettings();
  return Boolean(settings.googleRefreshToken);
}

async function calendarClient(): Promise<calendar_v3.Calendar | null> {
  const client = await authedClient();
  if (!client) return null;
  return google.calendar({ version: "v3", auth: client });
}

export type CalendarChoice = {
  id: string;
  summary: string;
  primary: boolean;
};

export async function listCalendars(): Promise<CalendarChoice[]> {
  const cal = await calendarClient();
  if (!cal) return [];
  try {
    const res = await cal.calendarList.list({ maxResults: 100 });
    return (res.data.items ?? [])
      .filter((c) => c.id)
      .map((c) => ({
        id: c.id as string,
        summary: c.summaryOverride ?? c.summary ?? (c.id as string),
        primary: Boolean(c.primary),
      }));
  } catch (err) {
    console.error("listCalendars:", err);
    return [];
  }
}

export async function setGoogleCalendars(
  workCalendarId: string,
  busyCalendarIds: string[],
): Promise<void> {
  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      googleCalendarId: workCalendarId || null,
      googleBusyCalendarIds: busyCalendarIds,
    },
  });
}

export async function disconnectGoogle(): Promise<void> {
  const settings = await getSettings();
  if (settings.googleRefreshToken && googleEnabled()) {
    try {
      await oauthClient().revokeToken(
        decryptSecret(settings.googleRefreshToken),
      );
    } catch {
      /* ignore */
    }
  }
  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      googleRefreshToken: null,
      googleConnectedEmail: null,
      googleCalendarId: null,
      googleBusyCalendarIds: [],
    },
  });
}

/** Périodes occupées Google (calendrier de travail + calendriers « occupé »). */
export async function googleBusyIntervals(
  timeMin: Date,
  timeMax: Date,
): Promise<{ from: number; to: number }[]> {
  const cal = await calendarClient();
  if (!cal) return [];
  const settings = await getSettings();

  const ids = [
    ...new Set(
      [settings.googleCalendarId, ...settings.googleBusyCalendarIds].filter(
        (x): x is string => Boolean(x),
      ),
    ),
  ];
  const items = ids.length > 0 ? ids.map((id) => ({ id })) : [{ id: "primary" }];

  try {
    const res = await cal.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items,
      },
    });
    const out: { from: number; to: number }[] = [];
    for (const entry of Object.values(res.data.calendars ?? {})) {
      for (const b of entry.busy ?? []) {
        if (b.start && b.end) {
          out.push({
            from: new Date(b.start).getTime(),
            to: new Date(b.end).getTime(),
          });
        }
      }
    }
    return out;
  } catch (err) {
    console.error("googleBusyIntervals:", err);
    return [];
  }
}

/** Crée / met à jour / supprime l'événement Google d'un rendez-vous. */
export async function syncBookingToGoogle(bookingId: string): Promise<void> {
  try {
    const cal = await calendarClient();
    if (!cal) return;

    const [settings, booking] = await Promise.all([
      getSettings(),
      prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, package: true },
      }),
    ]);
    if (!booking) return;
    const calendarId = settings.googleCalendarId || "primary";

    if (booking.status === "CANCELLED") {
      if (booking.googleEventId) {
        try {
          await cal.events.delete({
            calendarId,
            eventId: booking.googleEventId,
          });
        } catch {
          /* déjà supprimé */
        }
        await prisma.booking.update({
          where: { id: bookingId },
          data: { googleEventId: null },
        });
      }
      return;
    }

    const event: calendar_v3.Schema$Event = {
      summary: `${booking.status === "REQUESTED" ? "[Demande] " : ""}${booking.client.name}${
        booking.package ? ` — ${booking.package.name}` : ""
      }`,
      location: booking.propertyAddress,
      description: [
        booking.package?.name,
        booking.notes,
        `Client : ${booking.client.email}${
          booking.client.phone ? ` · ${booking.client.phone}` : ""
        }`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: booking.startAt.toISOString(), timeZone: settings.timezone },
      end: { dateTime: booking.endAt.toISOString(), timeZone: settings.timezone },
      status: booking.status === "REQUESTED" ? "tentative" : "confirmed",
    };

    if (booking.googleEventId) {
      try {
        await cal.events.patch({
          calendarId,
          eventId: booking.googleEventId,
          requestBody: event,
        });
        return;
      } catch {
        /* recréé ci-dessous */
      }
    }

    const created = await cal.events.insert({ calendarId, requestBody: event });
    if (created.data.id) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: created.data.id },
      });
    }
  } catch (err) {
    console.error("syncBookingToGoogle:", err);
  }
}

export async function deleteGoogleEvent(
  googleEventId: string | null,
): Promise<void> {
  if (!googleEventId) return;
  try {
    const cal = await calendarClient();
    if (!cal) return;
    const settings = await getSettings();
    await cal.events.delete({
      calendarId: settings.googleCalendarId || "primary",
      eventId: googleEventId,
    });
  } catch (err) {
    console.error("deleteGoogleEvent:", err);
  }
}
