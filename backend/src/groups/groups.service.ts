import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const groups = await this.prisma.group.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { members: true } } },
    });
    return groups.map(g => ({
      id: g.id, name: g.name, color: g.color,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async create(name: string, color?: string) {
    const clean = (name ?? '').trim();
    if (!clean) throw new BadRequestException('Group name is required.');
    const g = await this.prisma.group.create({
      data: { name: clean, color: color?.trim() || undefined },
    });
    return { id: g.id, name: g.name, color: g.color, memberCount: 0, createdAt: g.createdAt.toISOString() };
  }

  async update(id: string, name?: string, color?: string) {
    const exists = await this.prisma.group.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Group not found.');
    const g = await this.prisma.group.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(color !== undefined ? { color: color.trim() } : {}),
      },
    });
    return { id: g.id, name: g.name, color: g.color };
  }

  /** Deleting a group drops its members back to Ungrouped (FK onDelete: SetNull). */
  async remove(id: string) {
    const exists = await this.prisma.group.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Group not found.');
    await this.prisma.group.delete({ where: { id } });
    return { success: true };
  }

  /** Assign one or many users to a group (or null = Ungrouped). */
  async assign(userIds: string[], groupId: string | null) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('No users selected.');
    }
    if (groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found.');
    }
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { groupId: groupId ?? null },
    });
    return { success: true, count: userIds.length };
  }
}
