import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

// Fallback bootstrap admin, used only when the admin_accounts table is empty and
// no ADMIN_EMAIL/ADMIN_PASSWORD is configured. Matches the credentials the portal
// shipped with before admin accounts were persisted, so access is never lost.
const LEGACY_ADMIN_EMAIL = 'admin@lbd.in';
const LEGACY_ADMIN_PASSWORD = 'LBD#Admin@2025';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  /** Ensure at least one admin exists so nobody is locked out of the portal. */
  async onModuleInit() {
    const count = await this.prisma.adminAccount.count();
    if (count > 0) return;

    const email = (this.config.get<string>('ADMIN_EMAIL') || LEGACY_ADMIN_EMAIL)
      .trim()
      .toLowerCase();
    const password =
      this.config.get<string>('ADMIN_PASSWORD') || LEGACY_ADMIN_PASSWORD;

    await this.prisma.adminAccount.create({
      data: { email, name: 'Administrator', password: await bcrypt.hash(password, 10) },
    });
    this.logger.log(`Seeded initial admin account: ${email}`);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const normalized = (email || '').trim().toLowerCase();
    const admin = await this.prisma.adminAccount.findUnique({ where: { email: normalized } });
    if (!admin) throw new UnauthorizedException('Invalid admin credentials');

    const match = await bcrypt.compare(password, admin.password);
    if (!match) throw new UnauthorizedException('Invalid admin credentials');

    const token = await this.jwt.signAsync({ sub: admin.id, email: admin.email, typ: 'admin' });
    return { token, admin: this.strip(admin) };
  }

  async me(id: string) {
    const admin = await this.prisma.adminAccount.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException('Admin account no longer exists');
    return this.strip(admin);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.adminAccount.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException('Admin account no longer exists');

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) throw new BadRequestException('Current password is incorrect');

    await this.prisma.adminAccount.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return { success: true };
  }

  // ── Admin account management ────────────────────────────────────────────────

  async listAdmins() {
    const admins = await this.prisma.adminAccount.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return admins.map(a => this.strip(a));
  }

  /**
   * Create a new admin login. Uniqueness is checked ONLY within admin_accounts —
   * an email that already belongs to an app user is intentionally allowed.
   */
  async createAdmin(email: string, password: string, name?: string) {
    const normalized = (email || '').trim().toLowerCase();

    const existing = await this.prisma.adminAccount.findUnique({ where: { email: normalized } });
    if (existing) throw new ConflictException('An admin with this email already exists.');

    try {
      const admin = await this.prisma.adminAccount.create({
        data: {
          email: normalized,
          name: name?.trim() || null,
          password: await bcrypt.hash(password, 10),
        },
      });
      return this.strip(admin);
    } catch {
      // Unique-constraint race — someone claimed this email in the meantime.
      throw new ConflictException('An admin with this email already exists.');
    }
  }

  async deleteAdmin(actingId: string, targetId: string) {
    if (actingId === targetId) {
      throw new ForbiddenException('You cannot remove your own admin account.');
    }

    const target = await this.prisma.adminAccount.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Admin account not found.');

    const count = await this.prisma.adminAccount.count();
    if (count <= 1) {
      throw new ForbiddenException('At least one admin account must remain.');
    }

    await this.prisma.adminAccount.delete({ where: { id: targetId } });
    return { success: true };
  }

  // ── Platform data ────────────────────────────────────────────────────────────

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        group: { select: { id: true, name: true, color: true } },
        _count: {
          select: {
            goals: true,
            habits: true,
            tasks: true,
            weekEvents: true,
            weekPlans: true,
            eveningReflections: true,
            weeklyReviews: true,
            bucketEntries: true,
            tickets: true,
          },
        },
        visionCanvas: { select: { id: true } },
        legacyCanvas: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role ?? null,
      gender: u.gender ?? null,
      group: u.group ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      counts: {
        goals:              u._count.goals,
        habits:             u._count.habits,
        tasks:              u._count.tasks,
        weekEvents:         u._count.weekEvents,
        weekPlans:          u._count.weekPlans,
        eveningReflections: u._count.eveningReflections,
        weeklyReviews:      u._count.weeklyReviews,
        bucketEntries:      u._count.bucketEntries,
        tickets:            u._count.tickets,
      },
      hasVisionCanvas: !!u.visionCanvas,
      hasLegacyCanvas: !!u.legacyCanvas,
    }));
  }

  private strip(admin: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }
}
