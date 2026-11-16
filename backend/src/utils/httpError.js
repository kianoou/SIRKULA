export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Anda belum masuk.') => new HttpError(401, message);
export const forbidden = (message = 'Anda tidak memiliki akses ke data ini.') => new HttpError(403, message);
export const notFound = (message = 'Data tidak ditemukan.') => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);
