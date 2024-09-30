import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { Observable } from 'rxjs';
import { Request } from 'express';
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly prisma;
    constructor(whatsappService: WhatsappService, prisma: PrismaService);
    getQRCode(user: any): Observable<any>;
    private loadReminderMessage;
    sendReminders(user: any, reminders: Array<any>, request: Request): Promise<{
        status: string;
    }>;
    private convertToSpanishDate;
    getPhoneNumber(): Promise<{
        phoneNumber: string;
        message?: undefined;
    } | {
        message: string;
        phoneNumber?: undefined;
    }>;
    getCurrentUser(user: any): {
        currentUser: string;
    };
    setBotStatus(user: any, body: {
        enabled: boolean;
    }): {
        message: string;
    };
    getRescheduleMessages(user: any): Promise<{
        whatsapp_msg_id: number;
        patient_full_name: string;
        patient_id: number | null;
        patient_phone: string | null;
        message: string | null;
        task_status: number | null;
        reception_status: number | null;
        originating_phone_number: string | null;
        appointment_date: Date | null;
        doctor_name: string | null;
        attached_file: string | null;
        creation_date: Date | null;
        creation_time: string | null;
        creation_user: string | null;
        completion_date: Date | null;
        completion_time: string | null;
        reminder_state: number | null;
    }[] | {
        message: string;
        error: any;
    }>;
    getPatientResponses(user: any): Promise<{
        response_id: number;
        patient_full_name: string | null;
        patient_phone: string;
        appointment_date: Date | null;
        response: string;
        doctor_name: string | null;
        received_at: Date;
        created_at: Date;
        conversationState: number;
    }[] | {
        message: string;
        error: any;
    }>;
    sendRescheduledMessage(user: any, body: {
        patientId: number;
        message: string;
        patientPhone: string;
    }, request: Request): Promise<{
        message: string;
        error?: undefined;
    } | {
        message: string;
        error: any;
    }>;
    private getIPAddress;
}
