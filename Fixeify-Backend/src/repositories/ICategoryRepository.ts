import { CategoryResponse } from "../dtos/response/categoryDtos";

export interface ICategoryRepository {
  createCategory(categoryData: Partial<CategoryResponse>): Promise<CategoryResponse>;
  findCategoryById(categoryId: string): Promise<CategoryResponse | null>;
  findCategoryByName(name: string): Promise<CategoryResponse | null>;
  getCategoriesWithPagination(skip: number, limit: number): Promise<CategoryResponse[]>;
  getTotalCategoriesCount(): Promise<number>;
  updateCategory(categoryId: string, data: Partial<CategoryResponse>): Promise<CategoryResponse | null>;
}