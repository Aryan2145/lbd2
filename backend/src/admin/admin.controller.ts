import { Controller, Get, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('users')
  getUsers(@Headers('x-admin-secret') secret: string) {
    this.admin.verifySecret(secret ?? '');
    return this.admin.getUsers();
  }
}
