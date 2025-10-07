import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class UserCreateDTO {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  @IsNotEmpty()
  birthDate: Date;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;
}

export class RemoveUserDTO {
  @IsString()
  @IsNotEmpty()
  id: string;
}
