export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface IStorageService {
  uploadFile(file: UploadedFile, folder: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
