import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

const USER_SELECT = {
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
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { role?: string; department?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = {};
    if (params?.role) where.role = params.role;
    if (params?.department) where.department = params.department;
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, createdBy: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { employeeId: dto.employeeId }] },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Email already in use'
          : 'Employee ID already in use',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        employeeId: dto.employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        department: dto.department,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, requesterId: string) {
    if (id !== requesterId) {
      throw new ForbiddenException('You can only change your own password');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new ForbiddenException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  async toggleActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });
  }
}
