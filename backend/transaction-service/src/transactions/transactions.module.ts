import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionsRepository } from "./transactions.repository";
import { CategoriesModule } from "../categories/categories.module";
import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [CategoriesModule, HttpModule, SharedEventsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule { }
