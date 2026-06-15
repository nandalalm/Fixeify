import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import type { CreateCategoryData, ICategoryRepository, UpdateCategoryData } from "./ICategoryRepository";
import { CategoryModel, type CategoryDocument } from "../models/categoryModel";

@injectable()
export class MongoCategoryRepository extends BaseRepository<CategoryDocument> implements ICategoryRepository {
  constructor() {
    super(CategoryModel);
  }

  async createCategory(categoryData: CreateCategoryData): Promise<CategoryDocument> {
    return this.create(categoryData);
  }

  async findCategoryById(categoryId: string): Promise<CategoryDocument | null> {
    return this.findById(categoryId);
  }

  async findCategoryByName(name: string): Promise<CategoryDocument | null> {
    return this.findOne({ name });
  }

  async getCategoriesWithPagination(skip: number, limit: number): Promise<CategoryDocument[]> {
    return this._model.find().skip(skip).limit(limit).exec();
  }

  async getTotalCategoriesCount(): Promise<number> {
    return this._model.countDocuments().exec();
  }

  async updateCategory(categoryId: string, data: UpdateCategoryData): Promise<CategoryDocument | null> {
    return this.update(categoryId, data);
  }
}
