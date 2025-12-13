# AI Agent Prompts Documentation

## Overview

All AI agent prompts in Gene Explorer AI are now consolidated in a single directory for better maintainability, transparency, and version control.

## Location

📁 **Centralized Prompts Directory**: `/supabase/functions/prompts/`

This directory contains:
- Individual prompt files for each AI agent
- Builder functions that construct prompts dynamically
- Comprehensive documentation for each prompt's purpose and usage
- A README explaining the organization and best practices

## AI Agents in Gene Explorer AI

### 1. Panel Recommendation Agent

**Location**: `/supabase/functions/prompts/recommend-panels-prompts.ts`

**Purpose**: Provides AI-powered recommendations for which feature analysis panels are most relevant to a researcher's hypothesis.

**Model**: `google/gemini-2.5-flash` (via Lovable AI Gateway)

**Call Flow**:
```
User (NewAnalysis.tsx)
    ↓ enters hypothesis
Hook (usePanelRecommendations.ts)
    ↓ getRecommendations()
Edge Function (recommend-panels/index.ts)
    ↓ loads prompts from /prompts/recommend-panels-prompts.ts
    ↓ buildSystemPrompt() + buildUserPrompt()
AI Model (gemini-2.5-flash)
    ↓ analyzes hypothesis
    ↓ scores all panels (1-10)
Results → User
```

**Files Involved**:
1. **Prompt Definition**: `/supabase/functions/prompts/recommend-panels-prompts.ts`
   - `buildSystemPrompt()`: Instructs AI on its role as bioinformatics expert
   - `buildUserPrompt()`: Provides hypothesis and dataset metadata to analyze

2. **Edge Function**: `/supabase/functions/recommend-panels/index.ts`
   - Imports and uses prompt builders
   - Handles API call to AI model
   - Returns enriched recommendations

3. **React Hook**: `/src/hooks/usePanelRecommendations.ts`
   - Provides `getRecommendations()` function to components
   - Manages loading state and error handling
   - Invokes Supabase edge function

4. **UI Component**: `/src/pages/NewAnalysis.tsx`
   - User interface for entering hypothesis
   - Displays AI recommendations with explanations
   - Auto-selects high-scoring panels (score >= 7)

## Documentation Standards

Every AI agent call includes:

### 1. Prompt File Documentation
- **CALLER**: Which function/service calls this prompt
- **LOCATION**: File path of the caller
- **PURPOSE**: What the AI interaction accomplishes
- **FLOW**: Step-by-step user action to AI response

### 2. Edge Function Documentation
- **PURPOSE**: High-level goal of the function
- **CALLED BY**: Which hooks/components invoke it
- **USED IN**: Which pages/features use this
- **FLOW**: Complete request/response cycle
- **AI MODEL**: Specific model being used
- **PROMPTS**: Link to prompt file location

### 3. Hook Documentation
- **PURPOSE**: What the hook provides
- **CALLS**: Which edge functions it invokes
- **USED IN**: Which components use this hook
- **FLOW**: Complete interaction flow

### 4. Component Documentation
- Inline comments at AI call points
- Clear explanation of when/why AI is invoked
- Description of how results are used

## Benefits of Centralization

### 🔍 Transparency
- All AI interactions are clearly documented
- Easy to audit which models are being used
- Clear understanding of data flow

### 🔧 Maintainability
- Prompts can be updated without changing business logic
- Easy to experiment with prompt variations
- Reduced code duplication

### 📝 Version Control
- Prompt changes tracked independently
- Clear commit history of prompt evolution
- Easy to review and revert prompt modifications

### 🧪 Testing
- Prompts can be tested independently
- Easier to validate prompt behavior
- Clear separation of concerns

## Adding New AI Agents

When adding a new AI agent to the application:

1. **Create Prompt File**: `/supabase/functions/prompts/[feature]-prompts.ts`
   ```typescript
   /**
    * CALLER: [function name]
    * LOCATION: [file path]
    * PURPOSE: [description]
    * FLOW: [step by step]
    */
   
   export function buildSystemPrompt(...): string { ... }
   export function buildUserPrompt(...): string { ... }
   ```

2. **Create/Update Edge Function**: Use prompt builders
   ```typescript
   import { buildSystemPrompt, buildUserPrompt } from "../prompts/[feature]-prompts.ts";
   ```

3. **Add Documentation**: Update this file and prompt README

4. **Document Call Sites**: Add inline comments where AI is invoked

## Security Considerations

- **API Keys**: Never hardcode API keys in prompts
- **User Data**: Be mindful of PII in prompts
- **Rate Limiting**: Document any rate limits
- **Error Handling**: Always handle AI failures gracefully

## Monitoring

To track AI usage:
1. Check Supabase Edge Function logs
2. Monitor AI gateway usage in Lovable dashboard
3. Review error rates in application monitoring

## See Also

- [Prompts Directory README](/supabase/functions/prompts/README.md)
- [Architecture Documentation](/docs/ARCHITECTURE.md)
- [API Specification](/docs/python-api-spec.md)
