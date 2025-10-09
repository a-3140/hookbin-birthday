import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCreateDTO, UserUpdateDTO } from '../dto/users.dto';
import { Repository } from 'typeorm';
import {
  getMonth,
  getDate,
  setMonth,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
  addYears,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { User, ScheduledNotification } from '@shared/entities';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(ScheduledNotification)
    private readonly scheduledNotificationRepository: Repository<ScheduledNotification>,
  ) {}

  async createUser(dto: UserCreateDTO): Promise<User> {
    try {
      this.logger.log('Creating user...');
      const user = this.usersRepository.create(dto);
      const saved = await this.usersRepository.save(user);

      const nextBirthdayUtc = this.calculateNextBirthdayUtc(
        dto.birthDate,
        dto.timezone,
      );

      await this.scheduledNotificationRepository.save({
        userId: saved.id,
        type: 'birthday',
        scheduledFor: nextBirthdayUtc,
        status: 'pending',
      });

      this.logger.log('User created');
      return saved;
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException();
    }
  }

  async removeUser(userId: string) {
    try {
      this.logger.log('Removing user...');
      const result = await this.usersRepository.delete(userId);
      if (result.affected === 0) {
        throw new BadRequestException('User not found');
      }
    } catch (e) {
      this.logger.error(e);
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new InternalServerErrorException();
    }
  }

  async updateUser(userId: string, dto: UserUpdateDTO): Promise<User> {
    try {
      this.logger.log(`Updating user ${userId}...`);

      const user = await this.usersRepository.findOne({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const birthDateChanged =
        dto.birthDate &&
        dto.birthDate !== user.birthDate.toISOString().split('T')[0];
      const timezoneChanged = dto.timezone && dto.timezone !== user.timezone;

      const fieldMap: Record<string, (value: string) => string | Date> = {
        firstName: (v) => v,
        lastName: (v) => v,
        location: (v) => v,
        birthDate: (v) => new Date(v),
        timezone: (v) => v,
      };

      for (const [key, transform] of Object.entries(fieldMap)) {
        const value = dto[key as keyof UserUpdateDTO];
        if (value !== undefined) {
          user[key] = transform(value);
        }
      }

      const updated = await this.usersRepository.save(user);

      if (birthDateChanged || timezoneChanged) {
        this.logger.log(
          'birthDate or timezone changed, recalculating scheduledFor',
        );

        const birthdayNotification =
          await this.scheduledNotificationRepository.findOne({
            where: { userId: user.id, type: 'birthday' },
          });

        if (birthdayNotification) {
          birthdayNotification.scheduledFor = this.calculateNextBirthdayUtc(
            user.birthDate.toISOString().split('T')[0],
            user.timezone,
          );
          await this.scheduledNotificationRepository.save(birthdayNotification);
        }
      }

      this.logger.log('User updated');
      return updated;
    } catch (e) {
      this.logger.error(e);
      if (e instanceof NotFoundException) {
        throw e;
      }
      throw new InternalServerErrorException();
    }
  }

  private calculateNextBirthdayUtc(birthDate: string, timezone: string): Date {
    const birthMonth = getMonth(birthDate);
    const birthDay = getDate(birthDate);

    const now = toZonedTime(new Date(), timezone);

    let nextBirthday = setMonth(now, birthMonth);
    nextBirthday = setDate(nextBirthday, birthDay);
    // hour is the time of day
    nextBirthday = setHours(nextBirthday, 3);
    nextBirthday = setMinutes(nextBirthday, 13);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (isBefore(nextBirthday, now)) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, timezone);
  }
}
