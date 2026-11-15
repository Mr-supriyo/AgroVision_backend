/**
 * Agricultural Risk Assessment Orchestrator
 * Integrates all hazard screenings and matches frontend contracts
 * AgroVision (NASA Space Apps Challenge 2026 | Team Innovatrix)
 */

import mongoose from 'mongoose';
import { Farm } from '../../models/Farm.js';
import { SoilTest } from '../../models/SoilTest.js';
import { EnvironmentalObservation } from '../../models/EnvironmentalObservation.js';
import { RiskAssessment } from '../../models/RiskAssessment.js';
import { RainfallRiskService } from './rainfallRiskService.js';
import { WaterloggingRiskService } from './waterloggingRiskService.js';
import { DroughtRiskService } from './droughtRiskService.js';
import { HeatStressRiskService } from './heatStressRiskService.js';
import { SoilSalinityRiskService } from './soilSalinityRiskService.js';
import { RiskScoringService } from './riskScoringService.js';

export class RiskAssessmentService {
  static async assessFarm(farmId, options = {}) {
    let farm = null;
    let soilTest = null;
    let observations = [];

    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.isValidObjectId(farmId)) {
          farm = await Farm.findById(farmId).lean();
        } else {
          farm = await Farm.findOne({ demoId: farmId }).lean();
        }

        if (farm) {
          soilTest = await SoilTest.findOne({ farm: farm._id }).sort({ testDate: -1 }).lean();
          observations = await EnvironmentalObservation.find({ farm: farm._id }).sort({ observationDate: -1 }).limit(30).lean();
        }
      } catch {
        // Disconnected fallback
      }
    }

    // Extract environmental parameters
    const rainfallObs = observations.filter(o => o.parameter === 'RAINFALL_ACCUMULATION');
    const tempMaxObs = observations.filter(o => o.parameter === 'TEMPERATURE_MAX' || o.parameter === 'SURFACE_TEMPERATURE').map(o => o.value);
    const soilMoistureObs = observations.find(o => o.parameter === 'SOIL_MOISTURE')?.value;

    const rainfall7Day = rainfallObs.slice(0, 7).reduce((acc, o) => acc + (o.value || 0), 0);

    // Run specialized risk screenings
    const rainRisk = RainfallRiskService.assess(rainfallObs);
    const waterloggingRisk = WaterloggingRiskService.assess({
      rainfall7DayMm: rainfall7Day,
      soilType: farm?.soilType,
      farmType: farm?.farmType
    });
    const droughtRisk = DroughtRiskService.assess({
      rainfall14DayMm: rainfallObs.slice(0, 14).reduce((acc, o) => acc + (o.value || 0), 0),
      rootZoneMoisture: soilMoistureObs,
      currentCrop: farm?.currentCrop
    });
    const heatRisk = HeatStressRiskService.assess(tempMaxObs, farm?.currentCrop);
    const salinityRisk = SoilSalinityRiskService.assess(soilTest);

    const riskFactors = [
      waterloggingRisk,
      salinityRisk,
      heatRisk,
      rainRisk,
      droughtRisk
    ];

    const composite = RiskScoringService.synthesize(riskFactors);

    // Response structure matching frontend riskService.js
    const responsePayload = {
      status: 'success',
      data: {
        farmId,
        farmName: farm?.farmName || null,
        district: farm?.district || null,
        overallRiskLevel: composite.overallRiskLevel,
        score: composite.score,
        riskFactors,
        methodology: 'Multi-hazard threshold screening backed by BCKV, ICAR, CSSRI, and NASA observations',
        methodologyVersion: 'v2.0-evidence-based'
      },
      metadata: {
        assessedAt: new Date(),
        contributingObservationsCount: observations.length,
        disclaimer: 'This is an agricultural decision-support risk screening. Physical ground validation is advised before committing capital interventions.'
      }
    };

    // Persist assessment to MongoDB if connected
    if (farm && mongoose.connection.readyState === 1) {
      try {
        await RiskAssessment.create({
          farm: farm._id,
          riskType: 'OVERALL_COMPOSITE',
          riskLevel: composite.riskLevelEnum,
          score: composite.score,
          assessmentDate: new Date(),
          contributingFactors: riskFactors.map(f => `${f.category}: ${f.level}`),
          methodologyVersion: 'v2.0-evidence-based',
          dataOrigin: farm.dataOrigin === 'DEMO' ? 'DEMO' : 'CALCULATED',
          status: 'ACTIVE'
        });
      } catch {
        // Disconnected persistence bypass
      }
    }

    return responsePayload;
  }
}
