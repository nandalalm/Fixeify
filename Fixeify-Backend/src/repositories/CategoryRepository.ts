import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { ICategoryRepository } from "./ICategoryRepository";
import { CategoryModel, CategoryDocument } from "../models/categoryModel"; 
import { CategoryResponse } from "../dtos/response/categoryDtos";

@injectable()
export class MongoCategoryRepository extends BaseRepository<CategoryDocument> implements ICategoryRepository {
  constructor() {
    super(CategoryModel); 
  }

  async createCategory(categoryData: Partial<CategoryResponse>): Promise<CategoryResponse> {
    const category = await this.create(categoryData);
    return this.mapToCategoryResponse(category);
  }

  async findCategoryById(categoryId: string): Promise<CategoryResponse | null> {
    const category = await this.findById(categoryId);
    return category ? this.mapToCategoryResponse(category) : null;
  }

  async findCategoryByName(name: string): Promise<CategoryResponse | null> {
    const category = await this.findOne({ name });
    return category ? this.mapToCategoryResponse(category) : null;
  }

  async getCategoriesWithPagination(skip: number, limit: number): Promise<CategoryResponse[]> {
    const categories = await this._model.find().skip(skip).limit(limit).exec();
    return categories.map((category) => this.mapToCategoryResponse(category));
  }

  async getTotalCategoriesCount(): Promise<number> {
    return this._model.countDocuments().exec();
  }

  async updateCategory(categoryId: string, data: Partial<CategoryResponse>): Promise<CategoryResponse | null> {
    const updatedCategory = await this.update(categoryId, data);
    return updatedCategory ? this.mapToCategoryResponse(updatedCategory) : null;
  }

  private mapToCategoryResponse(category: CategoryDocument): CategoryResponse {
    return new CategoryResponse({
      id: category._id.toString(), 
      name: category.name,
      image: category.image ?? "",
    });
  }
}