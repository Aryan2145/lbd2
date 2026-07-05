import {
  BadRequestException,
  ConflictException,
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

interface CompleteSignupInput {
  name: string;
  email: string;
  password: string;
  otp: string;
  role?: string;
  gender?: string;
  phone?: string;
}

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
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  /**
   * Signup step 1 — email a verification code. NO account is created yet, so a
   * fake or abandoned signup leaves nothing behind but a short-lived code row.
   */
  async startSignup(name: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.users.findByEmail(normalized);
    if (existing) throw new ConflictException('Email already in use. Please sign in.');

    await this.sendVerificationCode(normalized, name);
    return { requiresVerification: true, email: normalized };
  }

  /**
   * Signup step 2 — confirm the code, THEN create the already-verified account
   * from the details collected on the form and return a session.
   */
  async completeSignup(input: CompleteSignupInput) {
    const normalized = input.email.trim().toLowerCase();

    const existing = await this.users.findByEmail(normalized);
    if (existing) throw new ConflictException('Email already in use. Please sign in.');

    await this.consumeVerificationCode(normalized, input.otp);

    const hash = await bcrypt.hash(input.password, 10);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          name: input.name,
          email: normalized,
          password: hash,
          role: input.role,
          gender: input.gender,
          phone: input.phone,
          emailVerified: true,
        },
      });
    } catch {
      // Unique-constraint race — someone claimed this email in the meantime.
      throw new ConflictException('Email already in use. Please sign in.');
    }

    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  /** Resend a fresh code for a signup still in progress. */
  async resendVerification(email: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.users.findByEmail(normalized);
    if (existing) throw new BadRequestException('This email is already registered. Please sign in.');
    await this.sendVerificationCode(normalized, name || 'there');
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

  /** Validate + consume the newest code for an email; throws on any problem. */
  private async consumeVerificationCode(email: string, otp: string) {
    const row = await this.prisma.emailVerification.findFirst({
      where: { email, consumedAt: null },
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

    await this.prisma.emailVerification.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
  }

  private strip(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
