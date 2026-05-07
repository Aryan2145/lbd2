import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class LegacyService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  async get(userId: string) {
    const row = await this.prisma.legacyCanvas.findUnique({ where: { userId } });
    if (!row) return { roleTexts: {}, purposeText: '', isSealed: false };

    const roleTexts: Record<string, string> = {};
    for (const [roleId, value] of Object.entries((row.roleTexts as Record<string, string>) ?? {})) {
      roleTexts[roleId] = this.enc.isEncrypted(value)
        ? this.enc.decrypt(value, `legacy:${userId}:role:${roleId}`)
        : value;
    }

    const purposeText = this.enc.isEncrypted(row.purposeText)
      ? this.enc.decrypt(row.purposeText, `legacy:${userId}:purpose`)
      : row.purposeText;

    return { roleTexts, purposeText, isSealed: row.isSealed };
  }

  async upsert(userId: string, data: any) {
    const inputRoles: Record<string, string> = data.roleTexts ?? {};
    const encryptedRoles: Record<string, string> = {};

    for (const [roleId, value] of Object.entries(inputRoles)) {
      encryptedRoles[roleId] = this.enc.encrypt(String(value ?? ''), `legacy:${userId}:role:${roleId}`);
    }

    const encryptedPurpose = this.enc.encrypt(String(data.purposeText ?? ''), `legacy:${userId}:purpose`);
    const isSealed = data.isSealed ?? false;

    await this.prisma.legacyCanvas.upsert({
      where:  { userId },
      create: { userId, roleTexts: encryptedRoles, purposeText: encryptedPurpose, isSealed },
      update: { roleTexts: encryptedRoles, purposeText: encryptedPurpose, isSealed },
    });

    // Return decrypted shape — client gets back exactly what it sent
    return { roleTexts: inputRoles, purposeText: data.purposeText ?? '', isSealed };
  }
}
