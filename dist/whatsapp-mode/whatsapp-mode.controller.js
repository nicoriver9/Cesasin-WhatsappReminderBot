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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappModeController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const jwt_auth_guard_1 = require("../jwt-auth/jwt-auth.guard");
let WhatsappModeController = class WhatsappModeController {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    startConversationMode(res) {
        this.whatsappService.startConversationMode();
        return res.status(common_1.HttpStatus.OK).json({
            message: 'Modo conversacional activado.',
        });
    }
    stopConversationMode(res) {
        this.whatsappService.stopConversationMode();
        return res.status(common_1.HttpStatus.OK).json({
            message: 'Modo recordatorio activado.',
        });
    }
    getConversationModeStatus(res) {
        const isActive = this.whatsappService.isConversationModeActive();
        return res.status(common_1.HttpStatus.OK).json({
            message: `${isActive ? ' El modo conversacional está activado' : 'El modo recordatorio está activado'}.`,
            isActive,
        });
    }
};
exports.WhatsappModeController = WhatsappModeController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('start-conversation'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappModeController.prototype, "startConversationMode", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('start-reminder'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappModeController.prototype, "stopConversationMode", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappModeController.prototype, "getConversationModeStatus", null);
exports.WhatsappModeController = WhatsappModeController = __decorate([
    (0, common_1.Controller)('api/whatsapp-mode'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], WhatsappModeController);
//# sourceMappingURL=whatsapp-mode.controller.js.map