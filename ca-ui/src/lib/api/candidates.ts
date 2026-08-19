import { apiClient } from './client';
import { 
  Candidate, 
  ListResponse,
  CreateCandidateManualRequest, 
  CreateCandidateParsedRequest, 
  UpdateCandidateRequest,
  RegisterDocumentRequest,
  DocumentResponse
} from '@/types/candidates';

export const CandidatesService = {
  createManual: async (data: CreateCandidateManualRequest): Promise<Candidate> => {
    const response = await apiClient.post<Candidate>('/candidates/manual', data);
    return response.data;
  },

  createParsed: async (data: CreateCandidateParsedRequest): Promise<Candidate> => {
    const response = await apiClient.post<Candidate>('/candidates/parsed', data);
    return response.data;
  },

  registerDocument: async (data: RegisterDocumentRequest): Promise<{ id: string }> => {
    const response = await apiClient.post<{ id: string }>('/documents/register', data);
    return response.data;
  },

  uploadResume: async (file: File): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ id: string }>('/documents/upload-resume', formData);
    return response.data;
  },

  /**
   * Upload a resume file and poll until AI parsing is complete.
   * Resolves with the parsed DocumentResponse, or rejects on failure/timeout.
   */
  uploadAndParseResume: async (
    file: File,
    onProgress?: (status: string) => void,
    maxWaitMs = 120_000,
    pollIntervalMs = 2_500,
  ): Promise<DocumentResponse> => {
    // 1. Upload file to MinIO + register document + queue parse job
    const doc = await CandidatesService.uploadResume(file);

    const deadline = Date.now() + maxWaitMs;

    // 2. Poll until parsing is done
    while (Date.now() < deadline) {
      await new Promise<void>((r) => setTimeout(r, pollIntervalMs));
      const status = await CandidatesService.getDocument(doc.id);
      onProgress?.(status.parse_status);

      if (status.parse_status === 'completed') {
        return status;
      }
      if (status.parse_status === 'failed') {
        // Fallback gracefully instead of throwing, so the user can continue with a blank form
        return status;
      }
    }

    throw new Error('Resume parsing timed out. Please try again or check your AI configuration.');
  },

  getDocument: async (id: string): Promise<DocumentResponse> => {
    const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
    return response.data;
  },

  getCandidatePrimaryDocument: async (candidateId: string): Promise<DocumentResponse | null> => {
    try {
      const response = await apiClient.get<DocumentResponse>(`/documents/candidate/${candidateId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  getCandidates: async (params?: { page?: number; limit?: number; search?: string; stage?: string }): Promise<ListResponse<Candidate>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.stage) searchParams.append('stage', params.stage);
    
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ListResponse<Candidate>>(`/candidates${queryString}`);
    return response.data;
  },

  getCandidate: async (id: string): Promise<Candidate> => {
    const response = await apiClient.get<Candidate>(`/candidates/${id}`);
    return response.data;
  },

  updateCandidate: async (id: string, data: UpdateCandidateRequest): Promise<Candidate> => {
    const response = await apiClient.put<Candidate>(`/candidates/${id}`, data);
    return response.data;
  }
};
