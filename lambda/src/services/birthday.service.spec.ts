import { BirthdayService } from './birthday.service';
import { DatabaseService } from './database.service';
import { User } from '@shared/entities';
import { Repository } from 'typeorm';

jest.mock('./database.service');

describe('BirthdayService', () => {
  let service: BirthdayService;
  let mockUserRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    mockUserRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    const mockDbService = {
      getUserRepository: jest.fn().mockReturnValue(mockUserRepo),
    };

    (DatabaseService.getInstance as jest.Mock).mockResolvedValue(mockDbService);

    service = new BirthdayService();
    await service.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNextBirthday', () => {
    it('should calculate next birthday at 9am in user timezone converted to UTC', () => {
      const user = new User();
      user.id = 1;
      user.firstName = 'John';
      user.lastName = 'Doe';
      user.birthDate = new Date('1990-12-25');
      user.timezone = 'Australia/Sydney';
      user.location = 'Sydney';
      user.nextBirthdayUtc = new Date();

      const now = new Date('2025-01-15T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = service.calculateNextBirthday(user);

      expect(result).toBeInstanceOf(Date);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
      expect(result.getFullYear()).toBe(2025);

      jest.useRealTimers();
    });
  });
});
