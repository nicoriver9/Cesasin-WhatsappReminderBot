import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { WhatsappModeController } from './whatsapp-mode/whatsapp-mode.controller'

@Module({
  imports: [AuthModule],
  controllers: [WhatsappController, WhatsappModeController],
  providers: [WhatsappService, PrismaService],
})
export class AppModule {}
