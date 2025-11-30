export interface Tag {
  id: string;
  name: string;
}

export interface CreateTagCommandRequest {
  authUserId: string;
  name: string;
}

export interface CreateTagResponse {
  tag: Tag;
}

export interface GetMyTagsQueryRequest {
  authUserId: string;
  search?: string;
}

export interface GetMyTagsResponse {
  tags: Tag[];
}

export interface AttachTagToNoteCommandRequest {
  authUserId: string;
  noteId: string;
  tagId: string;
}

export interface AttachTagToNoteResponse {
  noteId: string;
  tag: Tag;
  alreadyAttached: boolean;
}

export interface RemoveTagFromNoteCommandRequest {
  authUserId: string;
  noteId: string;
  tagId: string;
}

export interface GetTagsForNoteQueryRequest {
  authUserId: string;
  noteId: string;
}

export interface GetTagsForNoteResponse {
  noteId: string;
  tags: Tag[];
}

export interface CreateTagAndAttachToNoteCommandRequest {
  authUserId: string;
  noteId: string;
  name: string;
}

export interface CreateTagAndAttachToNoteResponse {
  noteId: string;
  tag: Tag;
  createdNewTag: boolean;
}

export interface UpdateTagCommandRequest {
  authUserId: string;
  name: string;
}

export interface UpdateTagResponse {
  tag: Tag;
}