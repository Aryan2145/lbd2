import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // failed verifies before a code is burned
const RESEND_COOLDOWN_MS = 60 * 1000; // min gap between issues for same email+purpose
const BCRYPT_ROUNDS = 10;

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateCode(): string {
    // Cryptographically secure 6-digit code, zero-padded (kept as a string so
    // leading zeros survive end to end).
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  /**
   * Issue a fresh OTP for (email, purpose): enforces a resend cooldown,
   * invalidates any outstanding codes, stores a bcrypt hash, and emails it.
   */
  async issue(rawEmail: string, purpose: OtpPurpose): Promise<void> {
    const email = this.normalize(rawEmail);

    // Cooldown: reject if the newest live code is younger than the cooldown.
    const latest = await this.prisma.otpCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException(
        'Please wait a moment before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Invalidate all outstanding codes and create the new one atomically so two
    // fast requests can't leave two live codes behind.
    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { email, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: { email, codeHash, purpose, expiresAt },
      }),
    ]);

    // Opportunistic cleanup so the table doesn't grow forever (no cron needed).
    await this.prisma.otpCode.deleteMany({
      where: {
        email,
        OR: [
          { consumedAt: { not: null } },
          { expiresAt: { lt: new Date(Date.now() - CODE_TTL_MS) } },
        ],
        // never delete the row we just created
        NOT: { codeHash },
      },
    });

    await this.mail.sendOtp(email, code, purpose);
  }

  /**
   * Verify a submitted code against the newest live OTP. Single-use: a correct
   * code (and terminal failures) consume the row. Errors are deliberately
   * generic to avoid leaking which condition failed.
   */
  async verify(rawEmail: string, purpose: OtpPurpose, code: string): Promise<void> {
    const email = this.normalize(rawEmail);

    const row = await this.prisma.otpCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const invalid = () => new UnauthorizedException('Invalid or expired code');

    if (!row) throw invalid();

    if (row.expiresAt.getTime() < Date.now()) {
      await this.consume(row.id);
      throw invalid();
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await this.consume(row.id);
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const match = await bcrypt.compare(code, row.codeHash);
    if (!match) {
      await this.prisma.otpCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalid();
    }

    await this.consume(row.id); // single-use
  }

  private consume(id: string) {
    return this.prisma.otpCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}
