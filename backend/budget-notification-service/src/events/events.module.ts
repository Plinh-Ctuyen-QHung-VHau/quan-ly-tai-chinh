import { Module } from "@nestjs/common";
import { EventPublisher } from "./event.publisher";

@Module({
  imports: [],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class EventsModule { }
