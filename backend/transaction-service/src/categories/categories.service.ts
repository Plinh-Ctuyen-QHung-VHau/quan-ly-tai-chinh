import { Injectable } from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(_user_id: string, queryDto: GetCategoriesQueryDto) {
    return this.categoriesRepository.findAll(_user_id, queryDto);
  }
}
