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
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs = require("fs");
const path = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WhatsappService_1.name);
        this.clientInfo = null;
        this.messageStatusMap = new Map();
        this.clientStatus$ = new rxjs_1.BehaviorSubject("initializing");
        this.qrCodeSubject$ = new rxjs_1.BehaviorSubject(null);
        this.authenticatedPhoneNumber = null;
        this.currentUserId = null;
        this.conversationModeActive = false;
        this.botEnabled = true;
        this.processingLocks = new Map();
        this.presenceUpdateInterval = null;
        this.expectedResponses = {
            0: "hola",
            1: ["1", "2"],
            2: [],
        };
        const os = require("os");
        const isLinux = os.platform() === "linux";
        this.client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.NoAuth(),
            puppeteer: isLinux
                ? {
                    headless: false,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                }
                : undefined,
        });
        this.client.on("qr", (qr) => {
            this.clientStatus$.next("qr");
            this.qrCodeSubject$.next(qr);
            qrcode.generate(qr, { small: true });
        });
        this.client.on("ready", async () => {
            this.clientStatus$.next("ready");
            await this.logUserAudit("ready");
            this.clientInfo = this.client.info;
            if (this.clientInfo) {
                this.authenticatedPhoneNumber = this.clientInfo.wid.user;
            }
            this.startKeepAlive();
            this.startPresenceUpdates();
        });
        this.client.on("authenticated", async () => {
            this.clientStatus$.next("authenticated");
            if (this.client.info) {
                this.authenticatedPhoneNumber = this.client.info.wid.user;
            }
            this.startConversationMode();
            await this.logUserAudit("authenticated");
        });
        this.client.on("auth_failure", async (msg) => {
            this.clientStatus$.next("auth_failure");
            await this.logUserAudit("auth_failure", msg);
        });
        this.client.on("disconnected", async (reason) => {
            console.log("client disconnected");
            this.clientStatus$.next("disconnected");
            await this.logUserAudit("disconnected", reason);
            this.stopPresenceUpdates();
        });
        this.client.on("message", async (message) => {
            const phoneNumbersToAvoid = this.loadPhoneNumbersToAvoid();
            const phoneList = phoneNumbersToAvoid.phones;
            const phoneArray = [];
            for (const [_, value] of Object.entries(phoneList)) {
                phoneArray.push(value);
            }
            const { from } = message;
            if (from.endsWith("@g.us") ||
                phoneArray.includes(`${from.replace("@c.us", "")}`)) {
                return;
            }
            const currentDate = new Date();
            if (this.conversationModeActive) {
                try {
                    const reminderMessages = await this.prisma.whatsappMsg.findFirst({
                        where: {
                            patient_phone: from,
                            task_status: { in: [0, 2] },
                            reminder_state: { not: 2 },
                            appointment_date: {
                                gt: currentDate,
                            },
                        },
                        orderBy: {
                            creation_date: "desc",
                        },
                    });
                    if (!reminderMessages) {
                        await this.handleConversationalMessage(message);
                    }
                    else {
                        await this.handleReminderMessage(message, reminderMessages);
                    }
                }
                catch (error) {
                    console.log(error);
                }
            }
        });
        this.conversationalResponses = this.loadConversationalResponses();
        this.reminderResponses = this.loadReminderResponses();
        this.client.initialize();
    }
    loadPhoneNumbersToAvoid() {
        try {
            const filePath = path.join(__dirname, "..", "..", "src", "whatsapp", "phone-numbers-avoid", "phone-list.json");
            const rawData = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error("Error loading reminder phones:", error);
            return {};
        }
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
    async startKeepAlive() {
        const keepAliveInterval = 1 * 30 * 1000;
        setInterval(async () => {
            try {
                console.log('Simulating typing activity...');
                const chat = await this.client.getChatById("5492616689241@c.us");
                if (chat) {
                    await chat.sendStateTyping();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await chat.clearState();
                    console.log(new Date().toLocaleString(), 'Typing activity simulated.');
                }
            }
            catch (error) {
                console.error('Error simulating typing:', error.message);
                if (error) {
                    console.log("Attempting to reinitialize the client...");
                }
            }
        }, keepAliveInterval);
    }
    startPresenceUpdates() {
        const intervalTime = 5 * 60 * 1000;
        this.presenceUpdateInterval = setInterval(async () => {
            try {
                this.logger.log("Sending presence update to keep session alive...");
                await this.client.sendPresenceAvailable();
                this.logger.log("Presence update sent successfully.");
            }
            catch (error) {
                this.logger.error(`Error sending presence update: ${error.message}`);
                if (error.message.includes("disconnected")) {
                    this.logger.log("Attempting to reinitialize the client...");
                }
            }
        }, intervalTime);
    }
    stopPresenceUpdates() {
        if (this.presenceUpdateInterval) {
            clearInterval(this.presenceUpdateInterval);
            this.presenceUpdateInterval = null;
        }
    }
    async sendMessage(to, message, options) {
        if (!this.clientInfo?.wid) {
            throw new Error("Client is not initialized or connected.");
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
            const filePath = path.join(__dirname, "..", "..", "src", "whatsapp", "responses", "conversational-responses.json");
            const rawData = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error("Error loading conversational responses:", error);
            return {};
        }
    }
    async handleConversationalMessage(message) {
        const { from } = message;
        if (this.processingLocks.get(from)) {
            await this.client.sendMessage(from, "Por favor, espera mientras procesamos tu mensaje.");
            return;
        }
        this.processingLocks.set(from, true);
        try {
            const contact = await message.getContact();
            const contactName = contact.pushname || contact.verifiedName;
            const lowerCaseBody = message.body.toLowerCase();
            let conversationState;
            try {
                conversationState = await this.prisma.patientResponses.findFirst({
                    where: { patient_phone: from },
                    orderBy: { created_at: "desc" },
                });
            }
            catch (error) {
                this.logger.error(`Error fetching conversation state: ${error}`);
                await this.client.sendMessage(from, "Error al procesar tu mensaje. Intenta de nuevo más tarde.");
                return;
            }
            const isConversationExpired = () => {
                if (!conversationState)
                    return false;
                const createdAt = new Date(conversationState.created_at);
                const now = new Date();
                const diff = now.getTime() - createdAt.getTime();
                const minutes = diff / 60000;
                return minutes > parseInt(process.env.MAX_CONVERSATION_TIME, 10);
            };
            if (isConversationExpired()) {
                await this.savePatientResponse(contactName, from, message.body, 0);
                try {
                    conversationState = await this.prisma.patientResponses.findFirst({
                        where: { patient_phone: from },
                        orderBy: { created_at: "desc" },
                    });
                }
                catch (error) {
                    this.logger.error(`Error fetching conversation state: ${error}`);
                    await this.client.sendMessage(from, "Error al procesar tu mensaje. Intenta de nuevo más tarde.");
                    return;
                }
            }
            if (!conversationState || conversationState.conversationState === 0) {
                if (lowerCaseBody === this.expectedResponses[0]) {
                    await this.client.sendMessage(from, this.conversationalResponses.welcome.message);
                    await this.savePatientResponse(contactName, from, message.body, 1);
                }
                else {
                    await this.client.sendMessage(from, this.conversationalResponses.unknown.message);
                }
                return;
            }
            switch (conversationState.conversationState) {
                case 1:
                    if (this.expectedResponses[1].includes(lowerCaseBody)) {
                        if (lowerCaseBody === "1") {
                            await this.client.sendMessage(from, this.conversationalResponses.option1.message);
                            await this.savePatientResponse(contactName, from, message.body, 0);
                        }
                        else if (lowerCaseBody === "2") {
                            await this.client.sendMessage(from, this.conversationalResponses.option2.message);
                            await this.savePatientResponse(contactName, from, message.body, 2);
                        }
                    }
                    else {
                        await this.client.sendMessage(from, this.conversationalResponses.unknownOption.message);
                    }
                    break;
                case 2:
                    await this.updatePatientResponse(contactName, from, message.body, 2, true);
                    await this.savePatientResponse(contactName, from, message.body, 0);
                    break;
                default:
                    await this.client.sendMessage(from, this.conversationalResponses.unknown.message);
                    break;
            }
        }
        finally {
            this.processingLocks.set(from, false);
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
    async updatePatientResponse(contactName, patientPhone, response, conversationState, appointmentReseverd) {
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
                appointmentReseverd: appointmentReseverd,
            },
        });
    }
    loadReminderResponses() {
        try {
            const filePath = path.join(__dirname, "..", "..", "src", "whatsapp", "responses", "reminder-responses.json");
            const rawData = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(rawData);
        }
        catch (error) {
            console.error("Error loading reminder responses:", error);
            return {};
        }
    }
    async handleReminderMessage(message, reminderMessage) {
        const { from, body } = message;
        const contact = await message.getContact();
        const contactName = contact.pushname || contact.verifiedName;
        const lowerCaseBody = body.toLowerCase();
        const { whatsapp_msg_id: whatsapp_msg_id, appointment_date: appointmentDate, doctor_name: doctorName, patient_full_name: patientFullName, } = reminderMessage;
        const sendResponse = async (statusMessage) => {
            await this.client.sendMessage(from, statusMessage);
        };
        const reminderState = await this.prisma.whatsappMsg.findFirst({
            where: {
                whatsapp_msg_id: whatsapp_msg_id,
                patient_full_name: patientFullName,
                patient_phone: from,
                task_status: { in: [0, 2] },
            },
            orderBy: {
                creation_date: "desc",
            },
        });
        if (reminderState) {
            if (reminderState.task_status === 2 &&
                reminderState.reminder_state === 1) {
                await this.handleRescheduledAppointment(from, reminderState.doctor_name, patientFullName, this.reminderResponses, reminderState.whatsapp_msg_id, body);
                return;
            }
            if (lowerCaseBody.includes("hola")) {
                await this.handleInitialGreeting(from, this.reminderResponses, contactName, patientFullName, appointmentDate, doctorName, reminderState.whatsapp_msg_id);
                return;
            }
            if (reminderState.reminder_state === 0 &&
                reminderState.task_status === 0 &&
                !lowerCaseBody.includes("hola")) {
                await sendResponse(this.reminderResponses.unknown.message);
                return;
            }
        }
        else {
            await sendResponse("No hay recordatorios pendientes.");
            return;
        }
        let newTaskStatus;
        switch (body) {
            case "1":
                newTaskStatus = 1;
                await sendResponse(this.reminderResponses.confirmed.message
                    .replace("{contactName}", contactName || patientFullName)
                    .replace("{patientFullName}", patientFullName)
                    .replace("{appointmentDate}", this.convertToSpanishDate(appointmentDate))
                    .replace("{doctorName}", doctorName));
                await sendResponse(this.reminderResponses.confirmed.additionalMessage);
                await this.updatePatientReminder(from, patientFullName, newTaskStatus, 2, reminderState.whatsapp_msg_id);
                await this.handleConfirmedAppointment(from, doctorName, patientFullName, appointmentDate, whatsapp_msg_id);
                break;
            case "2":
                newTaskStatus = 2;
                await sendResponse(this.reminderResponses.rescheduled.message);
                await sendResponse(this.reminderResponses.additionalInformation.message);
                await this.updatePatientReminder(from, patientFullName, newTaskStatus, 1, reminderState.whatsapp_msg_id);
                break;
            case "3":
                newTaskStatus = 3;
                await sendResponse(this.reminderResponses.cancelled.message);
                await sendResponse(this.reminderResponses.cancelled.additionalMessage);
                await this.updatePatientReminder(from, patientFullName, newTaskStatus, 2, reminderState.whatsapp_msg_id);
                await this.handleCancelledAppointment(from, reminderState.doctor_name, patientFullName, this.reminderResponses, reminderState.whatsapp_msg_id, body);
                break;
            default:
                await sendResponse(this.reminderResponses.invalid.message
                    .replace("{contactName}", contactName || patientFullName)
                    .replace("{patientFullName}", patientFullName)
                    .replace("{appointmentDate}", this.convertToSpanishDate(appointmentDate))
                    .replace("{doctorName}", doctorName));
                await sendResponse(this.reminderResponses.invalid.additionalMessage);
                break;
        }
    }
    async handleCancelledAppointment(from, doctorName, patientFullName, responses, whatsappMsgId, body) {
        try {
            await this.prisma.cancelledAppointment.create({
                data: {
                    whatsapp_msg_id: whatsappMsgId,
                    patient_full_name: patientFullName,
                    patient_phone: from,
                    doctor_name: doctorName,
                    reason: body || "No especificado",
                    created_at: new Date(),
                },
            });
        }
        catch (error) {
            this.logger.error(`Error saving cancelled appointment: ${error}`);
            await this.sendResponse(from, "Ocurrió un error al cancelar la cita. Intenta de nuevo más tarde.");
        }
    }
    async handleRescheduledAppointment(from, doctorName, patientFullName, responses, whatsappMsgId, body) {
        await this.updatePatientReminder(from, patientFullName, 2, 2, whatsappMsgId);
        await this.saveAppointmentReschedule(from, patientFullName, doctorName, body, whatsappMsgId);
    }
    async saveAppointmentReschedule(patientPhone, patientFullName, doctorName, message, whatsappMsgId) {
        try {
            await this.prisma.appointmentReschedule.create({
                data: {
                    message: message,
                    patient_full_name: patientFullName,
                    doctor_name: doctorName,
                    patient_phone: patientPhone,
                    created_at: new Date(),
                    whatsapp_msg_id: whatsappMsgId,
                    confirmed: false,
                },
            });
            this.logger.log(`Appointment reschedule saved for ${patientPhone}`);
        }
        catch (error) {
            this.logger.error(`Error saving appointment reschedule: ${error}`);
        }
    }
    async handleInitialGreeting(from, responses, contactName, patientFullName, appointmentDate, doctorName, whatsappMsgId) {
        const welcomeMessage = this.formatWelcomeMessage(responses.welcome.message, contactName, patientFullName, appointmentDate, doctorName);
        await this.sendResponse(from, welcomeMessage);
        await this.sendResponse(from, responses.welcome.additionalMessage);
        await this.updatePatientReminder(from, patientFullName, 0, 1, whatsappMsgId);
    }
    formatWelcomeMessage(template, contactName, patientFullName, appointmentDate, doctorName) {
        return template
            .replace("{contactName}", contactName || patientFullName)
            .replace("{patientFullName}", patientFullName)
            .replace("{appointmentDate}", this.convertToSpanishDate(appointmentDate))
            .replace("{doctorName}", doctorName);
    }
    async sendResponse(to, message) {
        await this.client.sendMessage(to, message);
    }
    async updatePatientReminder(patientPhone, patient_full_name, newTaskStatus, reminderState, whatsappMsgId) {
        try {
            const latestReminder = await this.prisma.whatsappMsg.findFirst({
                where: {
                    whatsapp_msg_id: whatsappMsgId,
                    patient_full_name: patient_full_name,
                    patient_phone: patientPhone,
                    task_status: { in: [0, 2] },
                },
                orderBy: {
                    creation_date: "desc",
                },
            });
            if (latestReminder) {
                await this.prisma.whatsappMsg.update({
                    where: {
                        whatsapp_msg_id: latestReminder.whatsapp_msg_id,
                    },
                    data: {
                        task_status: newTaskStatus,
                        reminder_state: reminderState,
                    },
                });
            }
            this.logger.log(`Updated reminder status for ${patientPhone} to ${newTaskStatus}, reminder state: ${reminderState}`);
        }
        catch (error) {
            this.logger.error(`Error updating patient reminder: ${error}`);
        }
    }
    convertToSpanishDate(dateString) {
        const date = new Date(dateString);
        const months = [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${day} de ${month} de ${year} a las ${hours}:${minutes}`;
    }
    setCurrentUserId(userId) {
        this.currentUserId = userId;
    }
    startConversationMode() {
        this.conversationModeActive = true;
        this.logger.log("Modo conversacional activado.");
    }
    stopConversationMode() {
        this.conversationModeActive = false;
        this.logger.log("Modo recordatorio activado.");
    }
    isConversationModeActive() {
        return this.conversationModeActive;
    }
    setBotEnabled(enabled) {
        this.botEnabled = enabled;
        this.logger.log(`Bot status changed: ${enabled ? "Enabled" : "Disabled"}`);
    }
    isBotEnabled() {
        return this.botEnabled;
    }
    async logUserAudit(action, details) {
        if (!this.currentUserId) {
            this.logger.warn("No user ID set for auditing purposes.");
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
    clearAuthAndCacheFolders() {
        const fs = require("fs");
        const path = require("path");
        const authFolderPath = path.join(__dirname, "..", "..", ".wwebjs_auth", "session", "Default");
        const cacheFolderPath = path.join(__dirname, "..", "..", ".wwebjs_cache");
        fs.rm(authFolderPath, { recursive: true, force: true });
        fs.rm(cacheFolderPath, { recursive: true, force: true });
    }
    async handleConfirmedAppointment(from, doctorName, patientFullName, appointmentDate, whatsappMsgId) {
        try {
            await this.prisma.confirmedAppointment.create({
                data: {
                    whatsapp_msg_id: whatsappMsgId,
                    patient_full_name: patientFullName,
                    patient_phone: from,
                    doctor_name: doctorName,
                    appointment_date: appointmentDate,
                    created_at: new Date(),
                    confirmation_date: new Date(),
                },
            });
            await this.sendResponse(from, "Tu cita ha sido confirmada exitosamente.");
        }
        catch (error) {
            this.logger.error(`Error saving confirmed appointment: ${error}`);
            await this.sendResponse(from, "Ocurrió un error al confirmar la cita. Intenta de nuevo más tarde.");
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map