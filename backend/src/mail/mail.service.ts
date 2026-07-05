import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Thin wrapper around nodemailer. SMTP is configured entirely through env vars
 * (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM) so the same code
 * works with any provider — Google Workspace, Zoho, Office365, etc.
 *
 * When SMTP is not configured (e.g. local dev), we log the OTP instead of
 * throwing, so the reset flow can still be exercised end-to-end.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing) — emails will be logged, not sent.',
      );
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587/25 use STARTTLS
      auth: { user, pass },
    });
    return this.transporter;
  }

  private fromAddress(): string {
    return (
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@rgbindia.com'
    );
  }

  async sendPasswordResetOtp(to: string, otp: string): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(`[DEV] Password-reset OTP for ${to}: ${otp} (SMTP not configured)`);
      return;
    }

    const from = this.fromAddress();

    try {
      await transporter.sendMail({
        from: `Life By Design <${from}>`,
        to,
        subject: 'Your Life By Design password reset code',
        text:
          `Your Life By Design password reset code is ${otp}.\n\n` +
          `It expires in 10 minutes. If you didn't request a password reset, ` +
          `you can safely ignore this email.`,
        html: this.otpHtml(otp),
      });
      this.logger.log(`Password-reset OTP sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send password-reset OTP to ${to}`, err as Error);
      throw err;
    }
  }

  private otpHtml(otp: string): string {
    return `
    <div style="margin:0;padding:32px 16px;background:#FDF6EF;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:440px;margin:0 auto;background:#FFFFFF;border:1px solid #F0E5D8;border-radius:16px;overflow:hidden;">
        <div style="padding:28px 32px 8px;">
          <div style="font-size:18px;font-weight:700;color:#1a1a1a;">
            Life By <span style="color:#EA580C;">Design</span>
          </div>
        </div>
        <div style="padding:8px 32px 28px;">
          <h1 style="margin:12px 0 8px;font-size:20px;color:#1a1a1a;font-weight:800;">Reset your password</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#525252;">
            Use the code below to reset your password. This code expires in
            <strong>10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:8px 0 20px;">
            <div style="display:inline-block;padding:14px 28px;border-radius:12px;background:#FFF4EC;border:1px solid #FBD3B4;font-size:32px;font-weight:800;letter-spacing:8px;color:#EA580C;font-family:'SF Mono','Fira Code',monospace;">
              ${otp}
            </div>
          </div>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a;">
            If you didn't request a password reset, you can safely ignore this email —
            your password won't change.
          </p>
        </div>
      </div>
    </div>`;
  }
}
