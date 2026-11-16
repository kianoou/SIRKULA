import { badRequest } from '../utils/httpError.js';

/**
 * Validasi body/query/params dengan skema zod.
 * Contoh: validate({ body: schema })
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const key of ['params', 'query', 'body']) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || key,
        message: issue.message,
      }));
      return next(badRequest(details[0]?.message || 'Data yang dikirim tidak valid.', details));
    }
    // req.query bersifat getter pada Express 4; simpan hasil parse terpisah.
    if (key === 'query') req.validatedQuery = result.data;
    else req[key] = result.data;
  }
  return next();
};

export const q = (req) => req.validatedQuery || req.query;
