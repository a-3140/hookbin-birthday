import {
  Controller,
  Logger,
  Post,
  Body,
  Delete,
  Param,
  Put,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UserCreateDTO, UserUpdateDTO } from '../dto/users.dto';

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

  @Put('/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UserUpdateDTO) {
    this.logger.debug(`Updating user ${id}...`);
    const user = await this.usersService.updateUser(id, dto);
    return {
      message: 'User updated',
      data: user,
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
