import { Injectable, Logger } from "@nestjs/common";
import {
  Client,
  LocalAuth,
  ClientInfo,
  Message,
  RemoteAuth,
  NoAuth,
} from "whatsapp-web.js";
import * as qrcode from "qrcode-terminal";
import { BehaviorSubject, Observable, of } from "rxjs";
import { filter } from "rxjs/operators";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private clientInfo: ClientInfo | null = null;
  private messageStatusMap: Map<
    string,
    { resolve: (status: number) => void; reject: (error: any) => void }
  > = new Map();
  private clientStatus$ = new BehaviorSubject<string>("initializing");
  private qrCodeSubject$ = new BehaviorSubject<string | null>(null);
  private authenticatedPhoneNumber: string | null = null;
  private currentUserId: number | null = null;
  private conversationModeActive = false; // Estado del modo conversacional
  private botEnabled = true; // Estado del bot, true para habilitado, false para deshabilitado
  private conversationalResponses: any; // Variable para almacenar respuestas conversacionales
  private reminderResponses: any; // Variable para almacenar respuestas de recordatorio
  private processingLocks: Map<string, boolean> = new Map();
  private presenceUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    const os = require("os");
    const isLinux = os.platform() === "linux";

    this.client = new Client({
      authStrategy: new NoAuth(),
      //   new LocalAuth({
      //     clientId: "cesasin",
      //     dataPath: './.wwebjs_auth' // Guarda la sesión en una carpeta específica
      // }),
      // authStrategy: new MySQLAuthStrategy(this.prisma),
      puppeteer: isLinux
        ? {
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          }
        : undefined,
    });
    
    //this.clearAuthAndCacheFolders();
    // this.client.initialize();
    this.initializeClient();
  }

  private loadPhoneNumbersToAvoid() {
    try {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "src",
        "whatsapp",
        "phone-numbers-avoid",
        "phone-list.json"
      );
      const rawData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(rawData);
    } catch (error) {
      console.error("Error loading reminder phones:", error);
      return {}; // Return an empty object as a fallback
    }
  }

  private initializeClient() {
    const os = require("os");
    const isLinux = os.platform() === "linux";    
    this.client = new Client({
      authStrategy: new NoAuth(),
      puppeteer: isLinux
        ? {
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          }
        : undefined,
    });

    this.client.initialize();

    this.client.on("qr", (qr: string) => {
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

      this.startKeepAlive(); // Inicia el mecanismo de keep-alive
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
      this.stopPresenceUpdates(); // Detiene el mecanismo al desconectarse
      //  this.clearAuthAndCacheFolders();
    });

    this.client.on("message", async (message: Message) => {
      const phoneNumbersToAvoid = this.loadPhoneNumbersToAvoid();
      const phoneList = phoneNumbersToAvoid.phones;
      const phoneArray = [];

      for (const [_, value] of Object.entries(phoneList)) {
        phoneArray.push(value);
      }

      const { from } = message;

      if (
        from.endsWith("@g.us") ||
        phoneArray.includes(`${from.replace("@c.us", "")}`)
      ) {
        return; // Salir de la función para evitar procesar mensajes de grupo
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
                gt: currentDate, // Filtra para que la fecha del turno sea mayor a la fecha actual'
              },
            },
            orderBy: {
              creation_date: "desc",
            },
          });

          if (!reminderMessages) {
            await this.handleConversationalMessage(message);
          } else {
            //console.log('reminderMessages',reminderMessages)
            await this.handleReminderMessage(message, reminderMessages);
          }
        } catch (error) {
          console.log(error);
        }
      }
    });

    this.conversationalResponses = this.loadConversationalResponses();
    this.reminderResponses = this.loadReminderResponses();

  }

  getClientStatus(): Observable<string> {
    return this.clientStatus$.asObservable();
  }

  getQRCode(): Observable<string | null> {
    return this.qrCodeSubject$.asObservable().pipe(filter((qr) => qr !== null));
  }

  getAuthenticatedPhoneNumber(): Observable<string | null> {
    return this.clientInfo ? of(this.clientInfo.wid.user) : of(null);
  }

  private async startKeepAlive() {
    const keepAliveInterval = 1 * 30 * 1000; // Cada 5 minutos (ajústalo según necesidades)

    setInterval(async () => {
      try {
        console.log("Simulating typing activity...");
        const chat = await this.client.getChatById("5492616689241@c.us"); // Usa un ID de prueba o alterna entre varios si es posible
        if (chat) {
          await chat.sendStateTyping();
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Simular "escribiendo" durante 2 segundos
          await chat.clearState();
          console.log(
            new Date().toLocaleString(),
            "Typing activity simulated."
          );
        }
      } catch (error) {
        console.error("Error simulating typing:", error.message);
        if (error) {
          // Maneja la reconexión o envía alertas si es necesario
          console.log("Attempting to reinitialize the client...");
          // this.client.initialize();
        }
      }
    }, keepAliveInterval);
  }

  private startPresenceUpdates() {
    const intervalTime = 5 * 60 * 1000; // 5 minutos (ajusta según necesidad)

    this.presenceUpdateInterval = setInterval(async () => {
      try {
        this.logger.log("Sending presence update to keep session alive...");
        await this.client.sendPresenceAvailable(); // Enviar presencia "disponible"
        this.logger.log("Presence update sent successfully.");
      } catch (error) {
        this.logger.error(`Error sending presence update: ${error.message}`);
        if (error.message.includes("disconnected")) {
          this.logger.log("Attempting to reinitialize the client...");
          // this.client.initialize(); // Intenta reinicializar el cliente si es necesario
        }
      }
    }, intervalTime);
  }

  private stopPresenceUpdates() {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
      this.presenceUpdateInterval = null;
    }
  }

  async sendMessage(
    to: string,
    message: string,
    options?: string
  ): Promise<number> {
    if (!this.clientInfo?.wid) {
      throw new Error("Client is not initialized or connected.");
    }

    try {
      const fullMessage =
        options && options.length > 0 ? `${message} ${options}` : message;

      const sentMessage = await this.client.sendMessage(to, fullMessage);
      //console.log(to, fullMessage);

      this.messageStatusMap.set(sentMessage.id.id, {
        resolve: (status: number) => Promise.resolve(status),
        reject: (error: any) => Promise.reject(error),
      });

      return 1; // Status de éxito si el mensaje fue enviado
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private loadConversationalResponses() {
    try {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "src",
        "whatsapp",
        "responses",
        "conversational-responses.json"
      );
      const rawData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(rawData);
    } catch (error) {
      console.error("Error loading conversational responses:", error);
      return {}; // Return an empty object as a fallback
    }
  }

  // Mapa de respuestas esperadas definido fuera de la función
  private expectedResponses = {
    0: "hola", // Estado inicial
    1: ["1", "2"], // Opciones después del mensaje de bienvenida
    2: [], // No se esperan más respuestas
  };

  async handleConversationalMessage(message: Message) {
    const { from } = message;

    // Verificar si ya se está procesando un mensaje para este usuario
    if (this.processingLocks.get(from)) {
      await this.client.sendMessage(
        from,
        "Por favor, espera mientras procesamos tu mensaje."
      );
      return;
    }

    // Establecer el bloqueo
    this.processingLocks.set(from, true);

    try {
      const contact = await message.getContact();
      const contactName = contact.pushname || contact.verifiedName;
      const lowerCaseBody = message.body.toLowerCase();

      // Obtener el estado actual de la conversación
      let conversationState;
      try {
        conversationState = await this.prisma.patientResponses.findFirst({
          where: { patient_phone: from },
          orderBy: { created_at: "desc" },
        });
      } catch (error) {
        this.logger.error(`Error fetching conversation state: ${error}`);
        await this.client.sendMessage(
          from,
          "Error al procesar tu mensaje. Intenta de nuevo más tarde."
        );
        return;
      }

      // Verificar si conversationState es null
      const isConversationExpired = () => {
        if (!conversationState) return false;
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
        } catch (error) {
          this.logger.error(`Error fetching conversation state: ${error}`);
          await this.client.sendMessage(
            from,
            "Error al procesar tu mensaje. Intenta de nuevo más tarde."
          );
          return;
        }
      }

      if (!conversationState || conversationState.conversationState === 0) {
        // Nuevo usuario o conversación no iniciada
        if (lowerCaseBody === this.expectedResponses[0]) {
          await this.client.sendMessage(
            from,
            this.conversationalResponses.welcome.message
          );
          await this.savePatientResponse(contactName, from, message.body, 1); // Iniciar conversación
        } else {
          await this.client.sendMessage(
            from,
            this.conversationalResponses.unknown.message
          );
        }
        return;
      }

      // Manejar estados de conversación
      switch (conversationState.conversationState) {
        case 1: // Después del mensaje de bienvenida
          if (this.expectedResponses[1].includes(lowerCaseBody)) {
            if (lowerCaseBody === "1") {
              await this.client.sendMessage(
                from,
                this.conversationalResponses.option1.message
              );
              await this.savePatientResponse(
                contactName,
                from,
                message.body,
                0
              ); // 0 indica que la conversación continua
            } else if (lowerCaseBody === "2") {
              await this.client.sendMessage(
                from,
                this.conversationalResponses.option2.message
              );
              await this.savePatientResponse(
                contactName,
                from,
                message.body,
                2
              ); // 2 indica que la conversación termina
            }
          } else {
            await this.client.sendMessage(
              from,
              this.conversationalResponses.unknownOption.message
            );
          }
          break;

        case 2: // Después de elegir opción 2
          // await this.client.sendMessage(
          //   from,
          //   this.conversationalResponses.thanks.message
          // );
          await this.updatePatientResponse(
            contactName,
            from,
            message.body,
            2,
            true
          ); // Finalizar conversación
          await this.savePatientResponse(contactName, from, message.body, 0);
          break;

        default:
          await this.client.sendMessage(
            from,
            this.conversationalResponses.unknown.message
          ); // Manejo de estado no esperado
          break;
      }
    } finally {
      // Liberar el bloqueo
      this.processingLocks.set(from, false);
    }
  }

  private async savePatientResponse(
    contactName: string,
    patientPhone: string,
    response: string,
    conversationState: number
  ) {
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

  private async updatePatientResponse(
    contactName: string,
    patientPhone: string,
    response: string,
    conversationState: number,
    appointmentReseverd?: boolean
  ) {
    await this.prisma.patientResponses.updateMany({
      where: {
        patient_full_name: contactName,
        patient_phone: patientPhone,
        conversationState: 1, // Actualizar solo si la conversación está en curso
      },
      data: {
        response: response,
        received_at: new Date(),
        conversationState: conversationState,
        appointmentReseverd: appointmentReseverd,
      },
    });
  }

  private loadReminderResponses() {
    try {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "src",
        "whatsapp",
        "responses",
        "reminder-responses.json"
      );
      const rawData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(rawData);
    } catch (error) {
      console.error("Error loading reminder responses:", error);
      return {}; // Return an empty object as a fallback
    }
  }

  async handleReminderMessage(message: Message, reminderMessage: any) {
    const { from, body } = message;
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.verifiedName;
    const lowerCaseBody = body.toLowerCase();

    const {
      whatsapp_msg_id: whatsapp_msg_id,
      appointment_date: appointmentDate,
      doctor_name: doctorName,
      patient_full_name: patientFullName,
    } = reminderMessage;

    const sendResponse = async (statusMessage: string) => {
      await this.client.sendMessage(from, statusMessage);
    };

    // Verificar si es el primer mensaje del recordatorio
    // SQL equivalent query:
    // SELECT * FROM whatsappMsg
    // WHERE patient_full_name = :patientFullName AND patient_phone = :from AND task_status IN (0, 2)
    // ORDER BY creation_date DESC LIMIT 1;
    const reminderState = await this.prisma.whatsappMsg.findFirst({
      where: {
        whatsapp_msg_id: whatsapp_msg_id,
        patient_full_name: patientFullName,
        patient_phone: from,
        task_status: { in: [0, 2] }, // Pendiente o Reprogramado
      },
      orderBy: {
        creation_date: "desc",
      },
    });

    if (reminderState) {
      if (
        reminderState.task_status === 2 &&
        reminderState.reminder_state === 1
      ) {
        await this.handleRescheduledAppointment(
          from,
          reminderState.doctor_name,
          patientFullName,
          this.reminderResponses,
          reminderState.whatsapp_msg_id,
          body
        ); // 2 - 2

        return;
      }

      if (lowerCaseBody.includes("hola")) {
        await this.handleInitialGreeting(
          from,
          this.reminderResponses,
          contactName,
          patientFullName,
          appointmentDate,
          doctorName,
          reminderState.whatsapp_msg_id
        );
        return;
      }

      if (
        reminderState.reminder_state === 0 &&
        reminderState.task_status === 0 &&
        !lowerCaseBody.includes("hola")
      ) {
        await sendResponse(this.reminderResponses.unknown.message);
        return;
      }
    } else {
      // Si no hay recordatorio, enviar un mensaje de error
      await sendResponse("No hay recordatorios pendientes.");
      return;
    }

    // Procesar la respuesta del paciente
    let newTaskStatus: number;

    switch (body) {
      case "1":
        newTaskStatus = 1; // Confirmed
        await sendResponse(
          this.reminderResponses.confirmed.message
            .replace("{contactName}", contactName || patientFullName)
            .replace("{patientFullName}", patientFullName)
            .replace(
              "{appointmentDate}",
              this.convertToSpanishDate(appointmentDate)
            )
            .replace("{doctorName}", doctorName)
        );
        await sendResponse(this.reminderResponses.confirmed.additionalMessage);
        await this.updatePatientReminder(
          from,
          patientFullName,
          newTaskStatus,
          2,
          reminderState.whatsapp_msg_id
        ); // 2 indica que se ha recibido una respuesta
        await this.handleConfirmedAppointment(
          from,
          doctorName,
          patientFullName,
          appointmentDate,
          whatsapp_msg_id
        );
        break;
      case "2":
        newTaskStatus = 2; // Rescheduled
        await sendResponse(this.reminderResponses.rescheduled.message);
        await sendResponse(
          this.reminderResponses.additionalInformation.message
        );
        await this.updatePatientReminder(
          from,
          patientFullName,
          newTaskStatus,
          1,
          reminderState.whatsapp_msg_id
        ); // 1 indica que la conversación continúa
        break;
      case "3":
        newTaskStatus = 3; // Cancelled
        await sendResponse(this.reminderResponses.cancelled.message);
        await sendResponse(this.reminderResponses.cancelled.additionalMessage);
        await this.updatePatientReminder(
          from,
          patientFullName,
          newTaskStatus,
          2,
          reminderState.whatsapp_msg_id
        ); // 2 indica que se ha recibido una respuesta

        await this.handleCancelledAppointment(
          from,
          reminderState.doctor_name,
          patientFullName,
          this.reminderResponses,
          reminderState.whatsapp_msg_id,
          body
        );

        break;
      default:
        // Manejo de respuestas no reconocidas
        await sendResponse(
          this.reminderResponses.invalid.message
            .replace("{contactName}", contactName || patientFullName)
            .replace("{patientFullName}", patientFullName)
            .replace(
              "{appointmentDate}",
              this.convertToSpanishDate(appointmentDate)
            )
            .replace("{doctorName}", doctorName)
        );
        await sendResponse(this.reminderResponses.invalid.additionalMessage);
        break;
    }
  }

  private async handleCancelledAppointment(
    from: string,
    doctorName: string,
    patientFullName: string,
    responses: any,
    whatsappMsgId: number,
    body?: string
  ) {
    // Guardar la información de la cita cancelada en la base de datos
    try {
      await this.prisma.cancelledAppointment.create({
        data: {
          whatsapp_msg_id: whatsappMsgId,
          patient_full_name: patientFullName,
          patient_phone: from,
          doctor_name: doctorName,
          reason: body || "No especificado", // Usar el cuerpo del mensaje como razón, si está disponible
          created_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error saving cancelled appointment: ${error}`);
      await this.sendResponse(
        from,
        "Ocurrió un error al cancelar la cita. Intenta de nuevo más tarde."
      );
    }
  }

  private async handleRescheduledAppointment(
    from: string,
    doctorName: string,
    patientFullName: string,
    responses: any,
    whatsappMsgId: number,
    body?: string
  ) {
    // await this.sendResponse(from, responses.thanks.message);
    await this.updatePatientReminder(
      from,
      patientFullName,
      2,
      2,
      whatsappMsgId
    );
    await this.saveAppointmentReschedule(
      from,
      patientFullName,
      doctorName,
      body,
      whatsappMsgId
    );
  }

  private async saveAppointmentReschedule(
    patientPhone: string,
    patientFullName: string,
    doctorName: string,
    message: string,
    whatsappMsgId: number
  ) {
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
    } catch (error) {
      this.logger.error(`Error saving appointment reschedule: ${error}`);
    }
  }

  private async handleInitialGreeting(
    from: string,
    responses: any,
    contactName: string,
    patientFullName: string,
    appointmentDate: string,
    doctorName: string,
    whatsappMsgId: number
  ) {
    const welcomeMessage = this.formatWelcomeMessage(
      responses.welcome.message,
      contactName,
      patientFullName,
      appointmentDate,
      doctorName
    );
    await this.sendResponse(from, welcomeMessage);
    await this.sendResponse(from, responses.welcome.additionalMessage);
    await this.updatePatientReminder(
      from,
      patientFullName,
      0,
      1,
      whatsappMsgId
    );
  }

  private formatWelcomeMessage(
    template: string,
    contactName: string,
    patientFullName: string,
    appointmentDate: string,
    doctorName: string
  ): string {
    return template
      .replace("{contactName}", contactName || patientFullName)
      .replace("{patientFullName}", patientFullName)
      .replace("{appointmentDate}", this.convertToSpanishDate(appointmentDate))
      .replace("{doctorName}", doctorName);
  }

  private async sendResponse(to: string, message: string) {
    await this.client.sendMessage(to, message);
  }

  // Actualizar el método updatePatientReminder para incluir el estado del recordatorio
  private async updatePatientReminder(
    patientPhone: string,
    patient_full_name: string,
    newTaskStatus: number,
    reminderState: number,
    whatsappMsgId?: number
  ) {
    try {
      const latestReminder = await this.prisma.whatsappMsg.findFirst({
        where: {
          whatsapp_msg_id: whatsappMsgId,
          patient_full_name: patient_full_name,
          patient_phone: patientPhone,
          task_status: { in: [0, 2] }, // Find the latest pending reminder or rescheduled one
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
      this.logger.log(
        `Updated reminder status for ${patientPhone} to ${newTaskStatus}, reminder state: ${reminderState}`
      );
    } catch (error) {
      this.logger.error(`Error updating patient reminder: ${error}`);
    }
  }

  private convertToSpanishDate(dateString: string): string {
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

  setCurrentUserId(userId: number) {
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

  isConversationModeActive(): boolean {
    return this.conversationModeActive;
  }

  setBotEnabled(enabled: boolean) {
    this.botEnabled = enabled;
    this.logger.log(`Bot status changed: ${enabled ? "Enabled" : "Disabled"}`);
  }

  isBotEnabled(): boolean {
    return this.botEnabled;
  }

  private async logUserAudit(action: string, details?: string) {
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

  private getIPAddress(): string | null {
    return null;
  }

  async handleConfirmedAppointment(
    from: string,
    doctorName: string,
    patientFullName: string,
    appointmentDate: Date,
    whatsappMsgId: number
  ) {
    // Guardar la información de la cita confirmada en la base de datos
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
    } catch (error) {
      this.logger.error(`Error saving confirmed appointment: ${error}`);
      await this.sendResponse(
        from,
        "Ocurrió un error al confirmar la cita. Intenta de nuevo más tarde."
      );
    }
  }

  async restartClient(): Promise<void> {
    try {
      this.logger.log("Restarting WhatsApp client...");

      if (this.client) {
        this.logger.log("WhatsApp client destroyed...");
        await this.client.destroy();
      }
      // Limpiar archivos de sesión y caché (opcional, pero recomendable)
      this.clearAuthAndCacheFolders();

      this.initializeClient();

      this.logger.log("WhatsApp client restarted successfully.");
    } catch (error) {
      this.logger.error("Error restarting WhatsApp client:", error);
      throw new Error("Failed to restart WhatsApp client.");
    }
  }

  private clearAuthAndCacheFolders() {
    const fs = require("fs");
    const path = require("path");

    // const authFolderPath = path.join(__dirname, "..", "..", ".wwebjs_auth");
    const cacheFolderPath = path.join(__dirname, "..", "..", ".wwebjs_cache");

    try {
      // fs.rmSync(authFolderPath, { recursive: true, force: true });
      fs.rmSync(cacheFolderPath, { recursive: true, force: true });
      this.logger.log("Authentication and cache folders cleared.");
    } catch (error) {
      this.logger.error("Error clearing auth and cache folders:", error);
    }
  }
}
