import type { RatingReviewResponse } from "../dtos/response/ratingReviewDtos";
import type {
  PopulatedRatingReviewBookingRecord,
  PopulatedRatingReviewRecord,
} from "../contracts/repository/ratingReviewRecords";

const isPopulatedBooking = (
  booking: PopulatedRatingReviewRecord["bookingId"]
): booking is PopulatedRatingReviewBookingRecord =>
  Boolean(booking && "issueDescription" in booking);

export const toRatingReviewResponse = (record: PopulatedRatingReviewRecord): RatingReviewResponse => {
  const response: RatingReviewResponse = {
    id: record._id.toString(),
    user: {
      id: record.userId._id.toString(),
      name: record.userId.name,
      email: record.userId.email ?? null,
      phoneNo: record.userId.phoneNo ?? null,
      photo: record.userId.photo ?? null,
    },
    pro: {
      id: record.proId._id.toString(),
      firstName: record.proId.firstName,
      lastName: record.proId.lastName,
      email: record.proId.email ?? null,
      phoneNumber: record.proId.phoneNumber ?? null,
      profilePhoto: record.proId.profilePhoto ?? null,
    },
    rating: record.rating,
    createdAt: record.createdAt,
  };

  if (record.categoryId) {
    response.category = {
      id: record.categoryId._id.toString(),
      name: record.categoryId.name,
      image: record.categoryId.image,
    };
  }

  if (record.bookingId) {
    response.bookingId = record.bookingId._id.toString();
    if (isPopulatedBooking(record.bookingId) && record.bookingId.issueDescription) {
      response.issueDescription = record.bookingId.issueDescription;
    }
  }

  if (record.quotaId) {
    response.quotaId = record.quotaId.toString();
  }

  if (record.review) {
    response.review = record.review;
  }

  return response;
};

export const toRatingReviewResponses = (
  records: PopulatedRatingReviewRecord[]
): RatingReviewResponse[] => records.map(toRatingReviewResponse);
