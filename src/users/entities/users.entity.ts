import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  birthDate: Date;

  @Column()
  location: string;

  @Column()
  timezone: string;

  @Column({ type: 'timestamp' })
  nextBirthdayUtc: Date;
}
