import {
  Controller,
  Post,
  Get,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtAuthGuard } from '../jwt-auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('api/whatsapp-mode')
export class WhatsappModeController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start-conversation')
  startConversationMode(@Res() res: Response) {
    this.whatsappService.startConversationMode();
    return res.status(HttpStatus.OK).json({
      message: 'Modo conversacional activado.',
    });
  }
  @UseGuards(JwtAuthGuard)
  @Post('start-reminder')
  stopConversationMode(@Res() res: Response) {
    this.whatsappService.stopConversationMode();
    return res.status(HttpStatus.OK).json({
      message: 'Modo recordatorio activado.',
    });
  }
  //   @UseGuards(JwtAuthGuard)
  @Get('status')
  getConversationModeStatus(@Res() res: Response) {
    const isActive = this.whatsappService.isConversationModeActive();
    return res.status(HttpStatus.OK).json({
      message: `${isActive ? ' El modo conversacional está activado' : 'El modo recordatorio está activado'}.`,
      isActive,
    });
  }
}
