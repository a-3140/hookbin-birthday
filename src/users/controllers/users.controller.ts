import { Controller, Logger, Post, Body, Delete } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { RemoveUserDTO, UserCreateDTO } from '../dto/users.dto';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Post('/')
  async createUser(@Body() dto: UserCreateDTO) {
    this.logger.debug('Creating user...');
    await this.usersService.createUser(dto);
  }

  @Delete('/')
  async removeUser(@Body() dto: RemoveUserDTO) {
    this.logger.debug('Removing user...');
    await this.usersService.removeUser(dto);
  }
}
