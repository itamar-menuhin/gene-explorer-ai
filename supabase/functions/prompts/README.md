# Agent Prompts Directory

This directory contains all AI agent prompts used in the Gene Explorer AI application.

## Purpose

Centralizing prompts in a single location provides:
- **Maintainability**: Easy to update prompts without touching business logic
- **Transparency**: Clear documentation of all AI interactions
- **Consistency**: Standardized prompt structure across the application
- **Version Control**: Track prompt changes independently from code changes

## Organization

Each prompt file is named after the edge function or feature it supports and includes:
1. **Documentation Header**: Explains who calls it, where, and why
2. **Type Definitions**: TypeScript interfaces for type safety
3. **Prompt Builder Functions**: Functions that construct prompts from parameters
4. **Inline Comments**: Detailed explanation of prompt structure and intent

## Available Prompts

### recommend-panels-prompts.ts

**Purpose**: Generate AI-powered recommendations for feature analysis panels based on researcher's hypothesis

**Used By**: 
- Edge Function: `/supabase/functions/recommend-panels/index.ts`
- Hook: `src/hooks/usePanelRecommendations.ts`
- Page: `src/pages/NewAnalysis.tsx`

**AI Model**: `google/gemini-2.5-flash`

**Flow**:
1. User enters research hypothesis in the UI
2. Frontend calls the hook which invokes the edge function
3. Edge function loads prompts from this file
4. AI analyzes hypothesis and scores all available panels (1-10)
5. Results returned with relevance explanations

**Functions**:
- `buildSystemPrompt(panels)`: Creates system-level instructions for the AI
- `buildUserPrompt(hypothesis, panels, ...)`: Creates user query with hypothesis and dataset info

## Adding New Prompts

When adding a new AI agent prompt:

1. **Create a new file**: `[feature-name]-prompts.ts`
2. **Add documentation header** explaining:
   - Purpose of the AI interaction
   - Who calls it (function/component)
   - Where it's located (file paths)
   - Complete flow from user action to AI response
3. **Export builder functions**: Never hardcode prompts inline
4. **Document the AI model**: Specify which model is used
5. **Update this README**: Add entry to "Available Prompts" section
6. **Update calling code**: Import from this directory and add documentation

## Example Template

```typescript
/**
 * AI Prompts for [Feature Name]
 * 
 * CALLER: [edge function or service name]
 * LOCATION: [file path]
 * PURPOSE: [what this AI interaction accomplishes]
 * 
 * FLOW:
 * 1. [step 1]
 * 2. [step 2]
 * ...
 */

/**
 * Builds the system prompt
 * @param param1 - Description
 * @returns System prompt string
 */
export function buildSystemPrompt(param1: Type): string {
  return `Your AI system prompt here`;
}

/**
 * Builds the user prompt
 * @param param1 - Description
 * @returns User prompt string
 */
export function buildUserPrompt(param1: Type): string {
  return `Your AI user prompt here`;
}
```

## Best Practices

1. **Keep prompts DRY**: Use functions to build prompts dynamically
2. **Document thoroughly**: Explain the purpose and flow
3. **Use TypeScript**: Type all parameters and return values
4. **Test prompts**: Validate that prompts produce expected results
5. **Version control**: Commit prompt changes with clear commit messages
6. **Review carefully**: Prompt changes can significantly affect AI behavior
