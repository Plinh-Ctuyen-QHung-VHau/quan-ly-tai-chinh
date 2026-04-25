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
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { GetTransactionsQueryDto, GetTransactionSummaryQueryDto } from './dto/get-transactions-query.dto';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@Controller('transactions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(userId, createTransactionDto);
  }

  @Get()
  findAll(@GetUserId() userId: string, @Query() queryDto: GetTransactionsQueryDto) {
    return this.transactionsService.findAll(userId, queryDto);
  }

  @Get('summary')
  getSummary(@GetUserId() userId: string, @Query() queryDto: GetTransactionSummaryQueryDto) {
    return this.transactionsService.getSummary(userId, queryDto);
  }

  @Get('history')
  getHistory(@GetUserId() userId: string) {
    return this.transactionsService.getHistory(userId);
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, updateTransactionDto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.remove(id, userId);
  }
}
