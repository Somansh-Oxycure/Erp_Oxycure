import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const unlockTime = user.lockedUntil.toLocaleTimeString();
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again after ${unlockTime}.`,
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated. Contact admin.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });

      return null;
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    return user;
  }

  async login(user: { id: string; email: string; role: string; department: string }, ipAddress?: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRY', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
      }),
    ]);

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: tokenHash, userId: user.id, expiresAt },
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'users',
      entityId: user.id,
      ipAddress,
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Find and validate stored refresh token
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
      });

      let validToken = false;
      for (const stored of storedTokens) {
        if (await bcrypt.compare(refreshToken, stored.token)) {
          validToken = true;
          // Delete used token (rotation)
          await this.prisma.refreshToken.delete({ where: { id: stored.id } });
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.login(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      entityType: 'users',
      entityId: userId,
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }
}
