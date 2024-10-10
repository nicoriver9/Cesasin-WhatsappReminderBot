import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Response } from 'express';
export declare class WhatsappModeController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    startConversationMode(res: Response): Response<any, Record<string, any>>;
    stopConversationMode(res: Response): Response<any, Record<string, any>>;
    getConversationModeStatus(res: Response): Response<any, Record<string, any>>;
}
