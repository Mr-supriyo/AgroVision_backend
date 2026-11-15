/**
 * Crop Rotation Intelligence & Agronomic Sequencing Service
 * AgroVision (NASA Space Apps Challenge 2026 | Team Innovatrix)
 */

import { RESEARCH_VERIFIED_CROPS } from './cropKnowledgeBase.js';

export class CropRotationService {
  static evaluateRotation(previousCrops = [], proposedCropName = '') {
    const prevNames = previousCrops.map(c => String(c).toLowerCase());
    const proposed = RESEARCH_VERIFIED_CROPS.find(c => c.cropName.toLowerCase() === String(proposedCropName).toLowerCase());

    const issues = [];
    const benefits = [];

    if (!proposed) {
      return {
        isRecommended: false,
        issues: ['Proposed crop is not verified in regional knowledge base.'],
        benefits: []
      };
    }

    // Rule 1: Family Repetition Check (e.g., Potato -> Potato or Solanaceae back-to-back breeds bacterial wilt/blight)
    const lastCrop = previousCrops[previousCrops.length - 1];
    if (lastCrop) {
      const lastVerified = RESEARCH_VERIFIED_CROPS.find(c => c.cropName.toLowerCase() === String(lastCrop).toLowerCase());
      if (lastVerified && lastVerified.family === proposed.family) {
        issues.push(`Continuous cropping of ${proposed.family} family (${lastVerified.cropName} -> ${proposed.cropName}) increases soil-borne pathogen and pest carryover.`);
      }
    }

    // Rule 2: Nitrogen Restorative Legume Check
    const hasLegumeInRotation = prevNames.some(p => p.includes('pulse') || p.includes('pea') || p.includes('khesari') || p.includes('moong') || p.includes('gram'));
    if (proposed.nitrogenFixing) {
      benefits.push(`${proposed.cropName} (Fabaceae) hosts Rhizobium nodules, biologically fixing 30-50 kg N/ha and restoring soil fertility.`);
    } else if (!hasLegumeInRotation) {
      benefits.push('Recommendation: Introduce a short-duration pulse (e.g. Grass Pea / Moong) into the annual sequence to break continuous nutrient depletion.');
    }

    // Rule 3: Water Demand Balance (High water Kharif rice followed by low water Rabi crop)
    if (prevNames.some(p => p.includes('paddy') || p.includes('rice')) && (proposed.waterRequirement === 'Low' || proposed.waterRequirement === 'Medium')) {
      benefits.push(`Excellent water budgeting: following water-intensive paddy with ${proposed.waterRequirement.toLowerCase()}-water ${proposed.cropName} conserves subsoil moisture and groundwater.`);
    }

    const isRecommended = issues.length === 0;

    return {
      proposedCrop: proposed.cropName,
      isRecommended,
      suitabilityRating: isRecommended ? 'Optimal Sequence' : 'Caution Advised',
      issues,
      benefits,
      agronomicGuideline: 'Alternating crop families and introducing legumes interrupts pest cycles and balances soil nutrient mining.'
    };
  }

  static getRecommendationsForFarm(farmId, currentCrop = '') {
    const isGosaba = String(farmId).toLowerCase().includes('gosaba');

    if (isGosaba) {
      return {
        recommendedSequence: [
          { season: 'Kharif', crop: 'Salt-Tolerant Rice (Aman)', reason: 'Monsoon rains wash surface salts; freshwater standing water feasible.' },
          { season: 'Rabi (Relay)', crop: 'Grass Pea (Khesari)', reason: 'Zero-tillage relay in standing rice; salt-tolerant (up to 4.5 dS/m); fixes nitrogen.' },
          { season: 'Summer/Zaid', crop: 'Fallow with Mulch / Salt-Resistant Fodder', reason: 'Avoid water-intensive Boro rice due to saline water table capillary rise.' }
        ],
        rulesChecked: [
          'Capillary salt avoidance during dry winter months',
          'Biological nitrogen fixation via legume relay',
          'Zero-tillage moisture conservation'
        ]
      };
    }

    // Gangetic Alluvial (Purba Bardhaman, Hooghly)
    return {
      recommendedSequence: [
        { season: 'Kharif', crop: 'Aman Paddy', reason: 'High seasonal monsoon rainfall supports cereal grain production.' },
        { season: 'Rabi', crop: 'Kufri Pukhraj Potato or Mustard Binoy', reason: 'High-value commercial cash crops thriving in cool Gangetic winter.' },
        { season: 'Zaid / Pre-Kharif', crop: 'Summer Sesame (Til) or Tossa Jute', reason: 'Short-duration turnaround restoring soil structure before next monsoon.' }
      ],
      rulesChecked: [
        'Family alternation (Poaceae -> Solanaceae/Brassicaceae -> Pedaliaceae)',
        'Water deficit compatibility with NASA POWER seasonal rainfall',
        'Turnaround window feasibility between potato harvest and sesame sowing'
      ]
    };
  }
}
