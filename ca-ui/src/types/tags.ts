export type TagType = 'skill' | 'domain' | 'level' | 'location' | 'other';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by_name?: string;
  is_starred?: boolean;
}

export interface TagSuggestion {
  id: string;
  name: string;
  type: TagType;
}

export interface EntityTag {
  id: string;
  entity_type: string;
  entity_id: string;
  tag_id: string;
  tag_name: string;
  tag_type: TagType;
  normalized_name: string;
  source: 'manual' | 'parser' | 'ai';
  confidence?: number;
  created_at?: string;
  is_starred?: boolean;
}

export interface CreateTagRequest {
  name: string;
  type: TagType;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  type?: TagType;
  description?: string;
  active?: boolean;
}
