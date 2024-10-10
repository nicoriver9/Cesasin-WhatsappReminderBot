import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
    }>;
    register(userDto: any): Promise<{
        user_id: number;
        username: string;
        password: string;
        email: string;
        role_id: number;
        created_at: Date;
        updated_at: Date;
    }>;
}
