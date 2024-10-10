import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Buscamos al usuario por nombre de usuario en la base de datos
    const user = await this.prisma.user.findUnique({ where: { username } });

    // Si el usuario no existe o la contraseña es incorrecta
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');      
    }

    return user;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.user_id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userDto: any) {
    const { username, password, email, role_id } = userDto;

    // Verificar si el usuario o el correo ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Encriptar la contraseña antes de guardar el usuario
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario en la base de datos
    const newUser = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        role_id,
      },
    });

    return newUser;
  }
}
