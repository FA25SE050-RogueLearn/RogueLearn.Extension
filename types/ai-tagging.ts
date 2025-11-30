export interface SuggestNoteTagsQueryRequest {
  content: string
  maxTags?: number
}

export interface SuggestNoteTagsResponse {
  tags: { id?: string; name: string }[]
}

export interface SuggestNoteTagsFromUploadRequest {
  fileContent: Blob | ArrayBuffer | string
  fileName?: string
  contentType?: string
  maxTags?: number
}

export interface CommitNoteTagSelectionsCommandRequest {
  noteId: string
  tagIds: string[]
  authUserId?: string
}

export interface CommitNoteTagSelectionsResponse {
  noteId: string
  appliedTagIds: string[]
}

export interface CreateNoteWithAiTagsCommandRequest {
  title?: string
  isPublic?: boolean
  maxTags?: number
  applySuggestions?: boolean
  fileContent?: Blob | ArrayBuffer | string
  fileName?: string
  contentType?: string
  rawText?: string
}

export interface CreateNoteWithAiTagsResponse {
  id: string
  tagIds: string[]
}