import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

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

  async sendWelcomeVerification(to: string, name: string, otp: string): Promise<void> {
    const transporter = this.getTransporter();
    const firstName = (name || '').trim().split(/\s+/)[0] || 'there';

    if (!transporter) {
      this.logger.warn(`[DEV] Email-verification OTP for ${to}: ${otp} (SMTP not configured)`);
      return;
    }

    const from = this.fromAddress();

    try {
      await transporter.sendMail({
        from: `Life By Design <${from}>`,
        to,
        subject: `Welcome to Life By Design, ${firstName} 👋`,
        text:
          `Welcome, ${firstName}!\n\n` +
          `Think about how a house comes to life. First there's a plan — every room drawn ` +
          `with intention, so the finished home is exactly what you hoped for.\n\n` +
          `Your life deserves that same care.\n\n` +
          `Most of us are heading somewhere. And a journey can be a beautiful adventure on ` +
          `its own — but with a map, it becomes something you shape on purpose: more ` +
          `direction, more meaning, a life that feels truly yours.\n\n` +
          `That's life by design. And this is where you begin.\n\n` +
          `This space is yours alone. Everything inside is encrypted and private, so you can ` +
          `design freely. Here is your requested OTP:\n\n` +
          `    ${otp}\n\n` +
          `(The code is good for 10 minutes.)\n\n` +
          `Take the first step — we'll see you inside.\n\n` +
          `— Team Life By Design\n` +
          `An RGB product`,
        html: this.welcomeHtml(firstName, otp),
        attachments: this.logoAttachments(),
      });
      this.logger.log(`Welcome verification email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome verification email to ${to}`, err as Error);
      throw err;
    }
  }

  /** Inline logo attachments (CID), skipping any file that isn't bundled. */
  private logoAttachments() {
    const dir = path.join(__dirname, 'assets');
    return [
      { filename: 'lbd-logo.png', cid: 'lbdLogo' },
      { filename: 'rgb-logo.png', cid: 'rgbLogo' },
    ]
      .map((a) => ({ ...a, full: path.join(dir, a.filename) }))
      .filter((a) => fs.existsSync(a.full))
      .map((a) => ({ filename: a.filename, path: a.full, cid: a.cid }));
  }

  private welcomeHtml(firstName: string, otp: string): string {
    return `
    <div style="margin:0;padding:32px 16px;background:#FDF6EF;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #F0E5D8;border-radius:18px;overflow:hidden;">
        <!-- Header: Life By Design logo + wordmark -->
        <div style="padding:28px 36px 18px;background:linear-gradient(135deg,#FFF4EC 0%,#FFFFFF 70%);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:11px;vertical-align:middle;">
              <img src="cid:lbdLogo" width="38" height="38" alt="Life By Design" style="display:block;border:0;" />
            </td>
            <td style="vertical-align:middle;font-size:19px;font-weight:700;color:#1a1a1a;">
              Life By <span style="color:#EA580C;">Design</span>
            </td>
          </tr></table>
        </div>

        <div style="padding:10px 36px 30px;">
          <h1 style="margin:14px 0 16px;font-size:24px;line-height:1.25;color:#1a1a1a;font-weight:800;letter-spacing:-0.01em;">
            Welcome, ${firstName} <span style="font-weight:400;">👋</span>
          </h1>

          <p style="margin:0 0 16px;font-size:14.5px;line-height:1.75;color:#44403C;">
            Think about how a house comes to life. First there's a plan — every room drawn with intention, so the finished home is exactly what you hoped for.
          </p>
          <p style="margin:0 0 16px;font-size:14.5px;line-height:1.75;color:#1a1a1a;font-weight:700;">
            Your life deserves that same care.
          </p>
          <p style="margin:0 0 16px;font-size:14.5px;line-height:1.75;color:#44403C;">
            Most of us are heading somewhere. And a journey can be a beautiful adventure on its own — but with a map, it becomes something you shape on purpose: more direction, more meaning, a life that feels truly yours.
          </p>
          <p style="margin:0 0 20px;font-size:14.5px;line-height:1.75;color:#44403C;">
            That's <span style="color:#EA580C;font-weight:700;">life by design</span>. And this is where you begin.
          </p>
          <p style="margin:0 0 18px;font-size:14.5px;line-height:1.75;color:#44403C;">
            This space is yours alone. Everything inside is encrypted and private, so you can design freely. Here is your requested OTP:
          </p>

          <div style="text-align:center;margin:6px 0 14px;">
            <div style="display:inline-block;padding:16px 30px;border-radius:14px;background:#FFF4EC;border:1px solid #FBD3B4;font-size:34px;font-weight:800;letter-spacing:9px;color:#EA580C;font-family:'SF Mono','Fira Code',monospace;">
              ${otp}
            </div>
          </div>
          <p style="margin:0 0 24px;font-size:12.5px;line-height:1.6;color:#8a8a8a;text-align:center;">
            This code expires in 10 minutes.
          </p>

          <div style="border-top:1px solid #F0E5D8;padding-top:20px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#44403C;">
              Take the first step — we'll see you inside.<br/>
              <strong style="color:#1a1a1a;">— Team Life By Design</strong>
            </p>
            <p style="margin:0 0 8px;font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#A8A29E;">
              An RGB product
            </p>
            <img src="cid:rgbLogo" width="86" alt="RGB — Business Growth Consulting" style="display:block;border:0;height:auto;" />
          </div>
        </div>
      </div>
      <p style="max-width:480px;margin:16px auto 0;font-size:11.5px;line-height:1.6;color:#A8A29E;text-align:center;">
        If you didn't create a Life By Design account, you can safely ignore this email.
      </p>
    </div>`;
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
