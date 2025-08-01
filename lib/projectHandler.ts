import fs from 'fs'
import path from 'path'

// Simple Levenshtein distance implementation
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }
  return matrix[a.length][b.length]
}

export interface ProjectTrigger {
  name: string
  tags: string[]
  trigger_phrases: string[]
  response: {
    text: string
    confidence_threshold: number
    follow_up_questions: string[]
  }
}

export interface ProjectTriggers {
  project_triggers: ProjectTrigger[]
}

export interface ProjectMetadata {
  id: string
  title: string
  tags: string[]
  link: string
  source: string
  category: string
  client_type: string
  key_techniques: string[]
}

export interface ProjectsIndex {
  projects: ProjectMetadata[]
  categories: Record<string, string>
  client_types: Record<string, string>
}

/**
 * Load project triggers from JSON file
 */
export function loadProjectTriggers(): ProjectTriggers {
  try {
    const triggersPath = path.join(process.cwd(), 'data', 'project-triggers.json')
    const triggersData = fs.readFileSync(triggersPath, 'utf-8')
    return JSON.parse(triggersData) as ProjectTriggers
  } catch (error) {
    console.error('❌ Error loading project triggers:', error)
    return { project_triggers: [] }
  }
}

/**
 * Load projects index from JSON file
 */
export function loadProjectsIndex(): ProjectsIndex {
  try {
    const indexPath = path.join(process.cwd(), 'data', 'projects-index.json')
    const indexData = fs.readFileSync(indexPath, 'utf-8')
    return JSON.parse(indexData) as ProjectsIndex
  } catch (error) {
    console.error('❌ Error loading projects index:', error)
    return { projects: [], categories: {}, client_types: {} }
  }
}

/**
 * Check if a query matches any project triggers
 */
export function checkProjectTriggers(query: string): ProjectTrigger | null {
  const triggers = loadProjectTriggers()
  const queryLower = query.toLowerCase()
  let bestFuzzyMatch: { trigger: ProjectTrigger, distance: number } | null = null
  const FUZZY_THRESHOLD = 6 // Allow up to 6 edits for fuzzy match

  for (const trigger of triggers.project_triggers) {
    // Check trigger phrases (exact or substring)
    for (const phrase of trigger.trigger_phrases) {
      const phraseLower = phrase.toLowerCase()
      if (queryLower.includes(phraseLower)) {
        return trigger
      }
      // Fuzzy match: check Levenshtein distance
      const dist = levenshtein(queryLower, phraseLower)
      if (dist < FUZZY_THRESHOLD && (!bestFuzzyMatch || dist < bestFuzzyMatch.distance)) {
        bestFuzzyMatch = { trigger, distance: dist }
      }
    }
    // Check tags (exact or substring)
    for (const tag of trigger.tags) {
      if (queryLower.includes(tag.toLowerCase())) {
        return trigger
      }
    }
  }
  // If no exact match, return best fuzzy match if within threshold
  if (bestFuzzyMatch) {
    return bestFuzzyMatch.trigger
  }
  return null
}

/**
 * Get project metadata by ID
 */
export function getProjectMetadata(projectId: string): ProjectMetadata | null {
  const index = loadProjectsIndex()
  return index.projects.find(project => project.id === projectId) || null
}

/**
 * Get all projects by category
 */
export function getProjectsByCategory(category: string): ProjectMetadata[] {
  const index = loadProjectsIndex()
  return index.projects.filter(project => project.category === category)
}

/**
 * Get all projects by client type
 */
export function getProjectsByClientType(clientType: string): ProjectMetadata[] {
  const index = loadProjectsIndex()
  return index.projects.filter(project => project.client_type === clientType)
}

/**
 * Search projects by technique or keyword
 */
export function searchProjectsByTechnique(technique: string): ProjectMetadata[] {
  const index = loadProjectsIndex()
  const techniqueLower = technique.toLowerCase()
  
  return index.projects.filter(project => 
    project.key_techniques.some(tech => 
      tech.toLowerCase().includes(techniqueLower)
    ) ||
    project.tags.some(tag => 
      tag.toLowerCase().includes(techniqueLower)
    )
  )
} 