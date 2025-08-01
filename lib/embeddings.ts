import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import fs from 'fs'
import path from 'path'
import type { KnowledgeChunk } from './types'

// OpenAI embedding model for vector search
const embeddingModel = openai.embedding('text-embedding-ada-002')

// In-memory storage for knowledge chunks
let knowledgeBase: KnowledgeChunk[] = []
let isInitialized = false

/**
 * Initialize the knowledge base by loading and embedding the markdown content
 */
export async function initializeKnowledgeBase(): Promise<void> {
  if (isInitialized) return

  try {
    console.log('🧠 Loading knowledge base...')
    
    // Read the main markdown knowledge base
    const knowledgeFilePath = path.join(process.cwd(), 'data', 'clubhaus-knowledge.md')
    const markdownContent = fs.readFileSync(knowledgeFilePath, 'utf-8')
    
    // Split content into chunks
    let chunks = splitMarkdownIntoChunks(markdownContent)
    console.log(`📚 Created ${chunks.length} knowledge chunks from main file`)
    
    // Load additional project files
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir)
    
    for (const file of files) {
      if (file.endsWith('.md') && file !== 'clubhaus-knowledge.md') {
        const projectFilePath = path.join(dataDir, file)
        const projectContent = fs.readFileSync(projectFilePath, 'utf-8')
        const projectChunks = splitMarkdownIntoChunks(projectContent)
        
        // Add project identifier to chunks
        const projectName = file.replace('.md', '')
        projectChunks.forEach(chunk => {
          chunk.heading = `[${projectName}] ${chunk.heading}`
        })
        
        chunks = chunks.concat(projectChunks)
        console.log(`📁 Added ${projectChunks.length} chunks from ${file}`)
      }
    }
    
    // For now, skip embeddings due to OpenAI quota issues
    // We'll use simple text matching instead
    console.log('⚠️  Skipping embeddings due to OpenAI quota. Using text-based search.')
    
    knowledgeBase = chunks
    isInitialized = true
    
    console.log(`✅ Knowledge base initialized successfully with ${chunks.length} total chunks!`)
  } catch (error) {
    console.error('❌ Failed to initialize knowledge base:', error)
    throw error
  }
}

/**
 * Get the loaded knowledge base
 */
export function getKnowledgeBase(): KnowledgeChunk[] {
  if (!isInitialized) {
    throw new Error('Knowledge base not initialized. Call initializeKnowledgeBase() first.')
  }
  return knowledgeBase
}

/**
 * Generate embedding for a query string (currently disabled due to quota)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  // For now, return empty array since embeddings are disabled
  console.log('⚠️  Embeddings disabled due to OpenAI quota. Using text search.')
  return []
}

/**
 * Split markdown content into logical chunks
 */
function splitMarkdownIntoChunks(markdownContent: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = []
  
  // Split by headers (##, ###, etc.)
  const sections = markdownContent.split(/(?=^##[^#])/gm)
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim()
    if (!section) continue
    
    // Extract the main heading
    const headingMatch = section.match(/^#+\s*(.+)/m)
    const heading = headingMatch ? headingMatch[1] : `Section ${i + 1}`
    
    // Split large sections into smaller chunks if needed
    const maxChunkSize = 1000 // characters
    
    if (section.length <= maxChunkSize) {
      chunks.push({
        id: `chunk_${i}`,
        content: section,
        heading: heading,
      })
    } else {
      // Split large sections by paragraphs
      const paragraphs = section.split(/\n\s*\n/)
      let currentChunk = ''
      let chunkIndex = 0
      
      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
          chunks.push({
            id: `chunk_${i}_${chunkIndex}`,
            content: currentChunk.trim(),
            heading: heading,
          })
          currentChunk = paragraph
          chunkIndex++
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph
        }
      }
      
      // Add the last chunk if it has content
      if (currentChunk.trim()) {
        chunks.push({
          id: `chunk_${i}_${chunkIndex}`,
          content: currentChunk.trim(),
          heading: heading,
        })
      }
    }
  }
  
  return chunks
} 