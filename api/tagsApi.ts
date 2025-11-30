import axiosClient from './axiosClient'
import { ApiResponse } from '@/types/base/Api'
import {
  CreateTagCommandRequest,
  CreateTagResponse,
  GetMyTagsResponse,
  AttachTagToNoteCommandRequest,
  AttachTagToNoteResponse,
  RemoveTagFromNoteCommandRequest,
  GetTagsForNoteResponse,
  CreateTagAndAttachToNoteCommandRequest,
  CreateTagAndAttachToNoteResponse,
  UpdateTagCommandRequest,
  UpdateTagResponse,
} from '@/types/tags'

const tagsApi = {
  getMyTags: (): Promise<ApiResponse<GetMyTagsResponse>> =>
    axiosClient.get<GetMyTagsResponse>(`/api/tags/me`).then(res => ({
      isSuccess: true,
      data: res.data,
    })),

  create: (payload: CreateTagCommandRequest): Promise<ApiResponse<CreateTagResponse>> =>
    axiosClient.post<CreateTagResponse>('/api/tags', payload).then(res => ({
      isSuccess: true,
      data: res.data,
    })),

  attachToNote: (payload: AttachTagToNoteCommandRequest): Promise<ApiResponse<AttachTagToNoteResponse>> =>
    axiosClient.post<AttachTagToNoteResponse>(
      `/api/notes/${payload.noteId}/tags/attach`,
      JSON.stringify(payload.tagId),
      { headers: { 'Content-Type': 'application/json' } }
    ).then(res => ({
      isSuccess: true,
      data: res.data,
    })),

  removeFromNote: (payload: RemoveTagFromNoteCommandRequest): Promise<void> =>
    axiosClient.delete<void>(`/api/notes/${payload.noteId}/tags/${payload.tagId}`, { data: { authUserId: payload.authUserId } }).then(() => {}),

  deleteTag: (tagId: string): Promise<void> =>
    axiosClient.delete<void>(`/api/tags/${tagId}`).then(() => {}),

  getTagsForNote: (noteId: string): Promise<ApiResponse<GetTagsForNoteResponse>> =>
    axiosClient.get<GetTagsForNoteResponse>(`/api/notes/${noteId}/tags`).then(res => ({
      isSuccess: true,
      data: res.data,
    })),

  createAndAttach: (payload: CreateTagAndAttachToNoteCommandRequest): Promise<ApiResponse<CreateTagAndAttachToNoteResponse>> =>
    axiosClient.post<CreateTagAndAttachToNoteResponse>(`/api/notes/${payload.noteId}/tags/create-and-attach`, {
      authUserId: payload.authUserId,
      name: payload.name,
    }).then(res => ({ isSuccess: true, data: res.data })),

  update: (id: string, payload: UpdateTagCommandRequest): Promise<ApiResponse<UpdateTagResponse>> =>
    axiosClient.put<UpdateTagResponse>(`/api/tags/${id}`, payload).then(res => ({
      isSuccess: true,
      data: res.data,
    })),
}

export default tagsApi