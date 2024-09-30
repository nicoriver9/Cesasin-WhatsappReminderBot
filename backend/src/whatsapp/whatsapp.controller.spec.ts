import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('WhatsappController', () => {
  let controller: WhatsappController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        { provide: WhatsappService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
  });

  describe('loadReminderMessage', () => {
    it('should load and parse reminder message successfully', () => {
      const mockJsonContent = '{"key": "value"}';
      (fs.readFileSync as jest.Mock).mockReturnValue(mockJsonContent);
      (path.join as jest.Mock).mockReturnValue('/mocked/path');

      const result = (controller as any).loadReminderMessage();

      expect(result).toEqual({ key: 'value' });
      expect(fs.readFileSync).toHaveBeenCalledWith('/mocked/path', 'utf-8');
    });

    it('should return empty object on error', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = (controller as any).loadReminderMessage();

      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith('Error loading reminder messages:', expect.any(Error));
    });
  });
});