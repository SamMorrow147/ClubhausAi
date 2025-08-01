import type { KnowledgeChunk, SearchResult, RagContext } from './types'
import { getKnowledgeBase, generateQueryEmbedding } from './embeddings'

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0  
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]  
    normB += b[i] * b[i]
  }
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Simple text-based search when embeddings are not available
 */
function simpleTextSearch(query: string, chunks: KnowledgeChunk[]): SearchResult[] {
  const queryLower = query.toLowerCase()
  const results: SearchResult[] = []
  
  for (const chunk of chunks) {
    const contentLower = chunk.content.toLowerCase()
    const headingLower = chunk.heading.toLowerCase()
    
    // Calculate simple relevance score
    let score = 0
    
    // Check for exact word matches
    const queryWords = queryLower.split(/\s+/)
    for (const word of queryWords) {
      if (word.length < 3) continue // Skip short words
      
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length
      const headingMatches = (headingLower.match(new RegExp(word, 'g')) || []).length
      
      score += contentMatches * 2 + headingMatches * 5 // Heading matches are more important
    }
    
    if (score > 0) {
      results.push({
        chunk,
        similarity: Math.min(score / 10, 1), // Normalize to 0-1
      })
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Search for relevant knowledge chunks using cosine similarity or text search
 */
export async function searchKnowledge(
  query: string,
  topK: number = 3
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)
    
    // Get all knowledge chunks
    const knowledgeBase = getKnowledgeBase()
    
    // If embeddings are available, use vector search
    if (queryEmbedding.length > 0) {
      const similarities: SearchResult[] = []
      
      for (const chunk of knowledgeBase) {
        if (!chunk.embedding) {
          continue
        }
        
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
        similarities.push({
          chunk,
          similarity,
        })
      }
      
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
    } else {
      // Use simple text-based search
      console.log('🔍 Using text-based search (embeddings disabled)')
      return simpleTextSearch(query, knowledgeBase).slice(0, topK)
    }
      
  } catch (error) {
    console.error('❌ Error searching knowledge base:', error)
    // Return empty results on error
    return []
  }
}

/**
 * Format search results for use in a prompt
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant information found in the knowledge base.'
  }
  
  return results
    .map((result, index) => {
      const { chunk, similarity } = result
      return `**Source ${index + 1}** (Relevance: ${(similarity * 100).toFixed(1)}% - ${chunk.heading}):\n${chunk.content}`
    })
    .join('\n\n---\n\n')
}

/**
 * Get context for a chat prompt by searching relevant knowledge
 */
export async function getContextForPrompt(query: string): Promise<RagContext> {
  const searchResults = await searchKnowledge(query, 3)
  
  return {
    context: formatSearchResults(searchResults),
    sources: searchResults.map(result => result.chunk.heading),
  }
} 