import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";

@Controller("budgets")
@UseInterceptors(TransformInterceptor)
@UseFilters(AllExceptionsFilter)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(
    @Getuser_id() user_id: string,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(user_id, createBudgetDto);
  }

  @Get("current")
  findCurrent(@Getuser_id() user_id: string) {
    return this.budgetsService.findCurrent(user_id);
  }

  @Get("current/status")
  getCurrentStatus(@Getuser_id() user_id: string) {
    return this.budgetsService.getCurrentStatus(user_id);
  }

  @Get("current/history")
  getHistory(
    @Getuser_id() user_id: string,
    @Query("limit") limit?: number,
  ) {
    return this.budgetsService.getHistory(user_id, limit);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Getuser_id() user_id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, user_id, updateBudgetDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Getuser_id() user_id: string) {
    return this.budgetsService.remove(id, user_id);
  }
}
