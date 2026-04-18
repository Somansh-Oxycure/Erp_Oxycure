import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'List all users' })
  findAll(
    @Query('role') role?: string,
    @Query('department') department?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({
      role,
      department,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('salespersons')
  @ApiOperation({ summary: 'Get users who can be assigned leads' })
  getSalespersons() {
    return this.usersService.findAll({ isActive: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update user (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change password (own account only)' })
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.changePassword(id, dto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Deactivate user (admin only)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleActive(id, false);
  }

  @Patch(':id/activate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Activate user (admin only)' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleActive(id, true);
  }
}
