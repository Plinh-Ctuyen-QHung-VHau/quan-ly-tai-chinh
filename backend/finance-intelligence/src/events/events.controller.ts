import { Body, Controller, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { EventsService } from "./events.service";
import { TransactionEventDto } from "./dto/transaction-event.dto";

@Controller("events")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("transactions")
  handleTransactionEvent(@Body() dto: TransactionEventDto) {
    return this.eventsService.handleTransactionEvent(dto);
  }
}
