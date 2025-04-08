import { Model } from "mongoose";

export abstract class BaseRepository<T> {
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
}