// RogueLearn.Extension/api/subjectsApi.ts
import axiosClient from './axiosClient';
import { ApiResponse } from '@/types/base/Api';

// Define the response type based on your Backend DTO
export interface ImportSubjectResponse {
    id: string;
    subjectCode: string;
    subjectName: string;
}

const subjectsApi = {
  // Call: POST /api/admin/subjects/import-from-text
  importFromText: async (rawHtml: string): Promise<ApiResponse<ImportSubjectResponse>> => {
    const formData = new FormData();
    formData.append('rawText', rawHtml);
    // Note: 'semester' is optional in your backend command, leaving it null to let AI infer it

    console.log('[subjectsApi] Sending import request, rawHtml length:', rawHtml.length);

    try {
        const res = await axiosClient.post<ImportSubjectResponse>(
            '/api/admin/subjects/import-from-text', 
            formData, 
            { 
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 120000 // 2 minutes timeout for AI processing
            }
        );
        
        console.log('[subjectsApi] Import success:', res.data);
        return {
            isSuccess: true,
            data: res.data
        };
    } catch (error: any) {
        // Extract detailed error information
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || errorData?.message || error.message || 'Unknown error';
        
        console.error("[subjectsApi] Import API Error:", {
          status,
          errorMessage,
          errorData,
          fullError: error
        });
        
        // Throw error so caller can catch and display the message
        throw new Error(`API Error (${status || 'Network'}): ${errorMessage}`);
    }
  }
};

export default subjectsApi;