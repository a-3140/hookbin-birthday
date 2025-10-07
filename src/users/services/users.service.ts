import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveUserDTO, UserCreateDTO } from '../dto/users.dto';
import { User } from '../entities';
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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async createUser(dto: UserCreateDTO): Promise<User> {
    this.logger.log('Creating user...');
    const user = this.usersRepository.create(dto);
    user.nextBirthdayUtc = this.calculateNextBirthdayUtc(
      dto.birthDate,
      dto.timezone,
    );
    return this.usersRepository.save(user);
  }

  async removeUser(dto: RemoveUserDTO) {
    this.logger.log('Removing user...');
    await this.usersRepository.delete(dto.id);
  }

  private calculateNextBirthdayUtc(birthDate: Date, timezone: string): Date {
    const birthMonth = getMonth(birthDate);
    const birthDay = getDate(birthDate);

    const now = toZonedTime(new Date(), timezone);

    let nextBirthday = setMonth(now, birthMonth);
    nextBirthday = setDate(nextBirthday, birthDay);
    nextBirthday = setHours(nextBirthday, 0);
    nextBirthday = setMinutes(nextBirthday, 0);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (isBefore(nextBirthday, now)) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, timezone);
  }
}
