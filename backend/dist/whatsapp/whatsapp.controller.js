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
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
const prisma_service_1 = require("../prisma/prisma.service");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs = require("fs");
const path = require("path");
const jwt_auth_guard_1 = require("../jwt-auth/jwt-auth.guard");
const user_decorator_1 = require("../decorators/user.decorator");
let WhatsappController = class WhatsappController {
    constructor(whatsappService, prisma) {
        this.whatsappService = whatsappService;
        this.prisma = prisma;
    }
    getQRCode(user) {
        this.whatsappService.setCurrentUserId(user.user_id);
        return this.whatsappService.getClientStatus().pipe((0, operators_1.switchMap)((status) => {
            if (status === 'authenticated') {
                return (0, rxjs_1.of)({ message: 'Client is already authenticated' });
            }
            else if (status === 'qr') {
                return this.whatsappService.getQRCode().pipe((0, operators_1.take)(1), (0, operators_1.map)((qrCode) => ({ qrCode: qrCode })));
            }
            else if (status === 'ready') {
                return (0, rxjs_1.of)({ message: 'ready' });
            }
            else {
                return (0, rxjs_1.of)({ message: 'Client status unknown' });
            }
        }), (0, operators_1.take)(1));
    }
    loadReminderMessage() {
        try {
            const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'reminder-message.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error('Error loading reminder messages:', error);
            return {};
        }
    }
    async sendReminders(user, reminders, request) {
        this.whatsappService.setCurrentUserId(user.user_id);
        const whatsappMsgData = [];
        const userAuditData = [];
        for (const reminder of reminders) {
            const { patient_fullname, attachment, doctor, patient_cel } = reminder;
            const reminderMessages = this.loadReminderMessage();
            const welcomeMessage = reminderMessages.welcome.message;
            const additionalMessage = reminderMessages.welcome.additionalMessage;
            const options = reminderMessages.welcome.options;
            const spanishDate = this.convertToSpanishDate(attachment);
            const message = welcomeMessage
                .replace('{patient_fullname}', patient_fullname)
                .replace('{attachment}', spanishDate)
                .replace('{doctor}', doctor);
            let messageOptions = additionalMessage + "\n";
            for (const [key, value] of Object.entries(options)) {
                messageOptions += `${key}. ${value}\n`;
            }
            for (const phone of patient_cel) {
                try {
                    await this.whatsappService.sendMessage(phone, message, messageOptions);
                    const [datePart, timePart] = attachment.split(' at ');
                    const [hours, minutes] = timePart.replace('hs', '').split(':');
                    const appointmentDate = new Date(datePart);
                    appointmentDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                    whatsappMsgData.push({
                        patient_full_name: patient_fullname,
                        patient_phone: phone,
                        message: message,
                        appointment_date: appointmentDate,
                        doctor_name: doctor,
                        task_status: 0,
                        creation_date: new Date(),
                        creation_time: new Date().toLocaleTimeString(),
                        creation_user: user.username,
                    });
                    userAuditData.push({
                        user_id: user.user_id,
                        action: `Appointment reminder sent to ${phone}`,
                        details: `Message: "${message}"`,
                        ip_address: this.getIPAddress(request),
                    });
                }
                catch (error) {
                    console.log(`Failed to send message to ${phone}:`, error);
                }
            }
        }
        await this.prisma.$transaction([
            this.prisma.whatsappMsg.createMany({ data: whatsappMsgData }),
            this.prisma.userAudit.createMany({ data: userAuditData }),
        ]);
        return { status: 'Reminders sent successfully' };
    }
    convertToSpanishDate(dateString) {
        const [datePart, timePart] = dateString.split(' at ');
        const date = new Date(datePart);
        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} de ${month} de ${year} a las ${timePart}`;
    }
    async getPhoneNumber() {
        return this.whatsappService
            .getAuthenticatedPhoneNumber()
            .toPromise()
            .then((phoneNumber) => {
            if (phoneNumber) {
                return { phoneNumber: phoneNumber };
            }
            else {
                return {
                    message: 'Client is not authenticated or phone number is not available',
                };
            }
        });
    }
    getCurrentUser(user) {
        return { currentUser: `${user.username}` };
    }
    setBotStatus(user, body) {
        this.whatsappService.setCurrentUserId(user.user_id);
        this.whatsappService.setBotEnabled(body.enabled);
        return { message: `Bot is now ${body.enabled ? 'enabled' : 'disabled'}` };
    }
    async getRescheduleMessages(user) {
        try {
            const messages = await this.prisma.whatsappMsg.findMany({
                where: {
                    task_status: 2,
                },
            });
            return messages;
        }
        catch (error) {
            return { message: 'Error retrieving reschedule messages', error: error.message };
        }
    }
    async getPatientResponses(user) {
        try {
            const messages = await this.prisma.patientResponses.findMany({
                where: {
                    response: "2",
                },
            });
            return messages;
        }
        catch (error) {
            return { message: 'Error retrieving patient responses', error: error.message };
        }
    }
    async sendRescheduledMessage(user, body, request) {
        this.whatsappService.setCurrentUserId(user.user_id);
        try {
            const whatsappMsg = await this.prisma.whatsappMsg.findFirst({
                where: {
                    patient_phone: body.patientPhone,
                    whatsapp_msg_id: body.patientId,
                    task_status: 2,
                },
            });
            const patientResponse = await this.prisma.patientResponses.findFirst({
                where: {
                    patient_phone: body.patientPhone,
                    response_id: body.patientId,
                    response: "2",
                },
            });
            if (!whatsappMsg && !patientResponse) {
                return { message: 'Patient not found or not eligible for rescheduling' };
            }
            const phoneNumber = whatsappMsg?.patient_phone || patientResponse?.patient_phone;
            if (!phoneNumber) {
                return { message: 'Patient phone number not found' };
            }
            let whatsappNumber = phoneNumber.replace(/\D/g, '');
            if (!whatsappNumber.endsWith('@c.us')) {
                whatsappNumber += '@c.us';
            }
            await this.whatsappService.sendMessage(whatsappNumber, body.message);
            if (whatsappMsg) {
                await this.prisma.whatsappMsg.update({
                    where: { whatsapp_msg_id: whatsappMsg.whatsapp_msg_id },
                    data: { task_status: 5 },
                });
            }
            if (patientResponse) {
                await this.prisma.patientResponses.update({
                    where: { response_id: patientResponse.response_id },
                    data: { response: "5" },
                });
            }
            await this.prisma.userAudit.create({
                data: {
                    user_id: user.user_id,
                    action: `Rescheduled appointment message sent`,
                    details: `Message: "${body.message}" sent to ${phoneNumber}`,
                    ip_address: this.getIPAddress(request),
                },
            });
            return { message: 'Rescheduled message sent successfully' };
        }
        catch (error) {
            console.error('Error sending rescheduled message:', error);
            return { message: 'Error sending rescheduled message', error: error.message };
        }
    }
    getIPAddress(request) {
        return '';
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('get-qr'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", rxjs_1.Observable)
], WhatsappController.prototype, "getQRCode", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('send-reminders'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "sendReminders", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('phone-number'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getPhoneNumber", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('getUser'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('set-bot-status'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "setBotStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('messages-reschedule'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getRescheduleMessages", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('patient-responses'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getPatientResponses", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('send-rescheduled-message'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "sendRescheduledMessage", null);
exports.WhatsappController = WhatsappController = __decorate([
    (0, common_1.Controller)('api/whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        prisma_service_1.PrismaService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map