const cleanText = (value, maxLength = 1000) => String(value || '')
  .replace(/[<>]/g, '')
  .trim()
  .slice(0, maxLength);

const cleanList = (value) => {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map((item) => cleanText(item, 100)).filter(Boolean))].slice(0, 30);
};

function normalizeHealthScreeningInput(value, recordedAt) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const conditions = cleanList(value.conditions);
  const allergens = cleanList(value.allergens);
  const snapshot = {
    version: 1,
    conditions,
    allergens,
    noKnownHealthConcerns: Boolean(value.noKnownHealthConcerns),
    medicationsBloodThinners: cleanText(value.medicationsBloodThinners),
    recentIllnessInfection: cleanText(value.recentIllnessInfection),
    substanceInfluence: Boolean(value.substanceInfluence),
    siteSkinCondition: cleanText(value.siteSkinCondition, 255) || 'Normal',
    recordedAt,
  };

  return {
    ...snapshot,
    hasDiabetes: conditions.includes('Diabetes'),
    hasSkinDisorders: conditions.includes('Skin Condition'),
    isPregnant: conditions.includes('Pregnancy'),
    hasBleedingConditions: conditions.includes('Blood Disorder'),
    hasImmuneConditions: conditions.includes('Immunocompromised'),
  };
}

module.exports = { normalizeHealthScreeningInput };
