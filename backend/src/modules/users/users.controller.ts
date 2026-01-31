import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponse } from './dto/user.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取当前用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req: any): Promise<UserResponse> {
    return this.usersService.findById(req.user.id);
  }

  /**
   * 更新当前用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateCurrentUser(
    @Request() req: any,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.update(req.user.id, dto);
  }

  /**
   * 根据ID获取用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findById(id);
  }
}
