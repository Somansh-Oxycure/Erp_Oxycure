import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const { accessToken, refreshToken } = await this.authService.login(user, ipAddress);

    // Set secure httpOnly cookies
    res.cookie('access_token', accessToken, COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

    return {
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
      message: 'Login successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenFromCookie = req.cookies?.refresh_token;
    const token = dto.refreshToken || tokenFromCookie;

    const { accessToken, refreshToken } = await this.authService.refresh(token);

    res.cookie('access_token', accessToken, COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

    return { success: true, data: { accessToken } };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);

    res.clearCookie('access_token', CLEAR_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', CLEAR_COOKIE_OPTIONS);

    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: { id: string }) {
    const userData = await this.authService.getMe(user.id);
    return { success: true, data: userData };
  }
}
