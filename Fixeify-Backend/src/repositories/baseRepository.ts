import { Model, Document } from "mongoose";

export abstract class BaseRepository<T extends Document> {
  constructor(protected _model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this._model.create(data);
  }

  async findOne(query: any): Promise<T | null> {
    return this._model.findOne(query).exec();
  }

  async findById(id: string): Promise<T | null> {
    return this._model.findById(id).exec();
  }

  async delete(id: string): Promise<void> {
    await this._model.findByIdAndDelete(id).exec();
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this._model.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}