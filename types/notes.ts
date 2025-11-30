export interface NoteDto {
  id: string;
  authUserId: string;
  title: string;
  content?: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
  skillIds: string[];
  questIds: string[];
}

export interface CreateNoteCommandRequest {
  authUserId: string;
  title: string;
  content: any;
  isPublic?: boolean;
  tagIds?: string[] | null;
  skillIds?: string[] | null;
  questIds?: string[] | null;
}

export interface CreateNoteResponse {
  id: string;
  authUserId: string;
  title: string;
  content?: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNoteCommandRequest {
  id: string;
  authUserId: string;
  title?: string;
  content?: any;
  isPublic?: boolean;
  tagIds?: string[] | null;
  skillIds?: string[] | null;
  questIds?: string[] | null;
}

export interface UpdateNoteResponse {
  id: string;
  authUserId: string;
  title: string;
  content?: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteNoteCommandRequest {
  id: string;
  authUserId: string;
}

export interface CreateNoteFromUploadCommandRequest {
  authUserId?: string;
  file: File | Blob;
  fileName?: string;
  contentType?: string;
}

export interface GetMyNotesQueryRequest {
  authUserId?: string;
  search?: string;
}

export type GetMyNotesResponse = NoteDto[];

export interface GetNoteByIdQueryRequest {
  id: string;
}

export type GetNoteByIdResponse = NoteDto | null;

export interface GetPublicNotesQueryRequest {
  search?: string;
}

export type GetPublicNotesResponse = NoteDto[];