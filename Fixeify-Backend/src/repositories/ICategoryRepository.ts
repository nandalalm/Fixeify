import type { CategoryDocument } from "../models/categoryModel";

export interface CreateCategoryData {
  name: string;
  image: string;
}

export interface UpdateCategoryData {
  name?: string;
  image?: string;
}

export interface ICategoryRepository {
  createCategory(categoryData: CreateCategoryData): Promise<CategoryDocument>;
  findCategoryById(categoryId: string): Promise<CategoryDocument | null>;
  findCategoryByName(name: string): Promise<CategoryDocument | null>;
  getCategoriesWithPagination(skip: number, limit: number): Promise<CategoryDocument[]>;
  getTotalCategoriesCount(): Promise<number>;
  updateCategory(categoryId: string, data: UpdateCategoryData): Promise<CategoryDocument | null>;
}
