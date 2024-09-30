import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, ClientInfo, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { PrismaService } from '../prisma/prisma.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private clientInfo: ClientInfo | null = null;
  private messageStatusMap: Map<
    string,
    { resolve: (status: number) => void; reject: (error: any) => void }
  > = new Map();
  private clientStatus$ = new BehaviorSubject<string>('initializing');
  private qrCodeSubject$ = new BehaviorSubject<string | null>(null);
  private authenticatedPhoneNumber: string | null = null;
  private currentUserId: number | null = null;
  private conversationModeActive = false; // Estado del modo conversacional
  private botEnabled = true; // Estado del bot, true para habilitado, false para deshabilitado


  constructor(private readonly prisma: PrismaService) {
    const os = require('os');
    const isLinux = os.platform() === 'linux';

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: isLinux ? {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],        
      } : undefined
    });

    this.client.on('qr', (qr: string) => {
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

    this.client.on('message', async (message: Message) => {
      const { from } = message;
      const currentDate = new Date();

      if (this.conversationModeActive) 
      {

      //console.log('from', from);  
      const reminderMessages = await this.prisma.whatsappMsg.findFirst({
        where: {
          patient_phone: from,
          task_status: { in: [0, 2] },
          reminder_state: { not: 2 },
          appointment_date: {
            lt: currentDate, // Filtra para que la fecha sea menor a la fecha actual
          },
        },
      });

      
      if (!reminderMessages) {
      
          await this.handleConversationalMessage(message);        
      } else {     
          await this.handleReminderMessage(message, reminderMessages);
      }
    }
    });

    this.client.initialize();    
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

  async sendMessage(
    to: string,
    message: string,
    options?: string,
  ): Promise<number> {
    if (!this.clientInfo?.wid) {
      throw new Error('Client is not initialized or connected.');
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
      const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'conversational-responses.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading conversational responses:', error);
      return {}; // Return an empty object as a fallback
    }
  }

  async handleConversationalMessage(message: Message) {
    const { from, body } = message;
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.verifiedName;
    const responses = this.loadConversationalResponses();
    const lowerCaseBody = body.toLowerCase();

    // Obtener el estado actual de la conversación
    const conversationState = await this.prisma.patientResponses.findFirst({
      where: {
        patient_phone: from,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!conversationState || conversationState.conversationState === 0) {
      // Nuevo usuario o conversación no iniciada
      if (lowerCaseBody.includes('hola')) {        
        await this.client.sendMessage(from, responses.welcome.message);
        await this.savePatientResponse(contactName, from, body, 1); // Iniciar conversación
      } else {
        await this.client.sendMessage(from, responses.unknown.message);
      }
      return;
    }

    // Manejar estados de conversación
    switch (conversationState.conversationState) {
      case 1: // Después del mensaje de bienvenida
        if (lowerCaseBody === '1') {
          await this.client.sendMessage(from, responses.option1.message);
          await this.savePatientResponse(contactName, from, body, 0); // 0 indica que la conversación continua
        } else if (lowerCaseBody === '2') {
          await this.client.sendMessage(from, responses.option2.message);
          await this.savePatientResponse(contactName, from, body, 2); // 2 indica que la conversación termina
        } else {
          await this.client.sendMessage(from, responses.unknownOption.message);
        }
        break;
      
      case 2: // Después de elegir opción 1 o 2
        await this.client.sendMessage(from, responses.thanks.message);
        await this.updatePatientResponse(contactName, from, body, 2); // Finalizar conversación
        //await this.savePatientResponse(contactName, from, body, 0);
        break;
      
            
      default:
        await this.client.sendMessage(from, responses.unknown.message);
        break;
    }
  }

  private async savePatientResponse(contactName: string, patientPhone: string, response: string, conversationState: number) {
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

  private async updatePatientResponse(contactName: string, patientPhone: string, response: string, conversationState: number) {
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
      },
    });
  }
  
  private loadReminderResponses() {
    try {
      const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'reminder-responses.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading reminder responses:', error);
      return {}; // Return an empty object as a fallback
    }
  };

  async handleReminderMessage(message: Message, whatsappMessage: any) {
    const { from, body } = message;
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.verifiedName;
    const lowerCaseBody = body.toLowerCase();

    const responses = this.loadReminderResponses();

    const {
      appointment_date: appointmentDate,
      doctor_name: doctorName,
      patient_full_name: patientFullName,
    } = whatsappMessage;

    const sendResponse = async (statusMessage: string) => {
      await this.client.sendMessage(from, statusMessage);
    };

    // Verificar si es el primer mensaje del recordatorio
    const reminderState = await this.prisma.whatsappMsg.findFirst({
      where: {
        patient_phone: from,
        task_status: { in: [0, 2] }, // Pendiente o Reprogramado
      },
      orderBy: {
        creation_date: 'desc',
      },
    });

    if (reminderState) {
      if (reminderState.task_status === 2 && reminderState.reminder_state === 1) {
        await this.handleRescheduledAppointment(from, responses);
        return;
      }

      if (lowerCaseBody.includes('hola')) {
        await this.handleInitialGreeting(from, responses, contactName, patientFullName, appointmentDate, doctorName);
        return;
      }

      if (reminderState.reminder_state === 0 && !lowerCaseBody.includes('hola')) {
        await sendResponse(responses.unknown.message);
        return;
      }
    }

    // Procesar la respuesta del paciente
    let newTaskStatus: number;

    switch (body) {
      case '1':
        newTaskStatus = 1; // Confirmed
        await sendResponse(
          responses.confirmed.message
            .replace('{contactName}', contactName || patientFullName)
            .replace('{patientFullName}', patientFullName)
            .replace('{appointmentDate}', this.convertToSpanishDate(appointmentDate))
            .replace('{doctorName}', doctorName)
        );
        await sendResponse(responses.confirmed.additionalMessage);
        await this.updatePatientReminder(from, newTaskStatus, 2); // 2 indica que se ha recibido una respuesta
        break;
      case '2':
        newTaskStatus = 2; // Rescheduled
        await sendResponse(responses.rescheduled.message);
        await sendResponse(responses.additionalInformation.message);
        await this.updatePatientReminder(from, newTaskStatus, 1); // 1 indica que la conversaciona continua
        break;
      case '3':
        newTaskStatus = 3; // Cancelled
        await sendResponse(responses.cancelled.message);
        await sendResponse(responses.cancelled.additionalMessage);
        await this.updatePatientReminder(from, newTaskStatus, 2); // 2 indica que se ha recibido una respuesta
        break;
      default:        
        await sendResponse(responses.invalid.message);
        break;
    }

    // Update the patient reminder status
  }

  private async handleRescheduledAppointment(from: string, responses: any) {
    await this.sendResponse(from, responses.thanks.message);
    await this.updatePatientReminder(from, 2, 2);
  }

  private async handleInitialGreeting(
    from: string, 
    responses: any, 
    contactName: string, 
    patientFullName: string, 
    appointmentDate: string, 
    doctorName: string
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
    await this.updatePatientReminder(from, 0, 1);
  }

  private formatWelcomeMessage(
    template: string,
    contactName: string,
    patientFullName: string,
    appointmentDate: string,
    doctorName: string
  ): string {
    return template
      .replace('{contactName}', contactName || patientFullName)
      .replace('{patientFullName}', patientFullName)
      .replace('{appointmentDate}', this.convertToSpanishDate(appointmentDate))
      .replace('{doctorName}', doctorName);
  }

  private async sendResponse(to: string, message: string) {
    await this.client.sendMessage(to, message);
  }

  // Actualizar el método updatePatientReminder para incluir el estado del recordatorio
  private async updatePatientReminder(patientPhone: string, newTaskStatus: number, reminderState: number) {
    try {
      await this.prisma.whatsappMsg.updateMany({
        where: {
          patient_phone: patientPhone,
          task_status: { in: [0, 2] }, // Update pending reminders or rescheduled ones
        },
        data: {
          task_status: newTaskStatus,
          reminder_state: reminderState,
        },
      });
      this.logger.log(`Updated reminder status for ${patientPhone} to ${newTaskStatus}, reminder state: ${reminderState}`);
    } catch (error) {
      this.logger.error(`Error updating patient reminder: ${error}`);
    }
  }

  private convertToSpanishDate(dateString: string): string {
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

  setCurrentUserId(userId: number) {
    this.currentUserId = userId;
  }

  // Método para iniciar el modo conversacional
  // Métodos para alternar entre modos
  startConversationMode() {
    this.conversationModeActive = true;
    this.logger.log('Modo conversacional activado.');
  }

  stopConversationMode() {
    this.conversationModeActive = false;
    this.logger.log('Modo recordatorio activado.');
  }

  isConversationModeActive(): boolean {
    return this.conversationModeActive;
  }

  setBotEnabled(enabled: boolean) {
    this.botEnabled = enabled;
    this.logger.log(`Bot status changed: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  isBotEnabled(): boolean {
    return this.botEnabled;
  }

  private async logUserAudit(action: string, details?: string) {
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

  private getIPAddress(): string | null {
    return null;
  }
}