import { apiClient } from './client';
import { Tag, TagSuggestion, EntityTag, CreateTagRequest, UpdateTagRequest, TagType } from '@/types/tags';

export const tagsApi = {
  // Dictionary Management
  getTags: async (params?: { search?: string; type?: TagType; active?: boolean }) => {
    const { data } = await apiClient.get<Tag[]>('/tags', { params });
    return data;
  },

  getSuggestions: async (params?: { search?: string; type?: TagType }) => {
    const { data } = await apiClient.get<TagSuggestion[]>('/tags/suggestions', { params });
    return data;
  },

  getTag: async (id: string) => {
    const { data } = await apiClient.get<Tag>(`/tags/${id}`);
    return data;
  },

  createTag: async (payload: CreateTagRequest) => {
    const { data } = await apiClient.post<Tag>('/tags', payload);
    return data;
  },

  updateTag: async (id: string, payload: UpdateTagRequest) => {
    const { data } = await apiClient.patch<Tag>(`/tags/${id}`, payload);
    return data;
  },

  deleteTag: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/tags/${id}`);
    return data;
  },

  // Entity Management
  getEntityTags: async (entityType: 'job_description' | 'candidate', entityId: string) => {
    const { data } = await apiClient.get<EntityTag[]>(`/entity-tags/${entityType}/${entityId}`);
    return data;
  },

  assignTag: async (entityType: 'job_description' | 'candidate', entityId: string, tagId: string) => {
    const { data } = await apiClient.post<EntityTag>(`/entity-tags/${entityType}/${entityId}`, {
      tagId,
      source: 'manual',
    });
    return data;
  },

  removeTag: async (entityType: 'job_description' | 'candidate', entityId: string, tagId: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/entity-tags/${entityType}/${entityId}/${tagId}`);
    return data;
  },

  replaceTags: async (
    entityType: 'job_description' | 'candidate',
    entityId: string,
    tags: Array<string | { id: string; is_starred?: boolean }>,
  ) => {
    const payload = {
      tags: tags.map(t => {
        if (typeof t === 'string') {
          return { tagId: t, source: 'manual', is_starred: false };
        }
        return { tagId: t.id, source: 'manual', is_starred: !!t.is_starred };
      }),
    };
    const { data } = await apiClient.put<EntityTag[]>(`/entity-tags/${entityType}/${entityId}/replace`, payload);
    return data;
  },
};
