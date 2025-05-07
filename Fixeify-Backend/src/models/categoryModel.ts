import mongoose, { Schema, Document } from "mongoose";

export interface ICategory {
  name: string;
  image?: string;
}

export interface CategoryDocument extends ICategory, Document {
  _id: mongoose.Types.ObjectId;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

export const CategoryModel = mongoose.model<CategoryDocument>("Category", categorySchema);
export default CategoryModel;