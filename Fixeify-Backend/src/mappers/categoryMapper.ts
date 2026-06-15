import type { CategoryResponse } from "../dtos/response/categoryDtos";
import type { CategoryDocument } from "../models/categoryModel";

export const toCategoryResponse = (
  category: CategoryDocument
): CategoryResponse => ({
  id: category.id,
  name: category.name,
  image: category.image ?? "",
});

export const toCategoryResponses = (
  categories: CategoryDocument[]
): CategoryResponse[] => categories.map(toCategoryResponse);
