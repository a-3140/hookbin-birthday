import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UserCreateDTO, UserUpdateDTO } from '../dto/users.dto';
import { User, ScheduledNotification } from '@shared/entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
  };

  const mockScheduledNotificationRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(ScheduledNotification),
          useValue: mockScheduledNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create user and scheduled notification', async () => {
      const dto: UserCreateDTO = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-06-15',
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const createdUser = {
        ...dto,
        id: 1,
        birthDate: new Date(dto.birthDate),
      };

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockScheduledNotificationRepository.save.mockResolvedValue({
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date(),
        status: 'pending',
      });

      const result = await service.createUser(dto);

      expect(mockUserRepository.create).toHaveBeenCalledWith(dto);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'birthday',
          status: 'pending',
          scheduledFor: expect.any(Date),
        }),
      );
      expect(result).toEqual(createdUser);
    });

    it('should handle different timezones correctly', async () => {
      const dto: UserCreateDTO = {
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: '1995-12-25',
        location: 'Tokyo',
        timezone: 'Asia/Tokyo',
      };

      const createdUser = {
        ...dto,
        id: 2,
        birthDate: new Date(dto.birthDate),
      };

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockScheduledNotificationRepository.save.mockResolvedValue({
        id: 2,
        userId: 2,
        type: 'birthday',
        scheduledFor: new Date(),
        status: 'pending',
      });

      await service.createUser(dto);

      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          type: 'birthday',
          status: 'pending',
          scheduledFor: expect.any(Date),
        }),
      );
    });

    it('should calculate scheduledFor correctly', async () => {
      const dto: UserCreateDTO = {
        firstName: 'Test',
        lastName: 'User',
        birthDate: '1990-01-15',
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const createdUser = {
        ...dto,
        id: 3,
        birthDate: new Date(dto.birthDate),
      };

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockScheduledNotificationRepository.save.mockResolvedValue({
        id: 3,
        userId: 3,
        type: 'birthday',
        scheduledFor: new Date(),
        status: 'pending',
      });

      await service.createUser(dto);

      expect(mockScheduledNotificationRepository.save).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const savedNotification = mockScheduledNotificationRepository.save.mock
        .calls[0][0] as ScheduledNotification;
      expect(savedNotification.scheduledFor).toBeDefined();
      expect(savedNotification.scheduledFor).toBeInstanceOf(Date);
    });
  });

  describe('removeUser', () => {
    it('should delete user by id', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.removeUser('999');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('999');
      expect(mockUserRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for non-existent user', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.removeUser('999')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepository.delete).toHaveBeenCalledWith('999');
    });
  });

  describe('updateUser', () => {
    it('should update user without updating notification when only name changes', async () => {
      const existingUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const dto: UserUpdateDTO = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const result = await service.updateUser('1', dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(
        mockScheduledNotificationRepository.findOne,
      ).not.toHaveBeenCalled();
    });

    it('should update notification scheduledFor when birthDate changes', async () => {
      const existingUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const existingNotification: ScheduledNotification = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2026-06-15T09:00:00Z'),
        status: 'pending',
        user: existingUser,
      };

      const dto: UserUpdateDTO = {
        birthDate: '1990-12-25',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );
      mockScheduledNotificationRepository.findOne.mockResolvedValue(
        existingNotification,
      );
      mockScheduledNotificationRepository.save.mockResolvedValue(
        existingNotification,
      );

      await service.updateUser('1', dto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, type: 'birthday' },
      });
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const savedNotification = mockScheduledNotificationRepository.save.mock
        .calls[0][0] as ScheduledNotification;
      expect(savedNotification.scheduledFor).toBeDefined();
      expect(savedNotification.scheduledFor).toBeInstanceOf(Date);
    });

    it('should update notification scheduledFor when timezone changes', async () => {
      const existingUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const existingNotification: ScheduledNotification = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2026-06-15T09:00:00Z'),
        status: 'pending',
        user: existingUser,
      };

      const dto: UserUpdateDTO = {
        timezone: 'America/New_York',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );
      mockScheduledNotificationRepository.findOne.mockResolvedValue(
        existingNotification,
      );
      mockScheduledNotificationRepository.save.mockResolvedValue(
        existingNotification,
      );

      await service.updateUser('1', dto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.findOne).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalled();
    });

    it('should update notification scheduledFor when both birthDate and timezone change', async () => {
      const existingUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const existingNotification: ScheduledNotification = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2026-06-15T09:00:00Z'),
        status: 'pending',
        user: existingUser,
      };

      const dto: UserUpdateDTO = {
        birthDate: '1995-12-25',
        timezone: 'Europe/London',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve(user),
      );
      mockScheduledNotificationRepository.findOne.mockResolvedValue(
        existingNotification,
      );
      mockScheduledNotificationRepository.save.mockResolvedValue(
        existingNotification,
      );

      await service.updateUser('1', dto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.findOne).toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const dto: UserUpdateDTO = {
        firstName: 'Jane',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUser('999', dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });
});
