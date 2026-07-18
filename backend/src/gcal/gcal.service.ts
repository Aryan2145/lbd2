import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const TIMEZONE = 'Asia/Kolkata';

// A Google event flattened into the shape our app stores.
export interface NormalizedGEvent {
  googleEventId: string;
  title:         string;
  description:   string | null;
  date:          string;   // YYYY-MM-DD (Asia/Kolkata)
  startTime:     string;   // HH:MM
  endTime:       string;   // HH:MM
  allDay:        boolean;
  updated:       string;   // RFC3339 — Google's last-modified stamp
  cancelled:     boolean;  // true for deleted instances Google still returns
}

// Convert an RFC3339 instant to { date, time } as seen in Asia/Kolkata, so an
// event written from another timezone still lands on the right day/slot here.
function toKolkataParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  const hour = get('hour') === '24' ? '00' : get('hour'); // Intl can emit "24"
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

function normalizeGEvent(ev: any): NormalizedGEvent {
  const base = { googleEventId: ev.id as string, updated: ev.updated ?? '' };
  if (ev.status === 'cancelled') {
    return { ...base, title: '', description: null, date: '', startTime: '00:00', endTime: '23:59', allDay: false, cancelled: true };
  }
  const allDay = !!ev.start?.date; // all-day events carry `date`, timed ones carry `dateTime`
  let date: string, startTime: string, endTime: string;
  if (allDay) {
    date = ev.start.date;
    startTime = '00:00';
    endTime = '23:59';
  } else {
    const s = toKolkataParts(ev.start.dateTime);
    const e = toKolkataParts(ev.end.dateTime);
    date = s.date;
    startTime = s.time;
    // An event crossing midnight can't be drawn in one day column — clamp it.
    endTime = e.date === s.date ? e.time : '23:59';
  }
  return {
    ...base,
    title:       ev.summary ?? '(no title)',
    description: ev.description ?? null,
    date, startTime, endTime, allDay,
    cancelled: false,
  };
}

@Injectable()
export class GcalService {
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;

  constructor(private config: ConfigService) {
    this.clientId     = config.get<string>('GOOGLE_CLIENT_ID')!;
    this.clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET')!;
    this.callbackUrl  = config.get<string>('GOOGLE_CALLBACK_URL')!;
  }

  private makeClient(refreshToken?: string) {
    const client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.callbackUrl);
    if (refreshToken) client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  getAuthUrl(userId: string): string {
    return this.makeClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId,
    });
  }

  async exchangeCode(code: string): Promise<{ refreshToken: string }> {
    const { tokens } = await this.makeClient().getToken(code);
    if (!tokens.refresh_token) throw new Error('No refresh token returned');
    return { refreshToken: tokens.refresh_token };
  }

  // Push helpers return Google's `updated` stamp so the caller can record it and
  // recognise the change as its own echo on the next reverse sync.
  async createEvent(
    refreshToken: string,
    event: { title: string; date: string; startTime: string; endTime: string; description?: string | null },
  ): Promise<{ id: string; updated: string }> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        description: event.description ?? undefined,
        start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${event.date}T${event.endTime}:00`,   timeZone: TIMEZONE },
      },
    });
    return { id: res.data.id!, updated: res.data.updated ?? '' };
  }

  async updateEvent(
    refreshToken: string,
    googleEventId: string,
    event: { title: string; date: string; startTime: string; endTime: string; description?: string | null },
  ): Promise<string> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        summary: event.title,
        description: event.description ?? undefined,
        start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${event.date}T${event.endTime}:00`,   timeZone: TIMEZONE },
      },
    });
    return res.data.updated ?? '';
  }

  async deleteEvent(refreshToken: string, googleEventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
  }

  // Pull a bounded window of events from the primary calendar. `singleEvents`
  // expands recurrences into individual instances so a one-week window stays
  // tiny (a daily meeting is ~7 rows, not a year's worth). Returns them
  // normalized into our app's event shape.
  async listEvents(refreshToken: string, timeMin: string, timeMax: string): Promise<NormalizedGEvent[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin, timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 250,
    });
    return (res.data.items ?? []).map(normalizeGEvent);
  }
}
