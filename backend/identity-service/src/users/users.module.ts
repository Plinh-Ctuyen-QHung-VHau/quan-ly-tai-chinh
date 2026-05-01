import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";

import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [SharedEventsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule { }
