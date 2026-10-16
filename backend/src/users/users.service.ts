import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    const normalized = (email || '').trim().toLowerCase();
    return this.prisma.user.findUnique({ where: { email: normalized } });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim();
    const password = (data.password || '').trim();
    if (!email) throw new BadRequestException('Email is required');
    if (!name) throw new BadRequestException('Name is required');
    if (!password) throw new BadRequestException('Password is required');

    const hashedPassword = await bcrypt.hash(password, 10);
    let firebaseUser: any = null;
    try {
      firebaseUser = await this.upsertFirebaseAuthUser({
        email,
        password,
        name,
      });
    } catch (fbErr: any) {
      console.warn('[auth] Firebase Auth sync non-fatal warning:', fbErr?.message || fbErr);
    }

    try {
      return await this.prisma.user.create({
        data: {
          ...data,
          ...(firebaseUser?.uid ? { id: firebaseUser.uid, firebaseUid: firebaseUser.uid } : {}),
          email,
          name,
          password: hashedPassword,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Email already in use');
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) throw err;
      throw err;
    }
  }

  private async upsertFirebaseAuthUser(data: {
    email: string;
    password: string;
    name: string;
  }) {
    try {
      try {
        return await getAuth().getUserByEmail(data.email);
      } catch {
        return await getAuth().createUser({
          email: data.email,
          password: data.password,
          displayName: data.name,
        });
      }
    } catch (err: any) {
      console.warn('[auth] Skipping Firebase Auth sync:', err?.message || err);
      return null;
    }
  }

  async findAllLawyers(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { role: Role.LAWYER },
      include: {
        _count: {
          select: { casesAsLawyer: true },
        },
      },
    });
  }

  async findAllClients(): Promise<User[]> {
    return this.prisma.user.findMany({ where: { role: Role.CLIENT } });
  }

  async findAllAdmins(): Promise<User[]> {
    return this.prisma.user.findMany({ where: { role: Role.ADMIN } });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const user = await this.findOneById(id);
    if (user?.email) {
      try {
        await getAuth().updateUser(id, { password });
      } catch (err) {
        console.warn('[auth] Failed to update Firebase Auth password', err);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async sendTeamMessage(data: {
    teamName: string;
    senderId: string;
    content?: string;
    fileUrl?: string;
  }): Promise<any> {
    return this.prisma.message.create({
      data: {
        teamName: data.teamName,
        senderId: data.senderId,
        content: data.content,
        fileUrl: data.fileUrl,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            litigationTeam: true,
          },
        },
      },
    });
  }

  async getTeamMessages(teamName: string): Promise<any[]> {
    return this.prisma.message.findMany({
      where: { teamName },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            litigationTeam: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteUser(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    // 1. Unassign lawyer from any cases
    await this.prisma.case.updateMany({
      where: { lawyerId: id },
      data: { lawyerId: null },
    });

    // 2. Unassign admin from any cases
    await this.prisma.case.updateMany({
      where: { adminId: id },
      data: { adminId: null },
    });

    // 3. Unlink verified payments
    await this.prisma.payment.updateMany({
      where: { verifiedById: id },
      data: { verifiedById: null },
    });

    // 4. Delete messages sent by user
    try {
      await this.prisma.message.deleteMany({
        where: { senderId: id },
      });
    } catch {}

    // 5. Delete documents uploaded by user
    try {
      await this.prisma.document.deleteMany({
        where: { uploadedById: id },
      });
    } catch {}

    // 6. Delete notifications for user if table exists
    try {
      await (this.prisma as any).notification?.deleteMany({
        where: { recipientId: id },
      });
    } catch {}

    // 7. Try Firebase Auth deletion (non-fatal)
    try {
      await getAuth().deleteUser(id);
    } catch (fbErr: any) {
      console.warn('[auth] Firebase delete user non-fatal:', fbErr?.message || fbErr);
    }

    // 8. Delete user record
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
