/**
 * Shared Type Definitions for Panel System
 * 
 * This file contains shared types used across panel-related functions
 * to ensure consistency and avoid duplication.
 */

/**
 * Panel interface representing a feature analysis panel
 * 
 * Used by:
 * - /supabase/functions/recommend-panels/index.ts - Main panel data
 * - /supabase/functions/prompts/recommend-panels-prompts.ts - Prompt building
 */
export interface Panel {
  id: string;
  name: string;
  description: string;
  features: string[];
  keywords: string[];
}
