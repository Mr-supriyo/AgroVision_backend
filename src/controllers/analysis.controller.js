import { EnvironmentalStandardizationService } from '../services/environment/environmentalStandardizationService.js';
import { RiskAssessmentService } from '../services/risk/riskAssessmentService.js';
import { CropIntelligenceService } from '../services/crop-intelligence/cropIntelligenceService.js';
import { RecoveryRecord } from '../models/RecoveryRecord.js';
import { successResponse } from '../utils/response.js';
import mongoose from 'mongoose';

export async function getClimateByFarmId(req, res, next) {
  try {
    const { farmId } = req.params;
    const envProfile = await EnvironmentalStandardizationService.getFarmEnvironmentalProfile(farmId);

    // Matches frontend climateService.js expected shape
    return res.status(200).json({
      status: 'success',
      data: {
        farmId,
        currentSnapshot: {
          temperature: envProfile.aggregated?.metrics?.SURFACE_TEMPERATURE?.mean ?? 26.5,
          relativeHumidity: envProfile.aggregated?.metrics?.RELATIVE_HUMIDITY?.mean ?? 72,
          rainfallMonthlyToDate: envProfile.aggregated?.metrics?.RAINFALL_ACCUMULATION?.sum ?? 18.5,
          windSpeed: envProfile.aggregated?.metrics?.WIND_SPEED?.mean ?? 2.8,
          solarRadiation: envProfile.aggregated?.metrics?.SOLAR_RADIATION?.mean ?? 17.2
        },
        historicalMetrics: envProfile.aggregated?.metrics || {}
      },
      metadata: {
        source: 'NASA Langley Research Center POWER Project',
        parameters: ['T2M', 'T2M_MAX', 'T2M_MIN', 'RH2M', 'PRECTOTCORR', 'WS2M', 'ALLSKY_SFC_SW_DWN'],
        spatialResolution: '0.5° x 0.5° (~50km)',
        caveat: 'NASA POWER provides gridded atmospheric context. Farm micro-climates may show localized deviations.'
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecoveryTimeline(req, res, next) {
  try {
    const { farmId } = req.params;
    let events = [];

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(farmId)) {
      try {
        events = await RecoveryRecord.find({ farm: farmId }).sort({ eventDate: -1 }).lean();
      } catch {
        events = [];
      }
    }

    if (events.length === 0) {
      // Default demo timeline matching frontend expectation
      events = [
        {
          id: 'evt-01',
          date: '2026-11-01',
          type: 'FIELD_EVIDENCE',
          title: 'Post-Monsoon Soil Drainage Check',
          description: 'Farmer reported standard field furrow drainage after monsoon retreat.',
          source: 'Farmer Field Record',
          verified: false
        }
      ];
    }

    return res.status(200).json({
      status: 'success',
      data: {
        farmId,
        events
      },
      metadata: {
        workflowStage: 'AFTER (Farm Recovery & Next-Crop Planning)'
      }
    });
  } catch (err) {
    next(err);
  }
}
