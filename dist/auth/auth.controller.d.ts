import { Request } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthController {
    private readonly authService;
    private readonly prisma;
    private readonly logger;
    private currentUserId;
    constructor(authService: AuthService, prisma: PrismaService);
    login(req: Request, body: any): Promise<{
        access_token: string;
    } | {
        message: string;
        error?: undefined;
    } | {
        message: string;
        error: any;
    }>;
    register(body: any): Promise<{
        user_id: number;
        username: string;
        password: string;
        email: string;
        role_id: number;
        created_at: Date;
        updated_at: Date;
    }>;
    private logUserAudit;
    private getIPAddress;
}
