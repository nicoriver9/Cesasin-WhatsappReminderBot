import { Controller, Post, Body, Logger, Req } from '@nestjs/common';
import { Request } from 'express'; 
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service'; // Corrige el typo en 'primsa.service'

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private currentUserId: number | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(@Req() req: Request, @Body() body: any) {
    try {
      const { username, password } = body;
      const user = await this.authService.validateUser(username, password);

      if (!user) {
        this.logger.warn('Invalid credentials');
        return { message: 'Invalid credentials' };
      }

      this.currentUserId = user.user_id;
      await this.logUserAudit(req, 'login', 'User logged in successfully');

      return this.authService.login(user);
    } catch (error) {
      this.logger.error('Login failed', error.stack);
      return { message: 'Login failed', error: error.message };
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  private async logUserAudit(request: Request, action: string, details?: string) {
    if (!this.currentUserId) {
      this.logger.warn('No user ID set for auditing purposes.');
      return;
    }

    const currentDate = new Date();
    const auditLog = {
      user_id: this.currentUserId,
      action: action,
      action_date: currentDate,
      ip_address: this.getIPAddress(request), // Método para obtener la IP del cliente
      details: details,
    };

    await this.prisma.userAudit.create({
      data: auditLog,
    });
  }

  private getIPAddress(request: Request): string | null {
    // Primero intenta obtener la IP desde el encabezado 'x-forwarded-for'
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      // 'x-forwarded-for' puede contener una lista de IPs, toma la primera
      return forwardedFor.split(',')[0].trim();
    }
    
    // Si no hay encabezado 'x-forwarded-for', usa el remoteAddress de la conexión
    const ip = request.socket?.remoteAddress || null;
    return ip ? ip : null;
  }
}
