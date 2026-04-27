import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";
import {
  GetTransactionsQueryDto,
  GetTransactionSummaryQueryDto,
} from "./dto/get-transactions-query.dto";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";

@Controller("transactions")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Getuser_id() user_id: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user_id, createTransactionDto);
  }

  @Get()
  findAll(
    @Getuser_id() user_id: string,
    @Query() queryDto: GetTransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(user_id, queryDto);
  }

  @Get("summary")
  getSummary(
    @Getuser_id() user_id: string,
    @Query() queryDto: GetTransactionSummaryQueryDto,
  ) {
    return this.transactionsService.getSummary(user_id, queryDto);
  }

  @Get("history")
  getHistory(@Getuser_id() user_id: string) {
    return this.transactionsService.getHistory(user_id);
  }

  @Get(":id")
  findOne(
    @Getuser_id() user_id: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.findOne(id, user_id);
  }

  @Put(":id")
  update(
    @Getuser_id() user_id: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, user_id, updateTransactionDto);
  }

  @Delete(":id")
  remove(
    @Getuser_id() user_id: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.remove(id, user_id);
  }
}
