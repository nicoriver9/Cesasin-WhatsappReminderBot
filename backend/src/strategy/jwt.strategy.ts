import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),          
    });
  }

  async validate(payload: any) {
    // Verifica si el token ha expirado
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTimestamp) {
      throw new UnauthorizedException('Token has expired');
    }

    // Aquí puedes realizar validaciones adicionales o cargar más datos del usuario
    const user = await this.prisma.user.findUnique({ 
      where: { user_id: payload.sub }, 
      select: { user_id: true, username: true, email: true },
    });    
    if (!user) {
      throw new UnauthorizedException();
    }    
    return user;
  }
}
