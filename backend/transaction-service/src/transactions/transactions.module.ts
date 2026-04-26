import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionsRepository } from "./transactions.repository";
import { CategoriesModule } from "../categories/categories.module";

@Module({
  imports: [CategoriesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule { }
