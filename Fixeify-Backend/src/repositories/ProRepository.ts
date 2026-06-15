import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { PendingProModel, type PendingProDocument } from "../models/pendingProModel";
import { ApprovedProModel, type ApprovedProDocument, type ITimeSlot } from "../models/approvedProModel";
import type { CategoryDocument } from "../models/categoryModel";
import type { IProRepository } from "./IProRepository";
import { type ClientSession, Types, type PipelineStage } from "mongoose";
import type { NearbyProRecord, PopulatedApprovedProRecord, ProProfileRecord } from "../contracts/repository/proRecords";

declare const console: {
  error: (message: string, error?: unknown) => void;
};

@injectable()
export class MongoProRepository extends BaseRepository<PendingProDocument> implements IProRepository {
  constructor() {
    super(PendingProModel);
  }

  async createPendingPro(proData: Partial<PendingProDocument>): Promise<PendingProDocument> {
    return this.create(proData);
  }

  async findPendingProByEmail(email: string): Promise<PendingProDocument | null> {
    return this.findOne({ email });
  }

  async findApprovedProByEmail(email: string): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findOne({ email }).exec();
  }

  async getPendingProsWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<PendingProDocument[]> {
    const sortOrder = sortBy === "oldest" ? 1 : -1;
    return this._model
      .find({ isRejected: false })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();
  }


  async getTotalPendingProsCount(): Promise<number> {
    return this._model.countDocuments({}).exec();
  }

  async findById(id: string, session?: ClientSession): Promise<PendingProDocument | null> {
    const pro = await this._model.findById(id).session(session || null).exec();
    if (!pro) {
      throw new Error("Pro not found");
    }
    return pro;
  }

  async approvePro(id: string, password: string, about: string, session?: ClientSession): Promise<{ email: string; firstName: string; lastName: string; approvedProId: string }> {
    const pendingPro = await this.findById(id, session);
    if (!pendingPro) throw new Error("Pending pro not found");

    const approvedProData = {
      ...pendingPro.toObject(),
      password,
      isBanned: false,
      isUnavailable: false,
      about: about || null,
    };

    const approvedPros = await ApprovedProModel.create([approvedProData], { session });
    const approvedPro = approvedPros[0];
    await this._model.findByIdAndDelete(id).session(session || null).exec();

    return {
      email: approvedPro.email,
      firstName: approvedPro.firstName,
      lastName: approvedPro.lastName,
      approvedProId: approvedPro._id.toString(),
    };
  }

  async rejectPro(id: string): Promise<void> {
    const pendingPro = await this.findById(id);
    if (!pendingPro) throw new Error("Pending pro not found");
    await this._model.findByIdAndUpdate(id, { isRejected: true }).exec();
  }


  async getApprovedProsWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<PopulatedApprovedProRecord[]> {
    const sortOrder = sortBy === "oldest" ? 1 : -1;
    return ApprovedProModel.find({}, { password: 0 })
      .sort({ createdAt: sortOrder })
      .populate<{ categoryId: CategoryDocument }>("categoryId")
      .skip(skip)
      .limit(limit)
      .exec() as Promise<PopulatedApprovedProRecord[]>;
  }

  async findApprovedProById(id: string, session?: ClientSession): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findById(id).session(session || null).exec();
  }

  async getTotalApprovedProsCount(): Promise<number> {
    return ApprovedProModel.countDocuments({}).exec();
  }

  async findApprovedProByIdWithCategory(id: string): Promise<PopulatedApprovedProRecord | null> {
    return ApprovedProModel.findById(id, { password: 0 })
      .populate<{ categoryId: CategoryDocument }>("categoryId")
      .exec() as Promise<PopulatedApprovedProRecord | null>;
  }

  async findApprovedProProfileById(id: string): Promise<ProProfileRecord | null> {
    return ApprovedProModel.findById(id, {
      _id: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      phoneNumber: 1,
      location: 1,
      profilePhoto: 1,
      about: 1,
      isBanned: 1,
      isUnavailable: 1,
    }).exec();
  }

   async updatePendingPro(id: string, data: Partial<PendingProDocument>): Promise<PendingProDocument | null> {
    return this._model
      .findByIdAndUpdate(
        id,
        { $set: { ...data, isRejected: false, updatedAt: new Date() } },
        { new: true, runValidators: true }
      )
      .exec();
  }

  async updateBanStatus(proId: string, isBanned: boolean): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findByIdAndUpdate(proId, { isBanned }, { new: true }).exec();
  }

  async deletePendingPro(id: string): Promise<void> {
    await this.delete(id);
  }

  async updateApprovedPro(id: string, data: Partial<ApprovedProDocument>): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async findNearbyPros(
    categoryId: string, 
    longitude: number, 
    latitude: number, 
    skip: number = 0, 
    limit: number = 5, 
    sortBy: string = 'nearest', 
    availabilityFilter?: string
  ): Promise<{ pros: NearbyProRecord[]; total: number; hasMore: boolean }> {
    try {
     
      let pipeline: PipelineStage[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            distanceField: "distance",
            maxDistance: 10000,
            spherical: true,
            query: {
              categoryId: new Types.ObjectId(categoryId),
              isBanned: false,
              isUnavailable: false,
            },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $lookup: {
            from: "ratingreviews",
            localField: "_id",
            foreignField: "proId",
            as: "ratings",
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: "$ratings" }, 0] },
                then: { $avg: "$ratings.rating" },
                else: 0
              }
            },
            totalRatings: { $size: "$ratings" }
          }
        }
      ];

      if (availabilityFilter && availabilityFilter.length > 0) {
        try {
          const selectedDays = JSON.parse(availabilityFilter);
          if (Array.isArray(selectedDays) && selectedDays.length > 0) {
            const dayConditions = selectedDays.map(day => ({
              [`availability.${day.toLowerCase()}`]: { $exists: true, $ne: [] }
            }));
            
            pipeline.push({
              $match: {
                $and: dayConditions
              }
            });
          }
        } catch {
         
          if (availabilityFilter === 'all7days') {
            pipeline.push({
              $match: {
                $and: [
                  { "availability.monday": { $exists: true, $ne: [] } },
                  { "availability.tuesday": { $exists: true, $ne: [] } },
                  { "availability.wednesday": { $exists: true, $ne: [] } },
                  { "availability.thursday": { $exists: true, $ne: [] } },
                  { "availability.friday": { $exists: true, $ne: [] } },
                  { "availability.saturday": { $exists: true, $ne: [] } },
                  { "availability.sunday": { $exists: true, $ne: [] } }
                ]
              }
            });
          }
        }
      }

      let sortStage: PipelineStage;
      switch (sortBy) {
        case 'highest_rated':
          sortStage = { $sort: { averageRating: -1, distance: 1 } };
          break;
        case 'lowest_rated':
          sortStage = { $sort: { averageRating: 1, distance: 1 } };
          break;
        case 'nearest':
        default:
          sortStage = { $sort: { distance: 1 } };
          break;
      }
      pipeline.push(sortStage);

      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await ApprovedProModel.aggregate<{ total: number }>(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      const pros = await ApprovedProModel.aggregate<NearbyProRecord>(pipeline);

      const hasMore = skip + limit < total;

      return {
        pros,
        total,
        hasMore
      };
    } catch (error) {
      console.error("findNearbyPros error:", error);
      throw error;
    }
  }

  async updateAvailability(proId: string, dayOfWeek: string, timeSlots: ITimeSlot[], booked: boolean = true, session?: ClientSession): Promise<ApprovedProDocument | null> {
    try {
      const startTimes = timeSlots.map(slot => slot.startTime);
      const endTimes = timeSlots.map(slot => slot.endTime);
      const availabilityDay = dayOfWeek as keyof ApprovedProDocument["availability"];

      const result = await ApprovedProModel.findOneAndUpdate(
        {
          _id: proId,
          [`availability.${dayOfWeek}`]: {
            $elemMatch: {
              startTime: { $in: startTimes },
              endTime: { $in: endTimes }
            }
          }
        },
        {
          $set: {
            [`availability.${dayOfWeek}.$[elem].booked`]: booked
          }
        },
        {
          new: true,
          arrayFilters: [{ "elem.startTime": { $in: startTimes }, "elem.endTime": { $in: endTimes } }],
          session
        }
      ).exec();

      if (!result) {
        const pro = await ApprovedProModel.findById(proId).session(session || null);
        if (pro) {
          pro.availability = pro.availability || {};
          pro.availability[availabilityDay] = timeSlots.map(slot => ({ ...slot, booked }));
          return await pro.save({ session });
        }
        return null;
      }

      return result;
    } catch (error) {
      console.error("Error updating availability:", error);
      return null;
    }
  }

}
