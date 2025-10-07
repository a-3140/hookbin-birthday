import { handler } from './birthday-processor';
import { BirthdayService } from './services/birthday.service';
import { NotificationService } from './services/notification.service';
import { User } from '@shared/entities';

jest.mock('./services/birthday.service');
jest.mock('./services/notification.service');

describe('Birthday Processor', () => {
  let birthdayInitSpy: jest.SpyInstance;
  let birthdayGetUsersSpy: jest.SpyInstance;
  let birthdayUpdateSpy: jest.SpyInstance;
  let notificationInitSpy: jest.SpyInstance;
  let notificationGetSentSpy: jest.SpyInstance;
  let notificationSendSpy: jest.SpyInstance;
  let notificationLogSpy: jest.SpyInstance;

  beforeEach(() => {
    birthdayInitSpy = jest
      .spyOn(BirthdayService.prototype, 'init')
      .mockResolvedValue(undefined);
    birthdayGetUsersSpy = jest
      .spyOn(BirthdayService.prototype, 'getUsersWithUpcomingBirthdays')
      .mockResolvedValue([]);
    birthdayUpdateSpy = jest
      .spyOn(BirthdayService.prototype, 'updateUserNextBirthday')
      .mockResolvedValue(undefined);

    notificationInitSpy = jest
      .spyOn(NotificationService.prototype, 'init')
      .mockResolvedValue(undefined);
    notificationGetSentSpy = jest
      .spyOn(NotificationService.prototype, 'getAlreadySentNotifications')
      .mockResolvedValue([]);
    notificationSendSpy = jest
      .spyOn(NotificationService.prototype, 'sendBirthdayMessage')
      .mockResolvedValue(undefined);
    notificationLogSpy = jest
      .spyOn(NotificationService.prototype, 'logNotification')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should process users with upcoming birthdays and send notifications', async () => {
      const mockUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-12-25'),
        timezone: 'Australia/Sydney',
        location: 'Sydney',
        nextBirthdayUtc: new Date('2025-12-25T14:00:00Z'),
      };

      birthdayGetUsersSpy.mockResolvedValue([mockUser]);

      const result = await handler();

      expect(birthdayInitSpy).toHaveBeenCalledTimes(1);
      expect(notificationInitSpy).toHaveBeenCalledTimes(1);
      expect(birthdayGetUsersSpy).toHaveBeenCalledTimes(1);
      expect(notificationGetSentSpy).toHaveBeenCalledWith([1]);
      expect(notificationSendSpy).toHaveBeenCalledWith('John', 'Doe');
      expect(notificationLogSpy).toHaveBeenCalledWith(
        1,
        mockUser.nextBirthdayUtc,
        'sent',
      );
      expect(birthdayUpdateSpy).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ processed: 1 }),
      });
    });
  });
});
