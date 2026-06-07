import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from = 'Life By Design <noreply@rgbindia.com>';

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = this.config.get<string>('MAIL_FROM') ?? this.from;

    // Dev fallback: without credentials we don't build a transport — sendOtp()
    // logs the code to the console so the whole flow is testable without SMTP.
    if (!user || !pass) {
      this.logger.warn(
        'SMTP_USER/SMTP_PASS not set — email sending disabled, OTP codes will be logged to the console.',
      );
      return;
    }

    const host = this.config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
    const secure = (this.config.get<string>('SMTP_SECURE') ?? 'true') === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true => 465 (SSL), false => 587 (STARTTLS)
      auth: { user, pass },
    });

    // Verify on boot, but never crash the app if SMTP is misconfigured.
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP transport ready (${host}:${port})`))
      .catch((err) =>
        this.logger.error(`SMTP transport verification failed: ${err?.message ?? err}`),
      );
  }

  async sendOtp(to: string, code: string, purpose: OtpPurpose): Promise<void> {
    const isVerify = purpose === 'verify_email';
    const subject = isVerify ? 'Verify your email' : 'Reset your password';
    const heading = isVerify ? 'Verify your email' : 'Reset your password';
    const intro = isVerify
      ? 'Use the code below to verify your email and finish setting up your account.'
      : 'Use the code below to reset your password.';

    // Dev fallback — no transporter configured.
    if (!this.transporter) {
      this.logger.warn(`OTP for ${to} [${purpose}]: ${code}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: `${heading}\n\n${intro}\n\nYour code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        html: this.buildHtml(heading, intro, code),
      });
    } catch (err: any) {
      this.logger.error(`Failed to send OTP to ${to}: ${err?.message ?? err}`);
      throw err;
    }
  }

  private buildHtml(heading: string, intro: string, code: string): string {
    return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FAF5EE;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EE;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #F2EAE0;">
            <!-- Header band -->
            <tr>
              <td style="background:#060504;padding:24px 28px;">
                <span style="font-size:20px;font-weight:700;font-style:italic;color:#FFFFFF;font-family:Calibri,Carlito,sans-serif;">
                  Life By <span style="color:#fb923c;">Design</span>
                </span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1a1a1a;">${heading}</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#525252;">${intro}</p>
                <div style="text-align:center;margin:0 0 24px;">
                  <div style="display:inline-block;background:#FFF7ED;border:1px solid #FED7AA;border-radius:14px;padding:16px 28px;">
                    <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#EA580C;font-family:'SF Mono','Courier New',monospace;">${code}</span>
                  </div>
                </div>
                <p style="margin:0 0 4px;font-size:13px;color:#737373;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="margin:0;font-size:13px;color:#A8A29E;">If you didn't request this, you can safely ignore this email.</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #F2EAE0;">
                <p style="margin:0;font-size:11px;color:#A8A29E;">Life By Design — your private space to design your life.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
