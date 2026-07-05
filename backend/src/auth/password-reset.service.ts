import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MS = 10 * 60 * 1000; // codes are valid for 10 minutes
const MAX_ATTEMPTS = 5; // wrong-OTP guesses allowed before a new code is required

@Injectable()
export class PasswordResetService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private mail: MailService,
  ) {}

  /**
   * Step 1 — user submits their email. Rejects unknown emails so the UI can tell
   * the user no account exists (rather than silently advancing to the OTP step).
   */
  async requestReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);

    if (!user) {
      throw new BadRequestException('No account found with that email address.');
    }

    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any earlier pending requests for this email.
    await this.prisma.passwordReset.deleteMany({ where: { email: normalized } });
    await this.prisma.passwordReset.create({
      data: { email: normalized, otpHash, expiresAt },
    });

    await this.mail.sendPasswordResetOtp(normalized, otp);

    return { success: true };
  }

  /**
   * Step 2 — user submits the OTP. On success we mint a single-use, opaque
   * resetToken that the final step must present.
   */
  async verifyOtp(email: string, otp: string) {
    const normalized = email.trim().toLowerCase();
    const row = await this.prisma.passwordReset.findFirst({
      where: { email: normalized, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) throw new BadRequestException('Invalid or expired code. Please request a new one.');
    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This code has expired. Please request a new one.');
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    const match = await bcrypt.compare(otp, row.otpHash);
    if (!match) {
      await this.prisma.passwordReset.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.passwordReset.update({
      where: { id: row.id },
      data: { resetToken },
    });

    return { resetToken };
  }

  /**
   * Step 3 — user submits the new password together with the resetToken from
   * step 2. Consumes the reset row so the token can't be reused.
   */
  async resetPassword(email: string, resetToken: string, newPassword: string) {
    const normalized = email.trim().toLowerCase();

    if (!resetToken) throw new BadRequestException('Invalid or expired reset request.');

    const row = await this.prisma.passwordReset.findFirst({
      where: { email: normalized, resetToken, consumedAt: null },
    });

    if (!row) throw new BadRequestException('Invalid or expired reset request. Please start again.');
    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset request has expired. Please start again.');
    }

    const user = await this.users.findByEmail(normalized);
    if (!user) throw new BadRequestException('Invalid or expired reset request. Please start again.');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    await this.prisma.passwordReset.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    return { success: true };
  }
}
