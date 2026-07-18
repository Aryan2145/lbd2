import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin-auth.guard';

class AdminLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class CreateAdminDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() name?: string;
}

@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.email, dto.password);
  }

  @UseGuards(AdminGuard)
  @Get('me')
  me(@Request() req) {
    return this.admin.me(req.admin.id);
  }

  @UseGuards(AdminGuard)
  @Patch('me/password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.admin.changePassword(req.admin.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(AdminGuard)
  @Get('users')
  getUsers() {
    return this.admin.getUsers();
  }

  @UseGuards(AdminGuard)
  @Get('admins')
  listAdmins() {
    return this.admin.listAdmins();
  }

  @UseGuards(AdminGuard)
  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(dto.email, dto.password, dto.name);
  }

  @UseGuards(AdminGuard)
  @Delete('admins/:id')
  deleteAdmin(@Request() req, @Param('id') id: string) {
    return this.admin.deleteAdmin(req.admin.id, id);
  }
}
