/**
 * api_adapter.js
 *
 * Adapter / schema-validation layer between raw API responses and the UI.
 * All API responses should be routed through these functions so that if the
 * backend schema ever changes, only this file needs updating (R2 mitigation).
 *
 * Usage:
 *   import { adaptRecommendations, adaptFacilityData, validateRecommendation } from './api_adapter';
 */

// ─── Schema Validators ────────────────────────────────────────────────────────

/**
 * Validates a single recommendation object from the /recommendations endpoint.
 * Returns true if the shape is what we expect; false otherwise.
 * Log a warning so schema drift is caught immediately in dev/testing.
 */
export function validateRecommendation(item) {
  const valid =
    item !== null &&
    typeof item === "object" &&
    typeof item.day === "string" &&
    typeof item.hour === "number" &&
    typeof item.occupancy === "number";

  if (!valid) {
    console.warn(
      "[api_adapter] Unexpected recommendation shape — check backend schema:",
      JSON.stringify(item)
    );
  }
  return valid;
}

/**
 * Validates a single facility/location object from the live-data endpoint.
 * Expected shape matches SAMPLE_DATA in App.jsx.
 */
export function validateFacilityLocation(item) {
  const valid =
    item !== null &&
    typeof item === "object" &&
    typeof item.FacilityName === "string" &&
    typeof item.LocationName === "string" &&
    typeof item.IsClosed === "boolean" &&
    typeof item.LastCount === "number" &&
    typeof item.TotalCapacity === "number";

  if (!valid) {
    console.warn(
      "[api_adapter] Unexpected facility location shape — check backend schema:",
      JSON.stringify(item)
    );
  }
  return valid;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

/**
 * Adapts raw /recommendations response into the shape the UI expects.
 * Filters out any items that fail schema validation so bad data never
 * reaches the render layer.
 *
 * @param {any} raw - The raw JSON body from the /recommendations endpoint
 * @returns {{ hour: number, occupancy: number, day: string }[]}
 */
export function adaptRecommendations(raw) {
  // Expect: { recommendations: [...] }
  if (!raw || !Array.isArray(raw.recommendations)) {
    console.warn("[api_adapter] /recommendations response missing 'recommendations' array:", raw);
    return [];
  }
  return raw.recommendations.filter(validateRecommendation);
}

/**
 * Adapts raw live-facility-data response into the shape the UI expects.
 * Filters out any locations that fail schema validation.
 *
 * @param {any} raw - The raw JSON body from the live facility counts endpoint
 * @returns {object[]} Array of validated facility location objects
 */
export function adaptFacilityData(raw) {
  // When the live API is wired up, adapt its specific shape here.
  // For now we accept an array directly (matching SAMPLE_DATA format)
  // or an object with a "locations" key — handle both defensively.
  const items = Array.isArray(raw) ? raw : (raw?.locations ?? []);

  if (!items.length) {
    console.warn("[api_adapter] adaptFacilityData: received empty or unrecognised shape:", raw);
  }

  return items.filter(validateFacilityLocation);
}
