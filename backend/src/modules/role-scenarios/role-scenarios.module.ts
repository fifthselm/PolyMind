import { Module } from '@nestjs/common';
import { RoleScenariosController } from './role-scenarios.controller';
import { RoleScenariosService } from './role-scenarios.service';
import { PrismaModule } from '../../providers/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleScenariosController],
  providers: [RoleScenariosService],
  exports: [RoleScenariosService],
})
export class RoleScenariosModule {}
