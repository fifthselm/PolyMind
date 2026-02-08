import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { RoleScenariosService } from './role-scenarios.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';

@Controller('role-scenarios')
export class RoleScenariosController {
  constructor(private readonly roleScenariosService: RoleScenariosService) {}

  @Get()
  async getAllScenarios() {
    return this.roleScenariosService.getAllScenarios();
  }

  @Get('preset')
  async getPresetScenarios() {
    return this.roleScenariosService.getPresetScenarios();
  }

  @Get(':id')
  async getScenarioById(@Param('id') id: string) {
    return this.roleScenariosService.getScenarioById(id);
  }

  @Post()
  async createScenario(@Body() createScenarioDto: CreateScenarioDto) {
    return this.roleScenariosService.createScenario(createScenarioDto);
  }

  @Patch(':id')
  async updateScenario(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateScenarioDto>,
  ) {
    return this.roleScenariosService.updateScenario(id, updateData);
  }

  @Delete(':id')
  async deleteScenario(@Param('id') id: string) {
    return this.roleScenariosService.deleteScenario(id);
  }

  @Get(':id/prompt')
  async getScenarioPrompt(@Param('id') id: string) {
    return this.roleScenariosService.getScenarioPrompt(id);
  }
}
