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
import { GetUserId } from "../common/decorators/get-user-id.decorator";
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";

@Controller("budgets")
@UseInterceptors(TransformInterceptor)
@UseFilters(AllExceptionsFilter)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(
    @GetUserId() userId: string,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get("current")
  findCurrent(@GetUserId() userId: string) {
    return this.budgetsService.findCurrent(userId);
  }

  @Get("current/status")
  getCurrentStatus(@GetUserId() userId: string) {
    return this.budgetsService.getCurrentStatus(userId);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @GetUserId() userId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, userId, updateBudgetDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @GetUserId() userId: string) {
    return this.budgetsService.remove(id, userId);
  }
}
