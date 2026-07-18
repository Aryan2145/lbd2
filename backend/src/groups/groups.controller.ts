import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';
import { GroupsService } from './groups.service';
import { AdminGuard } from '../admin/admin-auth.guard';

class CreateGroupDto {
  @IsString() name: string;
  @IsOptional() @IsString() color?: string;
}
class UpdateGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() color?: string;
}
class AssignDto {
  @IsArray() @ArrayNotEmpty() userIds: string[];
  @IsOptional() @IsString() groupId?: string | null;
}

@UseGuards(AdminGuard)
@Controller('admin/groups')
export class GroupsController {
  constructor(private groups: GroupsService) {}

  @Get()
  list() { return this.groups.list(); }

  @Post()
  create(@Body() dto: CreateGroupDto) { return this.groups.create(dto.name, dto.color); }

  // Bulk (and single) assignment — must precede ':id' so "assign" isn't read as an id.
  @Patch('assign')
  assign(@Body() dto: AssignDto) { return this.groups.assign(dto.userIds, dto.groupId ?? null); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groups.update(id, dto.name, dto.color);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.groups.remove(id); }
}
