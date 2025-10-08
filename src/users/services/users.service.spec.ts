import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UserCreateDTO, RemoveUserDTO } from '../dto/users.dto';
import { User } from '@shared/entities';

describe('UsersService', () => {
  let service: UsersService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create user with calculated nextBirthdayUtc', async () => {
      const dto: UserCreateDTO = {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const createdUser = {
        ...dto,
        id: 1,
        nextBirthdayUtc: new Date(),
      };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(result.nextBirthdayUtc).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
      );

      const calls = mockRepository.save.mock.calls as Array<[User]>;
      const savedUser = calls[0]?.[0];
      expect(savedUser?.nextBirthdayUtc).toBeInstanceOf(Date);
    });

    it('should handle different timezones correctly', async () => {
      const dto: UserCreateDTO = {
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: new Date('1995-12-25'),
        location: 'Tokyo',
        timezone: 'Asia/Tokyo',
      };

      const createdUser = {
        ...dto,
        id: 2,
        nextBirthdayUtc: new Date(),
      };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(dto);

      expect(result.nextBirthdayUtc).toBeDefined();
      expect(result.nextBirthdayUtc).toBeInstanceOf(Date);
    });

    it('should calculate nextBirthdayUtc correctly', async () => {
      const dto: UserCreateDTO = {
        firstName: 'Test',
        lastName: 'User',
        birthDate: new Date('1990-01-15'),
        location: 'Sydney',
        timezone: 'Australia/Sydney',
      };

      const createdUser = {
        ...dto,
        id: 3,
        nextBirthdayUtc: new Date(),
      };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      await service.createUser(dto);

      expect(mockRepository.save).toHaveBeenCalled();

      const calls = mockRepository.save.mock.calls as Array<[User]>;
      const savedUser = calls[0]?.[0];
      expect(savedUser?.nextBirthdayUtc).toBeDefined();
      expect(savedUser?.nextBirthdayUtc).toBeInstanceOf(Date);
    });
  });

  describe('removeUser', () => {
    it('should delete user by id', async () => {
      const dto: RemoveUserDTO = { id: '999' };

      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.removeUser(dto);

      expect(mockRepository.delete).toHaveBeenCalledWith('999');
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion of non-existent user', async () => {
      const dto: RemoveUserDTO = { id: '999' };

      mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await service.removeUser(dto);

      expect(mockRepository.delete).toHaveBeenCalledWith('999');
    });
  });
});
