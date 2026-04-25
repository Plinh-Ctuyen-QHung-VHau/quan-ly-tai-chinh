import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { GetUserId } from '../common/decorators/get-user-id.decorator';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  findAll(@GetUserId() userId: string, @Query() queryDto: GetCategoriesQueryDto) {
    return this.categoriesService.findAll(userId, queryDto);
  }
}
