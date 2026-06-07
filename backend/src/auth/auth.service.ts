import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private otp: OtpService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    // Machine-readable message the frontend matches to route to the OTP screen.
    if (!user.emailVerified) throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    return this.issueSession(user);
  }

  async register(
    name: string,
    email: string,
    password: string,
    extra?: { role?: string; gender?: string; phone?: string },
  ) {
    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({
      name, email, password: hash,
      role:   extra?.role,
      gender: extra?.gender,
      phone:  extra?.phone,
    });
    // Account is created unverified; send the verification OTP and make the
    // client collect it before any session is issued.
    await this.otp.issue(user.email, 'verify_email');
    return { needsVerification: true, email: user.email };
  }

  async verifyEmail(email: string, code: string) {
    await this.otp.verify(email, 'verify_email', code);
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired code');
    const updated = await this.users.setEmailVerified(user.id);
    return this.issueSession(updated); // auto-login after verifying
  }

  /**
   * Issue a password-reset OTP. Serves any existing user (verified or not, so an
   * unverified user who forgot their password isn't dead-ended). By product
   * decision this DOES reveal when no account exists (consistent with the signup
   * form, which already rejects duplicates) so the UI can offer "create account".
   */
  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    try {
      await this.otp.issue(email, 'password_reset');
    } catch {
      // Swallow cooldown (429) etc. — the code is still valid; UI proceeds.
    }
    return { success: true };
  }

  async resendOtp(email: string, purpose: OtpPurpose) {
    if (purpose === 'password_reset') {
      // Same guarded, non-enumerating path as forgot-password.
      return this.forgotPassword(email);
    }
    // verify_email: only (re)issue for an existing, not-yet-verified account.
    const user = await this.users.findByEmail(email);
    if (user && !user.emailVerified) {
      try {
        await this.otp.issue(email, 'verify_email');
      } catch {
        // swallow cooldown
      }
    }
    return { success: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    await this.otp.verify(email, 'password_reset', code);
    const hash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePasswordByEmail(email, hash);
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired code');
    // A successful reset proves inbox ownership — mark verified if not already.
    const updated = user.emailVerified ? user : await this.users.setEmailVerified(user.id);
    return this.issueSession(updated);
  }

  private issueSession(user: any) {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  private strip(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
