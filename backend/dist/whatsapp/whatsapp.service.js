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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const prisma_service_1 = require("../prisma/prisma.service");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs = require("fs");
const path = require("path");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WhatsappService_1.name);
        this.clientInfo = null;
        this.messageStatusMap = new Map();
        this.clientStatus$ = new rxjs_1.BehaviorSubject('initializing');
        this.qrCodeSubject$ = new rxjs_1.BehaviorSubject(null);
        this.authenticatedPhoneNumber = null;
        this.currentUserId = null;
        this.conversationModeActive = false;
        this.botEnabled = true;
        const os = require('os');
        const isLinux = os.platform() === 'linux';
        this.client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth(),
            puppeteer: isLinux ? {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            } : undefined
        });
        this.client.on('qr', (qr) => {
            this.clientStatus$.next('qr');
            this.qrCodeSubject$.next(qr);
            qrcode.generate(qr, { small: true });
        });
        this.client.on('ready', async () => {
            this.clientStatus$.next('ready');
            await this.logUserAudit('ready');
            this.clientInfo = this.client.info;
            if (this.clientInfo) {
                this.authenticatedPhoneNumber = this.clientInfo.wid.user;
            }
            this.startConversationMode();
        });
        this.client.on('authenticated', async () => {
            this.clientStatus$.next('authenticated');
            if (this.client.info) {
                this.authenticatedPhoneNumber = this.client.info.wid.user;
            }
            await this.logUserAudit('authenticated');
        });
        this.client.on('auth_failure', async (msg) => {
            this.clientStatus$.next('auth_failure');
            await this.logUserAudit('auth_failure', msg);
        });
        this.client.on('disconnected', async (reason) => {
            this.clientStatus$.next('disconnected');
            await this.logUserAudit('disconnected', reason);
        });
        this.client.on('message', async (message) => {
            const { from } = message;
            const currentDate = new Date();
            if (this.conversationModeActive) {
                const reminderMessages = await this.prisma.whatsappMsg.findFirst({
                    where: {
                        patient_phone: from,
                        task_status: { in: [0, 2] },
                        reminder_state: { not: 2 },
                        appointment_date: {
                            lt: currentDate,
                        },
                    },
                });
                if (!reminderMessages) {
                    await this.handleConversationalMessage(message);
                }
                else {
                    await this.handleReminderMessage(message, reminderMessages);
                }
            }
        });
        this.client.initialize();
    }
    getClientStatus() {
        return this.clientStatus$.asObservable();
    }
    getQRCode() {
        return this.qrCodeSubject$.asObservable().pipe((0, operators_1.filter)((qr) => qr !== null));
    }
    getAuthenticatedPhoneNumber() {
        return this.clientInfo ? (0, rxjs_1.of)(this.clientInfo.wid.user) : (0, rxjs_1.of)(null);
    }
    async sendMessage(to, message, options) {
        if (!this.clientInfo?.wid) {
            throw new Error('Client is not initialized or connected.');
        }
        try {
            const fullMessage = options && options.length > 0 ? `${message} ${options}` : message;
            const sentMessage = await this.client.sendMessage(to, fullMessage);
            this.messageStatusMap.set(sentMessage.id.id, {
                resolve: (status) => Promise.resolve(status),
                reject: (error) => Promise.reject(error),
            });
            return 1;
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    loadConversationalResponses() {
        try {
            const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'conversational-responses.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error('Error loading conversational responses:', error);
            return {};
        }
    }
    async handleConversationalMessage(message) {
        const { from, body } = message;
        const contact = await message.getContact();
        const contactName = contact.pushname || contact.verifiedName;
        const responses = this.loadConversationalResponses();
        const lowerCaseBody = body.toLowerCase();
        const conversationState = await this.prisma.patientResponses.findFirst({
            where: {
                patient_phone: from,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
        if (!conversationState || conversationState.conversationState === 0) {
            if (lowerCaseBody.includes('hola')) {
                await this.client.sendMessage(from, responses.welcome.message);
                await this.savePatientResponse(contactName, from, body, 1);
            }
            else {
                await this.client.sendMessage(from, responses.unknown.message);
            }
            return;
        }
        switch (conversationState.conversationState) {
            case 1:
                if (lowerCaseBody === '1') {
                    await this.client.sendMessage(from, responses.option1.message);
                    await this.savePatientResponse(contactName, from, body, 0);
                }
                else if (lowerCaseBody === '2') {
                    await this.client.sendMessage(from, responses.option2.message);
                    await this.savePatientResponse(contactName, from, body, 2);
                }
                else {
                    await this.client.sendMessage(from, responses.unknownOption.message);
                }
                break;
            case 2:
                await this.client.sendMessage(from, responses.thanks.message);
                await this.updatePatientResponse(contactName, from, body, 2);
                await this.savePatientResponse(contactName, from, body, 0);
                break;
            default:
                await this.client.sendMessage(from, responses.unknown.message);
                break;
        }
    }
    async savePatientResponse(contactName, patientPhone, response, conversationState) {
        await this.prisma.patientResponses.create({
            data: {
                patient_full_name: contactName,
                patient_phone: patientPhone,
                response: response,
                created_at: new Date(),
                conversationState: conversationState,
            },
        });
    }
    async updatePatientResponse(contactName, patientPhone, response, conversationState) {
        await this.prisma.patientResponses.updateMany({
            where: {
                patient_full_name: contactName,
                patient_phone: patientPhone,
                conversationState: 1,
            },
            data: {
                response: response,
                received_at: new Date(),
                conversationState: conversationState,
            },
        });
    }
    loadReminderResponses() {
        try {
            const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'reminder-responses.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error('Error loading reminder responses:', error);
            return {};
        }
    }
    ;
    async handleReminderMessage(message, whatsappMessage) {
        const { from, body } = message;
        const contact = await message.getContact();
        const contactName = contact.pushname || contact.verifiedName;
        const lowerCaseBody = body.toLowerCase();
        const responses = this.loadReminderResponses();
        const { appointment_date: appointmentDate, doctor_name: doctorName, patient_full_name: patientFullName, } = whatsappMessage;
        const sendResponse = async (statusMessage) => {
            await this.client.sendMessage(from, statusMessage);
        };
        const reminderState = await this.prisma.whatsappMsg.findFirst({
            where: {
                patient_phone: from,
                task_status: { in: [0, 2] },
            },
            orderBy: {
                creation_date: 'desc',
            },
        });
        if (reminderState) {
            if (reminderState.task_status === 2 && reminderState.reminder_state === 1) {
                await sendResponse(responses.thanks.message);
                await this.updatePatientReminder(from, 2, 2);
                return;
            }
            if (lowerCaseBody.includes('hola')) {
                await sendResponse(responses.welcome.message
                    .replace('{contactName}', contactName || patientFullName)
                    .replace('{patientFullName}', patientFullName)
                    .replace('{appointmentDate}', this.convertToSpanishDate(appointmentDate))
                    .replace('{doctorName}', doctorName));
                await sendResponse(responses.welcome.additionalMessage);
                await this.updatePatientReminder(from, 0, 1);
                return;
            }
            else if (reminderState.reminder_state === 0) {
                await sendResponse(responses.unknown.message);
                return;
            }
        }
        let newTaskStatus;
        switch (body) {
            case '1':
                newTaskStatus = 1;
                await sendResponse(responses.confirmed.message
                    .replace('{contactName}', contactName || patientFullName)
                    .replace('{patientFullName}', patientFullName)
                    .replace('{appointmentDate}', this.convertToSpanishDate(appointmentDate))
                    .replace('{doctorName}', doctorName));
                await sendResponse(responses.confirmed.additionalMessage);
                await this.updatePatientReminder(from, newTaskStatus, 2);
                break;
            case '2':
                newTaskStatus = 2;
                await sendResponse(responses.rescheduled.message);
                await sendResponse(responses.additionalInformation.message);
                await this.updatePatientReminder(from, newTaskStatus, 1);
                break;
            case '3':
                newTaskStatus = 3;
                await sendResponse(responses.cancelled.message);
                await sendResponse(responses.cancelled.additionalMessage);
                await this.updatePatientReminder(from, newTaskStatus, 2);
                break;
            default:
                await sendResponse(responses.invalid.message);
                break;
        }
    }
    async updatePatientReminder(patientPhone, newTaskStatus, reminderState) {
        try {
            await this.prisma.whatsappMsg.updateMany({
                where: {
                    patient_phone: patientPhone,
                    task_status: { in: [0, 2] },
                },
                data: {
                    task_status: newTaskStatus,
                    reminder_state: reminderState,
                },
            });
            this.logger.log(`Updated reminder status for ${patientPhone} to ${newTaskStatus}, reminder state: ${reminderState}`);
        }
        catch (error) {
            this.logger.error(`Error updating patient reminder: ${error}`);
        }
    }
    convertToSpanishDate(dateString) {
        const date = new Date(dateString);
        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} de ${month} de ${year} a las ${hours}:${minutes}`;
    }
    setCurrentUserId(userId) {
        this.currentUserId = userId;
    }
    startConversationMode() {
        this.conversationModeActive = true;
        this.logger.log('Modo conversacional activado.');
    }
    stopConversationMode() {
        this.conversationModeActive = false;
        this.logger.log('Modo recordatorio activado.');
    }
    isConversationModeActive() {
        return this.conversationModeActive;
    }
    setBotEnabled(enabled) {
        this.botEnabled = enabled;
        this.logger.log(`Bot status changed: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
    isBotEnabled() {
        return this.botEnabled;
    }
    async logUserAudit(action, details) {
        if (!this.currentUserId) {
            this.logger.warn('No user ID set for auditing purposes.');
            return;
        }
        const auditLog = {
            user_id: this.currentUserId,
            action: action,
            action_date: new Date(),
            ip_address: this.getIPAddress(),
            details: details,
        };
        await this.prisma.userAudit.create({ data: auditLog });
    }
    getIPAddress() {
        return null;
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map