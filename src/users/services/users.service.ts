import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCreateDTO } from '../dto/users.dto';
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
import { User } from '@shared/entities';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async createUser(dto: UserCreateDTO): Promise<User> {
    try {
      this.logger.log('Creating user...');
      const user = this.usersRepository.create(dto);
      user.nextBirthdayUtc = this.calculateNextBirthdayUtc(
        dto.birthDate,
        dto.timezone,
      );
      const saved = await this.usersRepository.save(user);
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

  private calculateNextBirthdayUtc(birthDate: string, timezone: string): Date {
    const birthMonth = getMonth(birthDate);
    const birthDay = getDate(birthDate);

    const now = toZonedTime(new Date(), timezone);

    let nextBirthday = setMonth(now, birthMonth);
    nextBirthday = setDate(nextBirthday, birthDay);
    // hour is the time of day
    nextBirthday = setHours(nextBirthday, 9);
    nextBirthday = setMinutes(nextBirthday, 0);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (isBefore(nextBirthday, now)) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, timezone);
  }
}
