import { Module } from '@nestjs/common';
import { DevopsController } from './devops.controller';
import { DevopsService } from './devops.service';
import { ConfigModule } from '@nestjs/config';
import { getConfig } from '@comm/comm';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [getConfig],
    }),
  ],
  controllers: [DevopsController],
  providers: [DevopsService],
})
export class DevopsModule {}
