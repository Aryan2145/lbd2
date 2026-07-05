import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MS = 10 * 60 * 1000; // verification codes valid for 10 minutes
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      // Correct password but unverified — send a fresh code and steer them to verify.
      await this.sendVerificationCode(user.email, user.name);
      throw new ForbiddenException(
        'Your email isn\'t verified yet. We just sent you a new code — please verify to continue.',
      );
    }

    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  /**
   * Creates the account as UNVERIFIED and emails a welcome code. Does not return
   * a session token — the caller must verify the email first. Re-registering an
   * existing unverified email refreshes its details and resends the code.
   */
  async register(
    name: string,
    email: string,
    password: string,
    extra?: { role?: string; gender?: string; phone?: string },
  ) {
    const normalized = email.trim().toLowerCase();
    const hash = await bcrypt.hash(password, 10);
    const existing = await this.users.findByEmail(normalized);

    if (existing?.emailVerified) {
      throw new ConflictException('Email already in use. Please sign in.');
    }

    if (existing) {
      // Unverified account already exists — update its details and resend.
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          password: hash,
          role: extra?.role,
          gender: extra?.gender,
          phone: extra?.phone,
        },
      });
    } else {
      await this.users.create({
        name, email: normalized, password: hash,
        role:   extra?.role,
        gender: extra?.gender,
        phone:  extra?.phone,
      });
    }

    await this.sendVerificationCode(normalized, name);
    return { requiresVerification: true, email: normalized };
  }

  /** Step 2 — confirm the emailed code, mark the account verified, log the user in. */
  async verifyEmail(email: string, otp: string) {
    const normalized = email.trim().toLowerCase();
    const row = await this.prisma.emailVerification.findFirst({
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

    const valid = await bcrypt.compare(otp, row.otpHash);
    if (!valid) {
      await this.prisma.emailVerification.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    const user = await this.users.findByEmail(normalized);
    if (!user) throw new BadRequestException('Account not found. Please sign up again.');

    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await this.prisma.emailVerification.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    const verified = { ...user, emailVerified: true };
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(verified) };
  }

  /** Resend a fresh verification code for an unverified account. */
  async resendVerification(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user) throw new BadRequestException('No account found with that email address.');
    if (user.emailVerified) {
      throw new BadRequestException('This email is already verified. Please sign in.');
    }
    await this.sendVerificationCode(normalized, user.name);
    return { success: true };
  }

  private async sendVerificationCode(email: string, name: string) {
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Only the newest code should be valid.
    await this.prisma.emailVerification.deleteMany({ where: { email } });
    await this.prisma.emailVerification.create({ data: { email, otpHash, expiresAt } });

    await this.mail.sendWelcomeVerification(email, name, otp);
  }

  private strip(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
