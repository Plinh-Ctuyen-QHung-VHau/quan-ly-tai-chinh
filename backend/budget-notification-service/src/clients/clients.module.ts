import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TransactionClient } from "./transaction.client";

@Module({
  imports: [HttpModule],
  providers: [TransactionClient],
  exports: [TransactionClient],
})
export class ClientsModule {}
