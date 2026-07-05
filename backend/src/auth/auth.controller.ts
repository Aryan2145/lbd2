import { Controller, Post, Get, Delete, Body, Query, Request, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
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
  @IsString() @Length(6, 6) otp: string;
}

class ResendVerificationDto {
  @IsEmail() email: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class VerifyOtpDto {
  @IsEmail() email: string;
  @IsString() @Length(6, 6) otp: string;
}

class ResetPasswordDto {
  @IsEmail() email: string;
  @IsString() resetToken: string;
  @IsString() @MinLength(6) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private passwordReset: PasswordResetService,
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

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.otp);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  // ── Forgot / reset password (OTP flow) ──────────────────────────────────────

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.requestReset(dto.email);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwordReset.verifyOtp(dto.email, dto.otp);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordReset.resetPassword(dto.email, dto.resetToken, dto.newPassword);
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
