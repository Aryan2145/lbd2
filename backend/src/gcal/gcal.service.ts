import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const TIMEZONE = 'Asia/Kolkata';

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

  async createEvent(
    refreshToken: string,
    event: { title: string; date: string; startTime: string; endTime: string; description?: string | null },
  ): Promise<string> {
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
    return res.data.id!;
  }

  async updateEvent(
    refreshToken: string,
    googleEventId: string,
    event: { title: string; date: string; startTime: string; endTime: string; description?: string | null },
  ): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        summary: event.title,
        description: event.description ?? undefined,
        start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TIMEZONE },
        end:   { dateTime: `${event.date}T${event.endTime}:00`,   timeZone: TIMEZONE },
      },
    });
  }

  async deleteEvent(refreshToken: string, googleEventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.makeClient(refreshToken) });
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
  }
}
