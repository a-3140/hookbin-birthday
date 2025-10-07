import { NotificationService } from './notification.service';
import { DatabaseService } from './database.service';
import { NotificationLog } from '@shared/entities';
import { Repository } from 'typeorm';
import axios from 'axios';

jest.mock('./database.service');
jest.mock('axios');

describe('NotificationService', () => {
  let service: NotificationService;
  let mockLogRepo: jest.Mocked<Repository<NotificationLog>>;
  let mockHookbinUrl: string;

  beforeEach(async () => {
    mockHookbinUrl = process.env.HOOKBIN_URL || '';

    mockLogRepo = {
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationLog>>;

    const mockDbService = {
      getNotificationLogRepository: jest.fn().mockReturnValue(mockLogRepo),
    };

    (DatabaseService.getInstance as jest.Mock).mockResolvedValue(mockDbService);

    service = new NotificationService();
    await service.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.HOOKBIN_URL;
  });

  describe('sendBirthdayMessage', () => {
    it('should send birthday message with correct payload', async () => {
      const postSpy = jest
        .spyOn(axios, 'post')
        .mockResolvedValue({ data: {} } as never);

      await service.sendBirthdayMessage('John', 'Doe');

      expect(postSpy).toHaveBeenCalledWith(mockHookbinUrl, {
        message: "Hey, John Doe it's your birthday",
      });
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });
});
