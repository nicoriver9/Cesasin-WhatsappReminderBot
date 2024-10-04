import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service'; // Corrige el typo en 'primsa.service'
import { Observable, of } from 'rxjs';
import { Request } from 'express'; 
import { switchMap, map, take } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../jwt-auth/jwt-auth.guard';
import { User } from '../decorators/user.decorator';

@Controller('api/whatsapp') // Cambiar de 'api.whatsapp' a 'api/whatsapp'
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('get-qr')
  getQRCode(@User() user: any): Observable<any> {
    this.whatsappService.setCurrentUserId(user.user_id);
    return this.whatsappService.getClientStatus().pipe(
      switchMap((status) => {
        if (status === 'authenticated') {
          return of({ message: 'Client is already authenticated' });
        } else if (status === 'qr') {
          return this.whatsappService.getQRCode().pipe(
            take(1),
            map((qrCode) => ({ qrCode: qrCode })),
          );
        } else if (status === 'ready') {
          return of({ message: 'ready' });
        } else {
          return of({ message: 'Client status unknown' });
        }
      }),
      take(1),
    );
  }

  private loadReminderMessage() {
    try {
      const filePath = path.join(__dirname, '..', '..', 'src', 'whatsapp', 'responses', 'reminder-message.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading reminder messages:', error);
      return {}; // Return an empty object as a fallback
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-reminders')
  async sendReminders(@User() user: any, @Body() reminders: Array<any>, request: Request) {    
    this.whatsappService.setCurrentUserId(user.user_id);
    const whatsappMsgData = [];
    const userAuditData = [];

    for (const reminder of reminders) {
      const { patient_fullname, attachment, doctor, patient_cel } = reminder;
    
      const reminderMessages = this.loadReminderMessage();
      const welcomeMessage = reminderMessages.welcome.message;
      const additionalMessage = reminderMessages.welcome.additionalMessage;
      const options = reminderMessages.welcome.options;
      
      // Convertir la fecha al formato español
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
            reminder_state: 0,
          });

          userAuditData.push({
            user_id: user.user_id,
            action: `Appointment reminder sent to ${phone}`,
            details: `Message: "${message}"`,
            ip_address: this.getIPAddress(request),
          });
        } catch (error) {
          console.log(`Failed to send message to ${phone}:`, error);
        }
      }
    }

    // Perform batch inserts
    await this.prisma.$transaction([
      this.prisma.whatsappMsg.createMany({ data: whatsappMsgData }),
      this.prisma.userAudit.createMany({ data: userAuditData }),
    ]);

    return { status: 'Reminders sent successfully' };
  }

  private convertToSpanishDate(dateString: string): string {
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

  @UseGuards(JwtAuthGuard)
  @Get('phone-number')
  async getPhoneNumber() {
    return this.whatsappService
      .getAuthenticatedPhoneNumber()
      .toPromise()
      .then((phoneNumber) => {
        if (phoneNumber) {
          return { phoneNumber: phoneNumber };
        } else {
          return {
            message:
              'Client is not authenticated or phone number is not available',
          };
        }
      });
  }

  @UseGuards(JwtAuthGuard)
  @Get('getUser')
  getCurrentUser(@User() user: any, ) {    
    return { currentUser: `${user.username}` };
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-bot-status')
  setBotStatus(@User() user: any, @Body() body: { enabled: boolean }) {
    this.whatsappService.setCurrentUserId(user.user_id);
    this.whatsappService.setBotEnabled(body.enabled);
    return { message: `Bot is now ${body.enabled ? 'enabled' : 'disabled'}` };
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('messages-reschedule')
  async getRescheduleMessages() {    
    try {    
      return await this.prisma.appointmentReschedule.findMany();    
    } catch (error) {
      return { message: 'Error retrieving reschedule messages', error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient-responses')
  async getPatientResponses(@User() user: any) {
    // Establecer el usuario actual para auditoría si es necesario
    //this.whatsappService.setCurrentUserId(user.user_id);

    try {
      // Consultar los registros de patientresponses con response igual a 2
      const messages = await this.prisma.patientResponses.findMany({
        where: {          
          appointmentReseverd: true,
        },
      });
      
      return  messages;
    } catch (error) {
      return { message: 'Error retrieving patient responses', error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-rescheduled-message')
  async sendRescheduledMessage(
    @User() user: any,
    @Body() body: { patientId: number, message: string, patientPhone: string },
    @Req() request: Request
  ) {
    this.whatsappService.setCurrentUserId(user.user_id);

    try {
      // Buscar el paciente en whatsappMsg y patientResponses
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

      // Obtener el número de teléfono del paciente
      const phoneNumber = whatsappMsg?.patient_phone || patientResponse?.patient_phone;

      if (!phoneNumber) {
        return { message: 'Patient phone number not found' };
      }

      // Convertir el número de teléfono a un formato válido para WhatsApp
      let whatsappNumber = phoneNumber.replace(/\D/g, ''); // Eliminar todos los caracteres no numéricos
      
      if (!whatsappNumber.endsWith('@c.us')) {
        whatsappNumber += '@c.us'; // Agregar el sufijo '@c.us' si no está presente
      }

      // Enviar el mensaje
      await this.whatsappService.sendMessage(whatsappNumber, body.message);      

      // Actualizar el estado en whatsappMsg si existe
      if (whatsappMsg) {
        await this.prisma.whatsappMsg.update({
          where: { whatsapp_msg_id: whatsappMsg.whatsapp_msg_id },
          data: { task_status: 5 }, // Asumiendo que 5 significa "mensaje de reprogramación enviado"
        });
      }

      // Actualizar el estado en patientResponses si existe
      if (patientResponse) {
        await this.prisma.patientResponses.update({
          where: { response_id: patientResponse.response_id },
          data: { response: "5" }, // Asumiendo que "5" significa "mensaje de reprogramación enviado"
        });
      }

      // Registrar en la tabla de auditoría
      await this.prisma.userAudit.create({
        data: {
          user_id: user.user_id,
          action: `Rescheduled appointment message sent`,
          details: `Message: "${body.message}" sent to ${phoneNumber}`,
          ip_address: this.getIPAddress(request),
        },
      });

      return { message: 'Rescheduled message sent successfully' };
    } catch (error) {
      console.error('Error sending rescheduled message:', error);
      return { message: 'Error sending rescheduled message', error: error.message };
    }
  }



  private getIPAddress(request: Request): string | null {
    // Primero intenta obtener la IP desde el encabezado 'x-forwarded-for'
    // const forwardedFor = request.headers['x-forwarded-for'];
    // if (typeof forwardedFor === 'string') {
    //   // 'x-forwarded-for' puede contener una lista de IPs, toma la primera
    //   return forwardedFor.split(',')[0].trim();
    // }
    
    // // Si no hay encabezado 'x-forwarded-for', usa el remoteAddress de la conexión
    // const ip = request.socket?.remoteAddress || null;
    // return ip ? ip : null;
    return ''
  }
}
