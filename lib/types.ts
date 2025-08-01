export interface KnowledgeChunk {
  id: string;
  content: string;
  heading: string;
  embedding?: number[];
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface RagContext {
  context: string;
  sources: string[];
} 