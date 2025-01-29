"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService, prisma) {
        this.authService = authService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuthController_1.name);
        this.currentUserId = null;
    }
    async login(req, body) {
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
        }
        catch (error) {
            this.logger.error('Login failed', error.stack);
            return { message: 'Login failed', error: error.message };
        }
    }
    async register(body) {
        return this.authService.register(body);
    }
    async logUserAudit(request, action, details) {
        if (!this.currentUserId) {
            this.logger.warn('No user ID set for auditing purposes.');
            return;
        }
        const currentDate = new Date();
        const auditLog = {
            user_id: this.currentUserId,
            action: action,
            action_date: currentDate,
            ip_address: this.getIPAddress(request),
            details: details,
        };
        await this.prisma.userAudit.create({
            data: auditLog,
        });
    }
    getIPAddress(request) {
        const forwardedFor = request.headers['x-forwarded-for'];
        if (typeof forwardedFor === 'string') {
            return forwardedFor.split(',')[0].trim();
        }
        const ip = request.socket?.remoteAddress || null;
        return ip ? ip : null;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map