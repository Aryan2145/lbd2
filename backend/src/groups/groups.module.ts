import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

@Module({
  imports: [AdminModule], // AdminGuard + JwtModule
  providers: [GroupsService],
  controllers: [GroupsController],
})
export class GroupsModule {}
