import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 上传文件
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('roomId') roomId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const fileRecord = await this.filesService.uploadFile(
      file,
      req.user.userId,
      roomId,
    );

    return {
      success: true,
      data: fileRecord,
    };
  }

  /**
   * 获取文件列表
   */
  @Get()
  async getFiles(
    @Query('roomId') roomId?: string,
    @Query('uploaderId') uploaderId?: string,
  ) {
    const files = await this.filesService.getFiles(roomId, uploaderId);
    return {
      success: true,
      data: files,
    };
  }

  /**
   * 获取单个文件
   */
  @Get(':id')
  async getFile(@Param('id') fileId: string) {
    const file = await this.filesService.getFile(fileId);
    
    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    return {
      success: true,
      data: file,
    };
  }

  /**
   * 删除文件
   */
  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.filesService.deleteFile(fileId, req.user.userId);
    return {
      success: true,
      message: '文件已删除',
    };
  }
}