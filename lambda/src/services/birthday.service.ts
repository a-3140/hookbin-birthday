import {
  addYears,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
  getMonth,
  getDate,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Between, Repository } from 'typeorm';
import { User } from '@shared/entities';
import { DatabaseService } from './database.service';

export class BirthdayService {
  private userRepo!: Repository<User>;

  async init() {
    const db = await DatabaseService.getInstance();
    this.userRepo = db.getUserRepository();
  }

  async getUsersWithUpcomingBirthdays(from: Date, to: Date) {
    return this.userRepo.find({
      where: { nextBirthdayUtc: Between(from, to) },
    });
  }

  calculateNextBirthday(user: User): Date {
    const userNow = toZonedTime(new Date(), user.timezone);
    const birthMonth = getMonth(user.birthDate);
    const birthDay = getDate(user.birthDate);

    let nextBirthday = new Date(userNow);
    nextBirthday.setMonth(birthMonth);
    nextBirthday.setDate(birthDay);
    nextBirthday = setHours(nextBirthday, 9);
    nextBirthday = setMinutes(nextBirthday, 0);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (isBefore(nextBirthday, userNow)) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, user.timezone);
  }

  async updateUserNextBirthday(user: User) {
    user.nextBirthdayUtc = this.calculateNextBirthday(user);
    await this.userRepo.save(user);
  }
}
