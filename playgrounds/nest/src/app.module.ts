import { Module } from '@nestjs/common'
import { AuthController } from './auth/auth.controller'
import { PlanetController } from './planet/planet.controller'
import { OtherController } from './other/other.controller'
import { PlanetService } from './planet/planet.service'
import { ReferenceController } from './reference/reference.controller'
import { ReferenceService } from './reference/reference.service'

@Module({
  imports: [],
  controllers: [AuthController, PlanetController, ReferenceController, OtherController],
  providers: [PlanetService, ReferenceService],
})
export class AppModule {}
