import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { PendingProModel, PendingProDocument } from "../models/pendingProModel";
import { ApprovedProModel, ApprovedProDocument, ITimeSlot } from "../models/approvedProModel";
import { CategoryDocument } from "../models/categoryModel";
import { IProRepository } from "./IProRepository";
import { ProResponse, ProProfileResponse } from "../dtos/response/proDtos";
import { UserRole } from "../enums/roleEnum";
import { Types } from "mongoose";

type PopulatedApprovedProDocument = Omit<ApprovedProDocument, "categoryId"> & {
  categoryId: CategoryDocument;
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

  async getPendingProsWithPagination(skip: number, limit: number): Promise<PendingProDocument[]> {
    return this._model.find({ isRejected: false }).skip(skip).limit(limit).exec();
  }


  async getTotalPendingProsCount(): Promise<number> {
    return this._model.countDocuments({}).exec();
  }

  async findById(id: string): Promise<PendingProDocument | null> {
    const pro = await this._model.findById(id).exec();
    if (!pro) {
      throw new Error("Pro not found");
    }
    return pro;
  }

  async approvePro(id: string, password: string, about: string): Promise<{ email: string; firstName: string; lastName: string; approvedProId: string }> {
    const pendingPro = await this.findById(id);
    if (!pendingPro) throw new Error("Pending pro not found");

    const approvedProData = {
      ...pendingPro.toObject(),
      password,
      isBanned: false,
      isUnavailable: false,
      about: about || null,
    };

    const approvedPro = await ApprovedProModel.create(approvedProData);
    await this.delete(id);

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


  async getApprovedProsWithPagination(skip: number, limit: number): Promise<ProResponse[]> {
    const pros = (await ApprovedProModel.find({}, { password: 0 })
      .populate<{ categoryId: CategoryDocument }>("categoryId")
      .skip(skip)
      .limit(limit)
      .exec()) as PopulatedApprovedProDocument[];
    return pros.map(this.mapToProResponse);
  }

  async findApprovedProById(id: string): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findById(id).exec();
  }

  async getTotalApprovedProsCount(): Promise<number> {
    return ApprovedProModel.countDocuments({}).exec();
  }

  async findApprovedProByIdAsResponse(id: string): Promise<ProResponse | null> {
    const pro = (await ApprovedProModel.findById(id, { password: 0 })
      .populate<{ categoryId: CategoryDocument }>("categoryId")
      .exec()) as PopulatedApprovedProDocument | null;
    return pro ? this.mapToProResponse(pro) : null;
  }

  async findApprovedProByIdAsProfile(id: string): Promise<ProProfileResponse | null> {
    const pro = await ApprovedProModel.findById(id, {
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
    return pro ? this.mapToProProfileResponse(pro) : null;
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
  ): Promise<{ pros: ProResponse[]; total: number; hasMore: boolean }> {
    try {
     
      let pipeline: any[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            distanceField: "distance",
            maxDistance: 10000, // 10km in meters
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
        } catch (error) {
         
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

      // Add sorting
      let sortStage: any = {};
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

      // Get total count before pagination
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await ApprovedProModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      const pros = await ApprovedProModel.aggregate(pipeline);
      
      const prosWithRatings = pros.map((pro: any) =>
        new ProResponse({
          _id: pro._id.toString(),
          firstName: pro.firstName,
          role: UserRole.PRO,
          lastName: pro.lastName,
          email: pro.email,
          phoneNumber: pro.phoneNumber,
          category: {
            id: pro.category._id.toString(),
            name: pro.category.name,
            image: pro.category.image || "",
          },
          customService: pro.customService ?? null,
          location: {
            address: pro.location.address,
            city: pro.location.city,
            state: pro.location.state,
            coordinates: pro.location.coordinates,
          },
          profilePhoto: pro.profilePhoto,
          idProof: pro.idProof,
          accountHolderName: pro.accountHolderName,
          accountNumber: pro.accountNumber,
          bankName: pro.bankName,
          availability: {
            monday: pro.availability.monday || [],
            tuesday: pro.availability.tuesday || [],
            wednesday: pro.availability.wednesday || [],
            thursday: pro.availability.thursday || [],
            friday: pro.availability.friday || [],
            saturday: pro.availability.saturday || [],
            sunday: pro.availability.sunday || [],
          },
          isBanned: pro.isBanned,
          about: pro.about ?? null,
          isUnavailable: pro.isUnavailable,
          averageRating: pro.averageRating || 0,
          totalRatings: pro.totalRatings || 0,
        })
      );

      const hasMore = skip + limit < total;

      return {
        pros: prosWithRatings,
        total,
        hasMore
      };
    } catch (error) {
      console.error("findNearbyPros error:", error);
      throw error;
    }
  }

  async updateAvailability(proId: string, dayOfWeek: string, timeSlots: ITimeSlot[], booked: boolean = true): Promise<ApprovedProDocument | null> {
    try {
      const startTimes = timeSlots.map(slot => slot.startTime);
      const endTimes = timeSlots.map(slot => slot.endTime);

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
          arrayFilters: [{ "elem.startTime": { $in: startTimes }, "elem.endTime": { $in: endTimes } }]
        }
      ).exec();

      if (!result) {
        const pro = await ApprovedProModel.findById(proId);
        if (pro) {
          pro.availability = pro.availability || {};
          // @ts-ignore-next-line
          pro.availability[dayOfWeek] = timeSlots.map(slot => ({ ...slot, booked }));
          return await pro.save();
        }
        return null;
      }

      return result;
    } catch (error) {
      console.error("Error updating availability:", error);
      return null;
    }
  }

  private mapToProResponse(pro: PopulatedApprovedProDocument): ProResponse {
    return new ProResponse({
      _id: pro._id.toString(),
      firstName: pro.firstName,
      role: UserRole.PRO,
      lastName: pro.lastName,
      email: pro.email,
      phoneNumber: pro.phoneNumber,
      category: {
        id: pro.categoryId._id.toString(),
        name: pro.categoryId.name,
        image: pro.categoryId.image || "",
      },
      customService: pro.customService ?? null,
      location: {
        address: pro.location.address,
        city: pro.location.city,
        state: pro.location.state,
        coordinates: pro.location.coordinates,
      },
      profilePhoto: pro.profilePhoto,
      idProof: pro.idProof,
      accountHolderName: pro.accountHolderName,
      accountNumber: pro.accountNumber,
      bankName: pro.bankName,
      availability: {
        monday: pro.availability.monday || [],
        tuesday: pro.availability.tuesday || [],
        wednesday: pro.availability.wednesday || [],
        thursday: pro.availability.thursday || [],
        friday: pro.availability.friday || [],
        saturday: pro.availability.saturday || [],
        sunday: pro.availability.sunday || [],
      },
      isBanned: pro.isBanned,
      about: pro.about ?? null,
      isUnavailable: pro.isUnavailable,
    });
  }

  private mapToProProfileResponse(pro: ApprovedProDocument): ProProfileResponse {
    return new ProProfileResponse({
      _id: pro._id.toString(),
      firstName: pro.firstName,
      lastName: pro.lastName,
      email: pro.email,
      phoneNumber: pro.phoneNumber,
      location: {
        address: pro.location.address,
        city: pro.location.city,
        state: pro.location.state,
        coordinates: pro.location.coordinates,
      },
      profilePhoto: pro.profilePhoto,
      about: pro.about ?? null,
      isBanned: pro.isBanned,
      isUnavailable: pro.isUnavailable,
    });
  }
}