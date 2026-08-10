/**
 * Geometry/unit conversion helpers.
 *
 * geometricBounds values are interpreted by InDesign in the document's
 * CURRENT viewPreferences measurement unit (whatever the user's install is
 * set to, e.g. inches), not a fixed unit. All MCP position/size args are
 * documented as millimeters, so callers must convert mm -> points and pin
 * the units to points for the duration of the assignment, mirroring the
 * pattern documentHandlers.js already uses for page/margin setup.
 */

export const MM_TO_PT = 2.8346;

export function mmToPt(mm) {
    return Math.round(mm * MM_TO_PT * 100) / 100;
}

/**
 * Wrap a code snippet that sets geometricBounds (or otherwise depends on
 * unambiguous point values) so it runs with the document's measurement
 * units temporarily forced to points, then restored. `doc` must already be
 * in scope where this snippet is inlined.
 */
export function withPointsUnitsSnippet(bodyCode) {
    return `
                const __savedH = doc.viewPreferences.horizontalMeasurementUnits;
                const __savedV = doc.viewPreferences.verticalMeasurementUnits;
                const { MeasurementUnits: __MeasurementUnits } = require('indesign');
                doc.viewPreferences.horizontalMeasurementUnits = __MeasurementUnits.points;
                doc.viewPreferences.verticalMeasurementUnits   = __MeasurementUnits.points;
                try {
                    ${bodyCode}
                } finally {
                    doc.viewPreferences.horizontalMeasurementUnits = __savedH;
                    doc.viewPreferences.verticalMeasurementUnits   = __savedV;
                }
    `;
}
