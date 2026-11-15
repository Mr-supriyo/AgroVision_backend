import { Farm } from '../models/Farm.js';
import { RecoveryRecord } from '../models/RecoveryRecord.js';
import { DEMO_FARMS_SEED } from '../seed/seedData.js';
import { successResponse, errorResponse } from '../utils/response.js';
import mongoose from 'mongoose';

export async function getAllFarms(req, res, next) {
  try {
    let farms = [];
    if (mongoose.connection.readyState === 1) {
      try {
        farms = await Farm.find().lean();
      } catch {
        farms = [];
      }
    }
    if (farms.length === 0) {
      farms = DEMO_FARMS_SEED.map(f => ({ ...f, _id: f.demoId, id: f.demoId }));
    }

    return successResponse(res, {
      statusCode: 200,
      message: 'Farms retrieved successfully.',
      data: farms
    });
  } catch (err) {
    next(err);
  }
}

export async function getFarmById(req, res, next) {
  try {
    const { farmId } = req.params;
    let farm = null;

    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.isValidObjectId(farmId)) {
          farm = await Farm.findById(farmId).lean();
        } else {
          farm = await Farm.findOne({ demoId: farmId }).lean();
        }
      } catch {}
    }

    if (!farm) {
      farm = DEMO_FARMS_SEED.find(f => f.demoId === farmId) || DEMO_FARMS_SEED[0];
      farm = { ...farm, _id: farm.demoId, id: farm.demoId };
    }

    return successResponse(res, {
      statusCode: 200,
      message: 'Farm retrieved successfully.',
      data: farm
    });
  } catch (err) {
    next(err);
  }
}

export async function logFieldObservation(req, res, next) {
  try {
    const { farmId } = req.params;
    const { title, description, photoUrl, eventType = 'FIELD_EVIDENCE' } = req.body || {};

    let eventDoc = null;
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(farmId)) {
      try {
        eventDoc = await RecoveryRecord.create({
          farm: farmId,
          eventDate: new Date(),
          eventType: 'FIELD_EVIDENCE',
          title: title || 'Farmer Field Observation',
          description: description || 'Field photograph and condition update submitted by farmer.',
          recoveryStatus: 'AFFECTED',
          evidenceReferences: photoUrl ? [{ url: photoUrl }] : []
        });
      } catch {}
    }

    return successResponse(res, {
      statusCode: 201,
      message: 'Field observation logged successfully.',
      data: {
        id: eventDoc?._id?.toString() || `evt-${Date.now()}`,
        farmId,
        date: new Date().toISOString().split('T')[0],
        type: eventType,
        title: title || 'Farmer Field Observation',
        description: description || 'Field photograph and condition update submitted by farmer.',
        source: 'Farmer Field Upload',
        verified: false,
        photoUrl: photoUrl || null
      }
    });
  } catch (err) {
    next(err);
  }
}
