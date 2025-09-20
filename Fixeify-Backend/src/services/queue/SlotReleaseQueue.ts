import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import Booking from '../../models/bookingModel';
import ApprovedProModel from '../../models/approvedProModel';

const QUEUE_NAME = 'slot-release';

export type SlotReleaseJobData = {
  bookingId: string; 
};

let connection: IORedis | null = null;
let queue: Queue<SlotReleaseJobData> | null = null;
let worker: Worker<SlotReleaseJobData> | null = null;

function ensureRedisAndQueue(): { ok: boolean } {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { ok: false };
  }
  if (!connection) {
    connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  if (!queue) {
    queue = new Queue<SlotReleaseJobData>(QUEUE_NAME, { connection });
  }
  return { ok: true };
}
const getDayKeyFromDateIST = (date: Date): keyof NonNullable<any> => {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  return day as any;
};

async function freeSlotsForBooking(bookingId: string) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return;
  const pro = await ApprovedProModel.findById(booking.proId);
  if (!pro) return;
  const dayKey = getDayKeyFromDateIST(new Date(booking.preferredDate));
  const daySlots: any[] = (pro as any).availability?.[dayKey] || [];
  let changed = false;
  for (const sel of booking.preferredTime) {
    const idx = daySlots.findIndex((s: any) => s.startTime === sel.startTime && s.endTime === sel.endTime);
    if (idx !== -1 && daySlots[idx].booked) {
      daySlots[idx].booked = false;
      changed = true;
    }
  }
  if (changed) {
    (pro as any).availability[dayKey] = daySlots;
    await pro.save();
  }
}

export async function initSlotReleaseWorker() {
  const ok = ensureRedisAndQueue().ok;
  if (!ok) return null;
  if (worker) return worker;
  worker = new Worker<SlotReleaseJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        if (!mongoose.connection.readyState) {
        }
        await freeSlotsForBooking(job.data.bookingId);
      } catch (err) {
        throw err;
      }
    },
    { connection: connection as IORedis }
  );
  return worker;
}

export async function scheduleSlotRelease(bookingId: string, runAt: Date) {
  const ok = ensureRedisAndQueue().ok;
  if (!ok || !queue) return;
  const delay = Math.max(0, runAt.getTime() - Date.now());
  const opts: JobsOptions = {
    jobId: bookingId, 
    delay,
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  };
  await queue.add('release', { bookingId }, opts);
}

export async function cancelSlotRelease(bookingId: string) {
  const ok = ensureRedisAndQueue().ok;
  if (!ok || !queue) return;
  try {
    const job = await queue.getJob(bookingId);
    if (job) {
      await job.remove();
    }
  } catch (e) {
  }
}

export async function resyncSlotReleaseJobs() {
  const ok = ensureRedisAndQueue().ok;
  if (!ok) return; 
  const candidates = await Booking.find(
    { status: { $in: ['accepted', 'completed'] } },
    { _id: 1, slotReleaseAt: 1, slotReleaseJobId: 1 }
  ).lean();
  const now = Date.now();
  for (const b of candidates as any[]) {
    const runAt = b.slotReleaseAt ? new Date(b.slotReleaseAt) : null;
    const ts = runAt ? runAt.getTime() : 0;
    if (!runAt) {
      continue;
    }
    if (ts <= now) {
      await freeSlotsForBooking(b._id.toString());
      try { await cancelSlotRelease(b._id.toString()); } catch {}
      continue;
    }
    if (!queue) continue;
    const job = await queue.getJob(b._id.toString());
    if (!job) {
      await scheduleSlotRelease(b._id.toString(), runAt);
      await Booking.findByIdAndUpdate(b._id, { slotReleaseJobId: b._id.toString() }).exec();
    }
  }
}
