/**
 * AI Prompts for Panel Recommendation
 * 
 * CALLER: recommend-panels edge function
 * LOCATION: /supabase/functions/recommend-panels/index.ts
 * PURPOSE: Generate AI-powered recommendations for feature analysis panels based on researcher's hypothesis
 * 
 * FLOW:
 * 1. User enters research hypothesis in NewAnalysis page (src/pages/NewAnalysis.tsx)
 * 2. Component calls usePanelRecommendations hook (src/hooks/usePanelRecommendations.ts)
 * 3. Hook invokes 'recommend-panels' Supabase Edge Function
 * 4. Edge function uses these prompts to query AI model (google/gemini-2.5-flash)
 * 5. AI returns relevance scores and explanations for each available panel
 * 6. Results displayed to user with panel recommendations
 */

import type { Panel } from "../types/panels.ts";

/**
 * Builds the system prompt for the panel recommendation AI
 * 
 * @param panels - Array of available analysis panels with their metadata
 * @returns System prompt string instructing the AI on its role and available options
 */
export function buildSystemPrompt(panels: Panel[]): string {
  return `You are a bioinformatics expert assistant helping researchers choose sequence feature analysis panels.

Available panels for analysis:
${panels.map(p => `- ${p.name} (${p.id}): ${p.description}. Features: ${p.features.join(', ')}. Related to: ${p.keywords.join(', ')}`).join('\n')}

Your task is to analyze the researcher's hypothesis and score ALL panels by relevance. You MUST return all ${panels.length} panels with their scores and specific explanations.`;
}

/**
 * Builds the user prompt for the panel recommendation AI
 * 
 * @param hypothesis - The research hypothesis to analyze
 * @param panels - Array of available panels (for validation)
 * @param sequenceCount - Optional number of sequences in dataset
 * @param minLength - Optional minimum sequence length
 * @param maxLength - Optional maximum sequence length
 * @returns User prompt string with hypothesis and instructions
 */
export function buildUserPrompt(
  hypothesis: string,
  panels: Panel[],
  sequenceCount?: number,
  minLength?: number,
  maxLength?: number
): string {
  const datasetInfo = sequenceCount ? `\nDataset: ${sequenceCount} sequences` : '';
  const lengthInfo = minLength && maxLength ? `\nLength range: ${minLength}-${maxLength} nt` : '';
  
  return `Based on this research hypothesis, score ALL available panels by relevance:

Hypothesis: "${hypothesis}"${datasetInfo}${lengthInfo}

IMPORTANT: You must return ALL ${panels.length} panels (${panels.map(p => p.id).join(', ')}), each with:
1. A relevance score from 1-10 based on how relevant it is to this SPECIFIC hypothesis
2. A specific explanation connecting the panel's features to the biological question

Even if a panel seems less relevant, include it with a lower score and explain why it's less applicable.`;
}
