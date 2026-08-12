/**
 * Query param that opens the survey modal.
 *
 * Deliberately alone in its own module. `SurveyIntakeGate` is statically
 * imported by the home page, so anything the gate imports is pulled into the
 * home page's bundle — importing this from `constants.ts` dragged every line of
 * survey copy along with it (measured: +1.8 kB on a page no visitor uses it on).
 * Keep this file free of imports.
 */
export const SURVEY_PARAM = 'survey_intake_form'
