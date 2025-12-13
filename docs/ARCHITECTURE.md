# Gene Explorer AI - Complete Architecture Guide

> **Last Updated:** December 2024  
> **Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Feature Engineering](#feature-engineering)
6. [Data Flow](#data-flow)
7. [What's Working vs. Scaffolding](#whats-working-vs-scaffolding)
8. [Easy Fixes](#easy-fixes)
9. [Python Backend Integration Guide](#python-backend-integration-guide)

---

## Overview

Gene Explorer AI is a full-stack bioinformatics application for analyzing genetic sequences. It allows researchers to upload DNA/RNA sequences and extract various features (GC content, codon usage bias, chemical properties, etc.) with an intuitive, AI-guided interface.

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (UI components)
- React Query (state management)
- React Router (routing)
- Supabase JS Client (authentication + database)

**Backend:**
- FastAPI (Python 3.11+)
- Supabase Edge Functions (Deno runtime)
- PostgreSQL (via Supabase)
- BioPython (sequence analysis)
- Pandas, NumPy (data processing)

**Infrastructure:**
- Lovable.dev (frontend hosting)
- Supabase (auth, database, edge functions)
- Python backend deployable to: Railway, Render, Docker

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                    (React + TypeScript)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │    Hooks     │      │
│  │              │  │              │  │              │      │
│  │ - Index      │  │ - Sequence   │  │ - Feature    │      │
│  │ - Dashboard  │  │   Upload     │  │   Extraction │      │
│  │ - Analysis   │  │ - Panel      │  │ - Panel      │      │
│  │   Playground │  │   Selector   │  │   Recommend  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Supabase Client Integration                 │  │
│  │  - Authentication (JWT)                               │  │
│  │  - Database queries (analyses, templates)             │  │
│  │  - Edge Function invocations                          │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Supabase Functions Invoke
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                 SUPABASE PLATFORM                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           PostgreSQL Database                       │    │
│  │  Tables:                                            │    │
│  │  - profiles (user data)                             │    │
│  │  - analyses (saved analyses with results)           │    │
│  │  - templates (reusable panel configurations)        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Edge Functions (Deno)                     │    │
│  │                                                      │    │
│  │  1. extract-features                                │    │
│  │     - Proxies to Python backend OR                  │    │
│  │     - Local basic computation fallback              │    │
│  │                                                      │    │
│  │  2. recommend-panels                                │    │
│  │     - AI-powered panel recommendations              │    │
│  └───────────────────────┬────────────────────────────┘    │
└────────────────────────────┼───────────────────────────────┘
                             │
                             │ HTTP POST (if PYTHON_BACKEND_URL set)
                             │
┌────────────────────────────▼───────────────────────────────┐
│              PYTHON BACKEND (FastAPI)                       │
│              Optional but Recommended                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              FastAPI Application                    │    │
│  │                                                      │    │
│  │  Endpoints:                                         │    │
│  │  - POST /extract-features                           │    │
│  │  - GET /health                                      │    │
│  │  - GET /panels                                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Feature Engineering Modules                 │    │
│  │                                                      │    │
│  │  - sequence.py (GC content, length, composition)    │    │
│  │  - chemical.py (molecular weight, properties)       │    │
│  │  - cub.py (codon usage bias: ENC, RCBS, RSCU)      │    │
│  │  - disorder.py (protein disorder prediction)        │    │
│  │  - dna_structure.py (DNA structure features)        │    │
│  │  - biotite_structure_features.py (3D structure)     │    │
│  │  - jaspar_motif_features.py (motif search)          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── analysis/        # Analysis-specific components
│   │   ├── ComputationProgress.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── FeaturePanelSelector.tsx
│   │   ├── LoadTemplateDialog.tsx
│   │   ├── SaveTemplateDialog.tsx
│   │   ├── ShareAnalysisDialog.tsx
│   │   ├── StartWindowConfigPanel.tsx
│   │   └── EndWindowConfigPanel.tsx
│   ├── layout/          # Layout components
│   │   └── AppLayout.tsx
│   ├── sequence/        # Sequence upload/handling
│   │   └── SequenceUpload.tsx
│   └── ui/              # shadcn/ui base components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (30+ UI primitives)
│
├── pages/               # Route pages
│   ├── Index.tsx        # Landing page
│   ├── Auth.tsx         # Login/signup
│   ├── Dashboard.tsx    # User dashboard (saved analyses)
│   ├── NewAnalysis.tsx  # Create new analysis (guided/advanced)
│   ├── AnalysisPlayground.tsx  # View results & visualizations
│   ├── SharedAnalysis.tsx      # Public shared analysis view
│   └── Profile.tsx      # User profile settings
│
├── hooks/               # Custom React hooks
│   ├── useFeatureExtraction.ts  # Main feature extraction logic
│   ├── usePanelRecommendations.ts  # AI panel recommendations
│   ├── useTemplates.ts   # Template CRUD operations
│   └── useComputationProgress.ts
│
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state
│
├── integrations/        # External service integrations
│   └── supabase/
│       ├── client.ts    # Supabase client setup
│       └── types.ts     # Auto-generated DB types
│
├── lib/                 # Utility libraries
│   ├── sequenceParser.ts   # Parse FASTA/GenBank files
│   ├── csvExport.ts        # Export results to CSV
│   └── utils.ts            # General utilities
│
├── types/               # TypeScript type definitions
│   └── featureExtraction.ts  # Feature extraction types
│
├── App.tsx              # Root app component
└── main.tsx             # Entry point
```

### Key Frontend Components

#### 1. **Pages**

**Index.tsx** - Landing page
- Hero section with product overview
- Feature highlights
- Call-to-action buttons

**Dashboard.tsx** - User dashboard
- Lists saved analyses
- Provides quick actions (new analysis, view results)
- Shows analysis metadata (date, sequences count, panels used)

**NewAnalysis.tsx** - Analysis creation wizard
- **Two modes**: Guided (hypothesis-driven) vs. Advanced (direct upload)
- **Guided flow**:
  1. Enter hypothesis → AI recommends panels
  2. Upload sequences (FASTA/GenBank/plain text)
  3. Select/configure panels
  4. Configure windowing options
  5. Submit for computation
- **Advanced flow**: Skip hypothesis, go straight to upload
- Template support (save/load panel configurations)

**AnalysisPlayground.tsx** - Results visualization
- Interactive charts (line charts, area charts, distributions)
- Feature selection dropdown
- Sequence filtering
- Export options (CSV, JSON, images)
- Share analysis publicly

#### 2. **Hooks**

**useFeatureExtraction.ts** - Core feature extraction logic
```typescript
interface UseFeatureExtractionOptions {
  onProgress?: (progress: number, message: string) => void;
  onPanelComplete?: (panelId: string) => void;
}

// Returns:
// - extractFeatures(): async function to start extraction
// - isLoading, progress, results, error: state
// - stopExtraction(): abort in-progress extraction
// - reset(): clear state
```

**usePanelRecommendations.ts** - AI-powered panel suggestions
- Takes user hypothesis as input
- Calls `recommend-panels` edge function
- Returns ranked panel recommendations with relevance scores

**useTemplates.ts** - Template management
- CRUD operations for templates (saved panel configurations)
- Stored in Supabase `templates` table
- Allows reusing panel configurations across analyses

#### 3. **Components**

**SequenceUpload.tsx** - Multi-format sequence parser
- Supports FASTA, GenBank, plain text
- Drag-and-drop or file picker
- Validates sequences
- Extracts metadata (ID, name, annotations)

**FeaturePanelSelector.tsx** - Panel selection UI
- Displays available feature panels
- Shows cost/time estimates
- Toggle panels on/off
- Configure panel-specific parameters

**ComputationProgress.tsx** - Real-time progress tracking
- Shows current panel being computed
- Progress bar with percentage
- Estimated time remaining
- Cancel button

---

## Backend Architecture

### Supabase Edge Functions

Located in `supabase/functions/`:

#### **extract-features/index.ts**

This is the **primary API gateway** for feature extraction.

**Flow:**
1. Receives request from frontend via `supabase.functions.invoke('extract-features', ...)`
2. Checks if `PYTHON_BACKEND_URL` environment variable is set
3. **If set**: Proxies request to Python FastAPI backend
4. **If not set**: Falls back to local JavaScript computation (basic features only)
5. Returns results to frontend

**Local Fallback Features:**
- Sequence composition (GC content, nucleotide counts)
- Basic molecular weight estimation
- Simple melting temperature calculation (Wallace rule)
- Works for both global and windowed modes

**Why this architecture?**
- **Flexibility**: Works without Python backend for demos
- **Scalability**: Python backend handles complex features
- **Simplicity**: Frontend doesn't need to know where computation happens

#### **recommend-panels/index.ts**

AI-powered panel recommendation engine (not shown in files, likely exists or is planned).

### Python FastAPI Backend

Located in `backend/`:

#### **main.py** - FastAPI Application

**Endpoints:**

1. **POST /extract-features**
   - Main feature extraction endpoint
   - Accepts sequences, panel configuration, window config
   - Returns computed features
   - Supports both global and windowed analysis

2. **GET /health**
   - Health check endpoint
   - Returns `{"status": "healthy", "version": "1.0.0"}`

3. **GET /panels**
   - Lists available feature panels
   - Returns panel metadata (ID, name, features, description)

**Feature Extractors:**

```python
# Sequence composition
class SequenceFeatureExtractor:
    def extract(sequence: str) -> Dict[str, Any]:
        # Returns: gc_content, at_content, length, nucleotide counts

# Chemical properties (amino acids)
class ChemicalFeatureExtractor(ChemicalFeaturesMixin):
    def extract(amino_acid_sequence: str) -> Dict[str, Any]:
        # Returns: isoelectric_point, molecular_weight, 
        #          instability_index, GRAVY, aromaticity

# Codon usage bias
class CUBFeatureExtractor(CUBFeaturesMixin):
    def extract(nucleotide_sequence: str) -> Dict[str, Any]:
        # Returns: ENC, RCBS, RSCU, CPB, DCBS
```

**Sequence Type Detection:**
```python
def detect_sequence_type(sequence: str) -> str:
    # Returns 'nucleotide' or 'amino_acid'
    # Used to determine which features can be computed
```

**Windowed Analysis:**
```python
def extract_window_features(
    sequence: str,
    seq_id: str,
    panels: PanelsConfig,
    window_size: int,
    step_size: int
) -> List[FeatureResult]:
    # Slides window across sequence
    # Computes features for each window
    # Returns list of results with windowStart/windowEnd
```

#### **requirements.txt** - Python Dependencies

```
fastapi>=0.104.0         # Web framework
uvicorn>=0.24.0          # ASGI server
pydantic>=2.0.0          # Data validation
biopython>=1.81          # Bioinformatics toolkit
pandas>=2.0.0            # Data manipulation
numpy>=1.24.0            # Numerical computing
codonbias>=1.0.0         # Codon usage calculations
pytest>=7.4.0            # Testing
httpx>=0.25.0            # HTTP client for tests
```

#### **Dockerfile** - Containerization

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy feature engineering modules and backend code
COPY ../feature_engineering /app/feature_engineering
COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

#### **docker-compose.yml** - Local Development

```yaml
services:
  feature-api:
    build:
      context: ..
      dockerfile: backend/Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - ../feature_engineering:/app/feature_engineering:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

---

## Feature Engineering

Located in `feature_engineering/` directory. This is a comprehensive Python package for biological sequence analysis.

### Core Modules

#### **sequence.py** - Nucleotide and Amino Acid Sequences

```python
class NucleotideSequence:
    """
    Represents a DNA/RNA sequence.
    """
    def __init__(self, nucleotide_sequence: str, reference_set=None)
    def _translate_to_amino_acids(self) -> AminoAcidSequence
    def set_reference_set(self, reference_set)

class AminoAcidSequence:
    """
    Represents a protein sequence.
    """
    def __init__(self, amino_acid_sequence: str)
```

#### **chemical.py** - Chemical Properties

```python
class ChemicalFeaturesMixin:
    """
    Computes chemical/physical properties of amino acid sequences.
    
    Features:
    - Isoelectric point (pI)
    - Instability index
    - Molecular weight
    - GRAVY (Grand Average of Hydropathy)
    - Aromaticity index
    - Secondary structure propensities
    """
    def _extract_features_single(self, amino_acid_sequence: str) -> Dict
```

Uses BioPython's `ProteinAnalysis` class under the hood.

#### **cub.py** - Codon Usage Bias

```python
class CUBFeaturesMixin:
    """
    Calculates codon usage bias metrics.
    
    Methods:
    - calc_ENC(sequence) - Effective Number of Codons
    - calc_RCBS(sequence) - Relative Codon Bias Strength
    - calc_RSCU(sequence) - Relative Synonymous Codon Usage
    - calc_CPB(sequence) - Codon Pair Bias
    - calc_DCBS(sequence) - Distance from Codon Bias Set
    - calc_CAI(sequence, reference_set) - Codon Adaptation Index
    - calc_FOP(sequence, reference_set) - Frequency of Optimal Codons
    """
```

**Important**: CAI and FOP require a reference set (codon usage table for a specific organism).

#### **disorder.py** - Protein Disorder Prediction

```python
class DisorderFeaturesMixin:
    """
    Predicts intrinsically disordered regions in proteins.
    
    Uses IUPred2 algorithm.
    """
```

Located in `feature_engineering/disorder/` with C implementations.

#### **biotite_structure_features.py** - 3D Structure Analysis

Analyzes protein 3D structures using the Biotite library.

Features:
- Secondary structure content (helix, sheet, coil)
- Solvent accessibility
- B-factors (flexibility)

#### **jaspar_motif_features.py** - Motif Analysis

Searches for transcription factor binding sites and other motifs using JASPAR database.

#### **dna_structure.py** / **dna_structure_deep.py**

DNA structural properties (twist, roll, slide, etc.) using various prediction models.

### Support Modules

- **batch.py** - Batch processing utilities
- **windowed.py** - Sliding window analysis
- **reference_loader.py** - Loads reference codon usage tables
- **universal_feature_mixin.py** - Base class for feature extractors
- **sequence_features.py** - High-level sequence feature API
- **sorf.py** - Small ORF detection
- **hmmer_features.py** - HMMER-based domain/motif search
- **chimera_ars.py** - Autonomous replication sequence analysis

---

## Data Flow

### 1. User Creates New Analysis

```
User (NewAnalysis.tsx)
  ↓
  1. Enters hypothesis (optional)
     → usePanelRecommendations.ts
       → Supabase Edge Function: recommend-panels
         → Returns recommended panels
  ↓
  2. Uploads sequences
     → SequenceUpload.tsx → sequenceParser.ts
       → Parses FASTA/GenBank
       → Extracts: id, sequence, name, annotations
  ↓
  3. Selects panels + configures windows
     → FeaturePanelSelector.tsx
  ↓
  4. Clicks "Compute Features"
     → useFeatureExtraction.ts.extractFeatures()
```

### 2. Feature Extraction Request

```
Frontend: useFeatureExtraction.ts
  ↓
  supabase.functions.invoke('extract-features', {
    body: {
      sequences: [{ id, sequence, name, annotations }],
      panels: { 
        sequence: { enabled: true },
        chemical: { enabled: true },
        codonUsage: { enabled: true }
      },
      window: { enabled: false, windowSize: 100, stepSize: 10 },
      referenceSet: "e_coli"
    }
  })
  ↓
Supabase Edge Function: extract-features
  ↓
  Check: PYTHON_BACKEND_URL set?
  ├─ YES → Forward to Python Backend
  │   ↓
  │   POST https://your-python-backend.com/extract-features
  │   ↓
  │   Python FastAPI Backend
  │   ├─ Validate request with Pydantic
  │   ├─ Detect sequence type (nucleotide/amino acid)
  │   ├─ For each sequence:
  │   │   ├─ If panels.sequence: SequenceFeatureExtractor
  │   │   ├─ If panels.chemical: ChemicalFeatureExtractor
  │   │   └─ If panels.codonUsage: CUBFeatureExtractor
  │   ├─ Collect results
  │   └─ Return FeatureResponse
  │   ↓
  │   Edge Function receives response
  │   └─ Forward to frontend
  │
  └─ NO → Local computation (basic features only)
      ├─ computeFeaturesLocally()
      └─ Return basic results
  ↓
Frontend: useFeatureExtraction.ts receives results
  ↓
  setState({ results: FeatureExtractionResponse })
  ↓
  Save to Supabase: analyses table
```

### 3. Viewing Results

```
User navigates to /analysis/:id
  ↓
AnalysisPlayground.tsx
  ↓
  1. Fetch analysis from Supabase
     SELECT * FROM analyses WHERE id = :id
  ↓
  2. Load results (stored as JSON)
  ↓
  3. Display visualizations
     ├─ Feature selection dropdown
     ├─ Sequence filtering
     ├─ Line charts (position vs. feature value)
     ├─ Distribution histograms
     └─ Statistical summaries
  ↓
  4. Export options
     ├─ CSV (flattenFeatureResults())
     ├─ JSON (raw results)
     └─ Images (chart screenshots)
```

---

## What's Working vs. Scaffolding

### ✅ **Fully Working**

**Frontend:**
- ✅ Authentication (Supabase Auth with JWT)
- ✅ User dashboard (list saved analyses)
- ✅ Sequence upload (FASTA/GenBank parsing)
- ✅ Template management (save/load panel configs)
- ✅ Public sharing (share analyses via token)
- ✅ UI components (shadcn/ui fully integrated)
- ✅ Routing (React Router working)
- ✅ State management (React Query working)

**Backend (Edge Functions):**
- ✅ extract-features edge function (proxy + local fallback)
- ✅ Local computation fallback (basic sequence/chemical features)
- ✅ CORS handling
- ✅ Error handling and logging

**Backend (Python FastAPI):**
- ✅ FastAPI server structure
- ✅ /health endpoint
- ✅ /panels endpoint
- ✅ /extract-features endpoint
- ✅ Basic feature extractors (sequence, chemical, CUB)
- ✅ Windowed analysis mode
- ✅ Pydantic validation
- ✅ CORS middleware

**Feature Engineering:**
- ✅ Sequence composition features
- ✅ Chemical properties (BioPython-based)
- ✅ Codon usage bias (ENC, RCBS, RSCU, CPB, DCBS)
- ✅ Sequence translation (DNA → protein)
- ✅ Core library structure

**Database:**
- ✅ PostgreSQL tables (profiles, analyses, templates)
- ✅ Row-level security (RLS) policies
- ✅ Share token functionality

**Testing:**
- ✅ Backend test structure (pytest)
- ✅ Test client setup (FastAPI TestClient)
- ✅ Basic API tests exist

### ⚠️ **Partially Working (Scaffolding)**

**Frontend:**
- ⚠️ AnalysisPlayground.tsx - Uses **mock data** for visualizations
  - Charts render correctly
  - But data is generated by `generateMockFeatureData()` instead of real API results
  - **Fix needed**: Connect to actual analysis results from database

- ⚠️ NewAnalysis.tsx - Uses **mock panel data**
  - Panel list is hardcoded (`mockPanels` array)
  - **Fix needed**: Fetch panels from `/panels` endpoint or define in config

- ⚠️ AI Panel Recommendations
  - `usePanelRecommendations.ts` references `recommend-panels` edge function
  - **This edge function may not be implemented yet**
  - Currently returns mock recommendations
  - **Fix needed**: Implement `recommend-panels` edge function (could use OpenAI API)

**Backend (Python):**
- ⚠️ Advanced feature panels not fully integrated:
  - `disorder` panel - DisorderFeaturesMixin exists but not wired to main.py
  - `structure` panel - Not implemented in main.py
  - `motif` panel - jaspar_motif_features.py exists but not wired
  - **Fix needed**: Add extractors for these panels in main.py

- ⚠️ CAI/FOP calculations need reference sets
  - Reference loader exists (`reference_loader.py`)
  - But not integrated into main.py
  - **Fix needed**: Load reference sets on startup, pass to CUBFeatureExtractor

**Database:**
- ⚠️ Analysis results storage
  - `analyses` table exists
  - But storing large JSON results may hit size limits
  - **Consider**: Store results in object storage (Supabase Storage) instead

**Deployment:**
- ⚠️ Python backend not deployed yet
  - Dockerfile works
  - docker-compose.yml works locally
  - **But no production deployment configured**
  - **Fix needed**: Deploy to Railway/Render and set PYTHON_BACKEND_URL

### ❌ **Not Implemented**

- ❌ Real-time computation progress updates (websockets/streaming)
  - Currently progress is simulated on frontend
  - **Future enhancement**: Use websockets for real progress

- ❌ Batch job processing
  - Large sequence sets (>100 sequences) may timeout
  - **Future enhancement**: Queue system (Celery, Bull)

- ❌ Result caching
  - Same sequences + panels recomputed every time
  - **Future enhancement**: Cache results by hash

- ❌ User quotas/rate limiting
  - Anyone can submit unlimited requests
  - **Future enhancement**: Rate limiting middleware

- ❌ Advanced visualizations
  - 3D protein structure viewer
  - Interactive sequence alignment viewer
  - **Future enhancement**: Integrate Mol* or NGL viewer

---

## Easy Fixes

Here are issues that can be fixed with minimal effort:

### 1. **Connect AnalysisPlayground to Real Data** ✅ COMPLETED

**Problem**: AnalysisPlayground uses mock data

**Fix**: Implemented in src/pages/AnalysisPlayground.tsx
- Added state for realAnalysisData and isLoadingAnalysis
- Added useEffect to fetch analysis from Supabase by ID
- Updated featureData useMemo to use real data when available
- Populates analysis name, hypothesis, share token, and status from database
- Falls back to mock data if real data is not available

### 2. **Fix Panel List in NewAnalysis** ✅ COMPLETED

**Problem**: Panel list is hardcoded

**Fix**: Implemented in src/pages/NewAnalysis.tsx
- Removed hardcoded mockPanels array
- Added convertToDisplayPanels() function that converts FEATURE_PANELS to display format
- Now uses availablePanels derived from the FEATURE_PANELS constant
- More maintainable and consistent with the backend panel definitions

### 3. **Fix Python Backend Port Consistency** ✅ COMPLETED

**Problem**: Dockerfile and docker-compose used port 8000, but main.py uses port 8080

**Fix**: Updated all files to consistently use port 8080:
- Dockerfile now uses PORT environment variable with 8080 default
- docker-compose.yml updated to use 8080
- Supports Railway/Render's dynamic $PORT variable
- All documentation updated to reference correct port

### 4. **Add Missing Environment Variable Documentation** ✅ COMPLETED

**Problem**: README doesn't clearly document environment variables

**Fix**: Created `.env.example` file in repository root with all required environment variables documented.

The file includes:
- Supabase configuration (required)
- Python backend URL (optional)
- Example production URLs
- Clear instructions for both local and production environments

### 5. **Improve Error Messages** ✅ COMPLETED

**Problem**: Generic error messages don't help users debug

**Fix**: Implemented in src/hooks/useFeatureExtraction.ts
- Enhanced error handling in the catch block
- Provides specific messages for timeout errors
- Provides specific messages for backend configuration errors
- Provides specific messages for sequence validation errors
- Improves user experience with actionable error information

### 6. **Add Loading States** ✅ COMPLETED

**Problem**: No visual feedback during long operations

**Fix**: Already implemented in src/pages/NewAnalysis.tsx
- Uses isSubmitting state to show loading feedback
- Button displays "Creating..." text when submitting
- Button is disabled during submission
- Toast notifications provide feedback on success/failure
- Appropriate for the analysis creation flow

### 7. **Validate Sequences Before Submission** ✅ COMPLETED

**Problem**: Invalid sequences crash backend

**Fix**: Implemented in src/lib/sequenceParser.ts
- Added exported validateSequence() function
- Validates nucleotide sequences (ACGTU only)
- Validates amino acid sequences (standard amino acid codes)
- Can be imported and used in components before submission
- Prevents invalid sequences from reaching the backend

---

## Python Backend Integration Guide

### Option 1: Deploy to Railway (Recommended for Beginners)

**Step 1: Prepare Repository**

```bash
# Ensure backend/requirements.txt and backend/main.py are in place
cd backend
ls -la
# Should see: Dockerfile, main.py, requirements.txt, docker-compose.yml
```

**Step 2: Create Railway Project**

1. Go to https://railway.app
2. Sign up / log in
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `gene-explorer-ai` repository
5. Railway will auto-detect the Dockerfile

**Step 3: Configure Railway**

**Settings:**
- **Root Directory**: `backend`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Build Command**: (leave empty, Dockerfile handles it)

**Environment Variables:**
- Railway automatically sets `PORT` variable
- No additional variables needed for basic setup

**Step 4: Deploy**

- Railway automatically deploys on git push
- Wait for build to complete (~3-5 minutes)
- Note the public URL: `https://gene-explorer-backend-production.up.railway.app`

**Step 5: Configure Frontend**

In Lovable.dev project settings:

1. Go to Project Settings → Environment Variables
2. Add: `PYTHON_BACKEND_URL=https://your-railway-url.railway.app`
3. Redeploy frontend

**Step 6: Test**

```bash
# Test health endpoint
curl https://your-railway-url.railway.app/health

# Should return: {"status":"healthy","version":"1.0.0"}
```

### Option 2: Deploy to Render

**Step 1: Create Render Web Service**

1. Go to https://render.com
2. Sign up / log in
3. Click "New +" → "Web Service"
4. Connect GitHub repository

**Step 2: Configure Render**

**Settings:**
- **Name**: `gene-explorer-backend`
- **Root Directory**: `backend`
- **Environment**: `Docker`
- **Region**: Choose closest to users
- **Instance Type**: Free tier OK for testing, Starter+ for production

**Build Settings:**
- Render auto-detects Dockerfile

**Environment Variables:**
- Add: `PORT=10000` (Render default)
- No other variables needed

**Step 3: Deploy**

- Click "Create Web Service"
- Wait for build (~3-5 minutes)
- Note the public URL: `https://gene-explorer-backend.onrender.com`

**Step 4: Configure Frontend**

Same as Railway (see above).

### Option 3: Deploy with Docker Compose (VPS/Self-Hosted)

**Prerequisites:**
- Linux VPS (Ubuntu 22.04 recommended)
- Docker + Docker Compose installed
- Domain name (optional but recommended)

**Step 1: Clone Repository on Server**

```bash
ssh user@your-server.com
cd /opt
git clone https://github.com/itamar-menuhin/gene-explorer-ai.git
cd gene-explorer-ai
```

**Step 2: Build and Run**

```bash
cd backend
docker-compose up -d

# Check logs
docker-compose logs -f feature-api
```

**Step 3: Configure Nginx Reverse Proxy**

```nginx
# /etc/nginx/sites-available/gene-explorer-api
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gene-explorer-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Set up SSL with Let's Encrypt
sudo certbot --nginx -d api.your-domain.com
```

**Step 4: Configure Frontend**

Set `PYTHON_BACKEND_URL=https://api.your-domain.com` in Lovable.dev

### Option 4: Kubernetes (Production Scale)

For high-traffic production deployments:

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gene-explorer-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gene-explorer-backend
  template:
    metadata:
      labels:
        app: gene-explorer-backend
    spec:
      containers:
      - name: api
        image: ghcr.io/itamar-menuhin/gene-explorer-backend:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: gene-explorer-backend-service
spec:
  selector:
    app: gene-explorer-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
kubectl get services  # Get external IP
```

---

## Integration Checklist

When deploying the Python backend, follow this checklist:

### Pre-Deployment

- [ ] Verify backend works locally
  ```bash
  cd backend
  pip install -r requirements.txt
  python main.py
  # Visit http://localhost:8080/health
  ```

- [ ] Test with frontend locally
  ```bash
  # Terminal 1: Run backend
  cd backend && python main.py
  
  # Terminal 2: Run frontend
  cd .. && npm run dev
  
  # Set VITE_PYTHON_BACKEND_URL=http://localhost:8080 in .env
  ```

- [ ] Run backend tests
  ```bash
  cd backend
  pytest tests/ -v
  ```

### Deployment

- [ ] Deploy Python backend to hosting platform
- [ ] Verify health endpoint returns 200 OK
- [ ] Set `PYTHON_BACKEND_URL` in Lovable.dev environment variables
- [ ] Set `PYTHON_BACKEND_URL` in Supabase Edge Function environment
- [ ] Redeploy frontend (if needed)
- [ ] Test end-to-end feature extraction

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts for downtime
- [ ] Document deployment in README.md
- [ ] Add API URL to team documentation

---

## Troubleshooting

### Frontend can't reach Python backend

**Symptoms:**
- Feature extraction fails with "Feature extraction failed"
- Edge function logs show "Python backend error: 500"

**Solutions:**
1. Verify `PYTHON_BACKEND_URL` is set in Supabase Edge Function environment
   - Go to Supabase Dashboard → Edge Functions → extract-features → Settings
   - Add `PYTHON_BACKEND_URL` secret

2. Check Python backend is running
   ```bash
   curl https://your-backend-url.com/health
   ```

3. Check CORS headers
   - Python backend should have `allow_origins=["*"]` in CORS middleware
   - This is already configured in `main.py`

### Python backend crashes with module not found

**Symptoms:**
- Backend logs show `ModuleNotFoundError: No module named 'feature_engineering'`

**Solutions:**
1. Ensure feature_engineering directory is copied to Docker image
   ```dockerfile
   COPY ./feature_engineering /app/feature_engineering
   ```

2. If running locally, ensure parent directory is in PYTHONPATH
   ```bash
   export PYTHONPATH=/path/to/gene-explorer-ai:$PYTHONPATH
   ```

### Feature extraction times out

**Symptoms:**
- Frontend shows "Request timed out"
- Large sequence sets never complete

**Solutions:**
1. Increase timeout in edge function (if possible)
2. Reduce batch size on frontend (limit to 50-100 sequences)
3. Use background job queue (future enhancement)
4. Disable complex panels (disorder, structure) for large batches

### Mock data still showing in AnalysisPlayground

**Symptoms:**
- Results page shows charts but with random data
- Data doesn't match uploaded sequences

**Solutions:**
1. Fix AnalysisPlayground.tsx to load real data (see Easy Fix #1)
2. Ensure analysis results are saved to database
3. Check if `analyses` table has `results` column with JSON data

---

## Performance Considerations

### Frontend

- **Bundle size**: Currently ~2MB (acceptable for modern apps)
- **Optimization**: Code splitting by route (already configured in Vite)
- **Caching**: React Query caches API responses for 5 minutes

### Backend

**Expected Performance:**

| Operation | Sequences | Time (Python Backend) | Time (Local Fallback) |
|-----------|-----------|----------------------|----------------------|
| Sequence features | 100 | ~50ms | ~20ms |
| Chemical properties | 100 | ~200ms | ~50ms |
| Codon usage (basic) | 100 | ~500ms | N/A |
| Windowed analysis | 100 sequences × 50 windows | ~5s | ~1s |

**Bottlenecks:**

1. **Disorder prediction** - Requires C binaries, ~10s per sequence
2. **Structure prediction** - May require external APIs, ~30s per sequence
3. **Motif search** - JASPAR database queries, ~5s per sequence

**Optimization Strategies:**

1. **Parallel processing**
   ```python
   from concurrent.futures import ProcessPoolExecutor
   
   with ProcessPoolExecutor() as executor:
       results = executor.map(extract_features_single, sequences)
   ```

2. **Caching**
   - Cache results by sequence hash
   - Use Redis or in-memory cache

3. **Batch processing**
   - For >100 sequences, use background jobs
   - Return job ID, poll for status

---

## Security Considerations

### Current Security Measures

✅ **Authentication**
- Supabase JWT-based auth
- Row-level security on database tables
- Users can only access their own analyses

✅ **Input Validation**
- Pydantic validates all API inputs
- Sequence length limits (prevent DoS)

✅ **CORS**
- Configured to allow frontend origin
- Can be tightened for production

### Future Security Enhancements

⚠️ **Rate Limiting**
- Add rate limiting to edge functions
- Prevent abuse of computation resources

⚠️ **Input Sanitization**
- Validate sequence characters more strictly
- Prevent injection attacks in annotations/names

⚠️ **API Key Authentication**
- Add API key requirement for Python backend
- Only allow requests from edge functions

⚠️ **Audit Logging**
- Log all feature extractions
- Monitor for suspicious patterns

---

## Conclusion

Gene Explorer AI has a **solid foundation** with clear separation between frontend (React/TypeScript), middleware (Supabase Edge Functions), and backend (Python FastAPI). The architecture is **flexible** (works with or without Python backend) and **scalable** (Python backend can be horizontally scaled).

**Next steps:**
1. Deploy Python backend to Railway/Render
2. Fix mock data in AnalysisPlayground
3. Implement remaining feature panels
4. Add real-time progress updates
5. Optimize for large batch processing

The application is **production-ready** for small to medium workloads and can be scaled incrementally as usage grows.
