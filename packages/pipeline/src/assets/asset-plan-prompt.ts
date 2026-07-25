import type { LessonBlueprint } from '../blueprint/types.js';

export function buildAssetPlanPrompt(blueprints: LessonBlueprint[]): string {
  const bpSummary = blueprints.map((bp) => ({
    conceptId: bp.conceptId,
    assetRequests: bp.assetRequests,
    representations: bp.representations,
  }));

  return `You are planning visual assets for a mathematics course.

Each lesson blueprint below has asset requests describing the visual aids needed.

Blueprints:
${JSON.stringify(bpSummary, null, 2)}

For each unique asset request across all blueprints, generate an asset manifest entry with:
- id: unique identifier (e.g., "place-value-chart-num-1")
- filename: "{id}.svg"
- mediaType: "image/svg+xml"
- altText: accessible description of the visual
- caption: optional caption shown below the image
- rendererType: one of: place-value-chart, number-line, fraction-bar, fraction-circle, decimal-grid, measurement-scale, area-grid, perimeter-grid, geometry-basic, bar-chart, pictograph
- conceptIds: array of concept IDs this asset supports
- sourceUnitIds: array of source unit IDs referenced
- parameters: renderer-specific numeric/string parameters

Renderer parameter formats:
- place-value-chart: { "maxPlaces": number, "number": number }
  Example: { "maxPlaces": 7, "number": 352648 }
- number-line: { "min": number, "max": number, "target": number, "markers": [number] }
  Example: { "min": 0, "max": 10, "target": 7, "markers": [3, 5, 7] }
- fraction-bar: { "numerator": number, "denominator": number }
  Example: { "numerator": 3, "denominator": 4 }
- fraction-circle: { "numerator": number, "denominator": number }
  Example: { "numerator": 1, "denominator": 2 }
- decimal-grid: { "whole": number, "tenths": number, "hundredths": number }
  Example: { "whole": 0, "tenths": 2, "hundredths": 5 }
- measurement-scale: { "type": "ruler"|"scale", "min": number, "max": number, "step": number, "unit": string }
- area-grid: { "rows": number, "cols": number, "cellSize": number, "shadedCells": [number] }
- perimeter-grid: { "rows": number, "cols": number, "cellSize": number }
- geometry-basic: { "type": "square"|"rectangle"|"triangle"|"circle", "side": number, "radius": number, "showMeasurements": boolean }
- bar-chart: { "labels": [string], "values": [number] }
- pictograph: { "labels": [string], "values": [number] }

Return a JSON object with an "assets" array.`;
}
