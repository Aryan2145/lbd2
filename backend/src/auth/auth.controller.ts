import { Controller, Post, Get, Delete, Body, Query, Request, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GcalService } from '../gcal/gcal.service';
import { UsersService } from '../users/users.service';

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsIn(['Male', 'Female', 'Other']) gender?: string;
  @IsOptional() @IsString() phone?: string;
}

class VerifyEmailDto {
  @IsEmail() email: string;
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' }) code: string;
}

class ResendOtpDto {
  @IsEmail() email: string;
  @IsIn(['verify_email', 'password_reset']) purpose: OtpPurpose;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsEmail() email: string;
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' }) code: string;
  @IsString() @MinLength(6) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private gcal: GcalService,
    private users: UsersService,
    private config: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password, {
      role:   dto.designation,
      gender: dto.gender,
      phone:  dto.phone,
    });
  }

  // ── Email verification + password reset (OTP) ───────────────────────────────
  // All four are unauthenticated and trigger outbound mail, so they are
  // IP-throttled (10 req / 60s / IP) on top of the per-email cooldown.

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-otp')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.email, dto.purpose);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  // ── Google Calendar OAuth ───────────────────────────────────────────────────

  @Get('google/url')
  @UseGuards(JwtAuthGuard)
  getGoogleAuthUrl(@Request() req: any) {
    const url = this.gcal.getAuthUrl(req.user.userId);
    return { url };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: any,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    try {
      const { refreshToken } = await this.gcal.exchangeCode(code);
      await this.users.saveGoogleToken(userId, refreshToken);
      return res.redirect(`${frontendUrl}/weekly?gcal=connected`);
    } catch {
      return res.redirect(`${frontendUrl}/weekly?gcal=error`);
    }
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard)
  async googleStatus(@Request() req: any) {
    const user = await this.users.findById(req.user.userId);
    return { connected: !!user?.googleRefreshToken };
  }

  @Delete('google')
  @UseGuards(JwtAuthGuard)
  async disconnectGoogle(@Request() req: any) {
    await this.users.saveGoogleToken(req.user.userId, null);
    return { success: true };
  }
}
