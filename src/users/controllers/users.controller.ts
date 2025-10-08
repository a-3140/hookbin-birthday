import { Controller, Logger, Post, Body, Delete, Param } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UserCreateDTO } from '../dto/users.dto';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Post('/')
  async createUser(@Body() dto: UserCreateDTO) {
    this.logger.debug('Creating user...');
    await this.usersService.createUser(dto);
    return {
      message: 'User created',
    };
  }

  @Delete('/:id')
  async removeUser(@Param('id') id: string) {
    this.logger.debug('Removing user...');
    await this.usersService.removeUser(id);
    return {
      message: 'User removed',
    };
  }
}
