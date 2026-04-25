import { Injectable } from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(userId: string, queryDto: GetCategoriesQueryDto) {
    return this.categoriesRepository.findAll(userId, queryDto);
  }
}
