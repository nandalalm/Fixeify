import dotenv from "dotenv";
import mongoose from "mongoose";
import { CategoryModel } from "../models/categoryModel";

dotenv.config();

const categories = [
  { name: "Cleaning", image: "/Cleaning.png" },
  { name: "Electrical", image: "/Electrical.png" },
  { name: "Landscaping", image: "/Landscaping.png" },
  { name: "Moving Help", image: "/Moving-help.png" },
  { name: "Painting", image: "/Painting.png" },
  { name: "Plumbing", image: "/Plumbing.png" },
  { name: "Remodeling", image: "/Remodeling.png" },
  { name: "Roofing", image: "/Roofing.png" },
];

const seedCategories = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to seed categories");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  for (const category of categories) {
    await CategoryModel.updateOne(
      { name: category.name },
      { $set: category },
      { upsert: true }
    );
  }

  const total = await CategoryModel.countDocuments();
  console.log(`Seeded ${categories.length} categories. Total categories: ${total}`);
};

seedCategories()
  .catch((error) => {
    console.error("Failed to seed categories:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
