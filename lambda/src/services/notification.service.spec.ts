import { NotificationService } from './notification.service';
import { DatabaseService } from './database.service';
import { ScheduledNotification } from '@shared/entities';
import { Repository } from 'typeorm';
import axios from 'axios';
import { HOOKBIN_URL } from '../config/constants';

jest.mock('./database.service');
jest.mock('axios');

describe('NotificationService', () => {
  let service: NotificationService;
  let mockLogRepo: jest.Mocked<Repository<ScheduledNotification>>;
  let mockHookbinUrl: string;

  beforeEach(async () => {
    mockHookbinUrl = HOOKBIN_URL;

    mockLogRepo = {
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ScheduledNotification>>;

    const mockDbService = {
      getScheduledNotificationRepository: jest
        .fn()
        .mockReturnValue(mockLogRepo),
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
