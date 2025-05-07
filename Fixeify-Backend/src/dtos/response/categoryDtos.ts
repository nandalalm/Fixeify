export class CategoryResponse {
  id: string;
  name: string;
  image: string;

  constructor(category: {
    id: string;
    name: string;
    image: string;
  }) {
    this.id = category.id;
    this.name = category.name;
    this.image = category.image;
  }
}