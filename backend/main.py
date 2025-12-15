"""
FastAPI backend for feature extraction.
Wraps the feature_engineering module to provide a REST API.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import sys
import os

# Add parent directory to path for feature_engineering imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from feature_engineering.sequence import NucleotideSequence, AminoAcidSequence
from feature_engineering.chemical import ChemicalFeaturesMixin
from feature_engineering.cub import CUBFeaturesMixin

app = FastAPI(
    title="Feature Extraction API",
    description="API for extracting features from genetic sequences",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class SequenceInput(BaseModel):
    id: str
    sequence: str
    name: Optional[str] = None
    annotations: Optional[Dict[str, Any]] = None


class PanelConfig(BaseModel):
    enabled: bool = False
    params: Optional[Dict[str, Any]] = None


class PanelsConfig(BaseModel):
    sequence: Optional[PanelConfig] = None
    chemical: Optional[PanelConfig] = None
    disorder: Optional[PanelConfig] = None
    structure: Optional[PanelConfig] = None
    motif: Optional[PanelConfig] = None
    codonUsage: Optional[PanelConfig] = None


class WindowConfig(BaseModel):
    enabled: bool = False
    windowSize: int = 100
    stepSize: int = 10


class FeatureRequest(BaseModel):
    sequences: List[SequenceInput]
    panels: PanelsConfig
    window: Optional[WindowConfig] = None
    referenceSet: Optional[str] = None


class SequenceError(BaseModel):
    sequenceId: str
    panel: str
    error: str


class FeatureResult(BaseModel):
    sequenceId: str
    windowStart: Optional[int] = None
    windowEnd: Optional[int] = None
    features: Dict[str, Any]


class FeatureResponse(BaseModel):
    success: bool
    mode: str
    results: List[FeatureResult]
    metadata: Dict[str, Any]
    errors: Optional[List[SequenceError]] = None


# Feature Extractors
class SequenceFeatureExtractor:
    """Extract sequence composition features."""
    
    def extract(self, sequence: str) -> Dict[str, Any]:
        seq_upper = sequence.upper()
        length = len(seq_upper)
        
        a_count = seq_upper.count('A')
        t_count = seq_upper.count('T') + seq_upper.count('U')
        g_count = seq_upper.count('G')
        c_count = seq_upper.count('C')
        
        gc_content = ((g_count + c_count) / length * 100) if length > 0 else 0
        at_content = ((a_count + t_count) / length * 100) if length > 0 else 0
        
        return {
            "gc_content": round(gc_content, 2),
            "at_content": round(at_content, 2),
            "length": length,
            "a_count": a_count,
            "t_count": t_count,
            "g_count": g_count,
            "c_count": c_count,
        }


class ChemicalFeatureExtractor(ChemicalFeaturesMixin):
    """Extract chemical properties from amino acid sequences."""
    
    def extract(self, amino_acid_sequence: str) -> Dict[str, Any]:
        try:
            features = self._extract_features_single(amino_acid_sequence)
            # Round numeric values
            return {k: round(v, 4) if isinstance(v, float) else v for k, v in features.items()}
        except Exception as e:
            return {"error": str(e)}


class CUBFeatureExtractor(CUBFeaturesMixin):
    """Extract codon usage bias features."""
    
    def extract(self, nucleotide_sequence: str) -> Dict[str, Any]:
        try:
            # Calculate basic CUB features that don't need external files
            features = {}
            features["enc"] = self.calc_ENC(nucleotide_sequence)
            features["rcbs"] = self.calc_RCBS(nucleotide_sequence)
            features["rscu"] = self.calc_RSCU(nucleotide_sequence)
            features["cpb"] = self.calc_CPB(nucleotide_sequence)
            features["dcbs"] = self.calc_DCBS(nucleotide_sequence)
            
            # Round values
            return {k: round(v, 4) if isinstance(v, float) else v for k, v in features.items()}
        except Exception as e:
            return {"error": str(e)}


# Initialize extractors
sequence_extractor = SequenceFeatureExtractor()
chemical_extractor = ChemicalFeatureExtractor()
cub_extractor = CUBFeatureExtractor()


def detect_sequence_type(sequence: str) -> str:
    """Detect if sequence is nucleotide or amino acid."""
    seq_upper = sequence.upper()
    nucleotide_chars = set('ACGTU')
    seq_chars = set(seq_upper.replace('*', ''))
    
    if seq_chars.issubset(nucleotide_chars):
        return 'nucleotide'
    return 'amino_acid'


def extract_window_features(
    sequence: str,
    seq_id: str,
    panels: PanelsConfig,
    window_size: int,
    step_size: int
) -> List[FeatureResult]:
    """Extract features for windowed analysis."""
    results = []
    seq_type = detect_sequence_type(sequence)
    
    for start in range(0, len(sequence) - window_size + 1, step_size):
        end = start + window_size
        window_seq = sequence[start:end]
        features = {}
        
        if panels.sequence and panels.sequence.enabled:
            features.update(sequence_extractor.extract(window_seq))
        
        if panels.chemical and panels.chemical.enabled and seq_type == 'amino_acid':
            features.update(chemical_extractor.extract(window_seq))
        
        if panels.codonUsage and panels.codonUsage.enabled and seq_type == 'nucleotide':
            if len(window_seq) >= 3:
                features.update(cub_extractor.extract(window_seq))
        
        results.append(FeatureResult(
            sequenceId=seq_id,
            windowStart=start,
            windowEnd=end,
            features=features
        ))
    
    return results


def extract_global_features(
    sequence: str,
    seq_id: str,
    panels: PanelsConfig
) -> FeatureResult:
    """Extract features for global (whole sequence) analysis."""
    features = {}
    seq_type = detect_sequence_type(sequence)
    
    if panels.sequence and panels.sequence.enabled:
        features.update(sequence_extractor.extract(sequence))
    
    if panels.chemical and panels.chemical.enabled:
        if seq_type == 'nucleotide':
            # Translate to amino acids first
            try:
                nuc_seq = NucleotideSequence(sequence)
                aa_seq = str(nuc_seq.amino_acid_sequence.amino_acid_sequence)
                if aa_seq:
                    features.update(chemical_extractor.extract(aa_seq))
            except Exception:
                pass
        else:
            features.update(chemical_extractor.extract(sequence))
    
    if panels.codonUsage and panels.codonUsage.enabled and seq_type == 'nucleotide':
        features.update(cub_extractor.extract(sequence))
    
    return FeatureResult(sequenceId=seq_id, features=features)


@app.post("/extract-features", response_model=FeatureResponse)
async def extract_features(request: FeatureRequest):
    """
    Extract features from sequences.
    Supports both global and windowed analysis modes.
    """
    start_time = time.time()
    
    results = []
    errors = []
    enabled_panels = []
    
    # Track enabled panels
    if request.panels.sequence and request.panels.sequence.enabled:
        enabled_panels.append("sequence")
    if request.panels.chemical and request.panels.chemical.enabled:
        enabled_panels.append("chemical")
    if request.panels.disorder and request.panels.disorder.enabled:
        enabled_panels.append("disorder")
    if request.panels.structure and request.panels.structure.enabled:
        enabled_panels.append("structure")
    if request.panels.motif and request.panels.motif.enabled:
        enabled_panels.append("motif")
    if request.panels.codonUsage and request.panels.codonUsage.enabled:
        enabled_panels.append("codonUsage")
    
    window_config = request.window or WindowConfig()
    mode = "windowed" if window_config.enabled else "global"
    total_windows = 0
    
    for seq in request.sequences:
        try:
            if window_config.enabled:
                # Always compute global features first
                global_result = extract_global_features(seq.sequence, seq.id, request.panels)
                results.append(global_result)
                
                # Then compute windowed features
                window_results = extract_window_features(
                    seq.sequence,
                    seq.id,
                    request.panels,
                    window_config.windowSize,
                    window_config.stepSize
                )
                results.extend(window_results)
                total_windows += len(window_results)
            else:
                result = extract_global_features(seq.sequence, seq.id, request.panels)
                results.append(result)
        except Exception as e:
            errors.append(SequenceError(
                sequenceId=seq.id,
                panel="unknown",
                error=str(e)
            ))
    
    compute_time = int((time.time() - start_time) * 1000)
    
    metadata = {
        "totalSequences": len(request.sequences),
        "panelsComputed": enabled_panels,
        "computeTimeMs": compute_time
    }
    
    if mode == "windowed":
        metadata["totalWindows"] = total_windows
        metadata["windowSize"] = window_config.windowSize
        metadata["stepSize"] = window_config.stepSize
    
    return FeatureResponse(
        success=True,
        mode=mode,
        results=results,
        metadata=metadata,
        errors=errors if errors else None
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/panels")
async def list_panels():
    """List available feature panels and their features."""
    return {
        "panels": [
            {
                "id": "sequence",
                "name": "Sequence Composition",
                "features": ["gc_content", "at_content", "length", "a_count", "t_count", "g_count", "c_count"]
            },
            {
                "id": "chemical",
                "name": "Chemical Properties",
                "features": ["isoelectric_point", "instability_index", "molecular_weight", "gravy", "aromaticity_index"]
            },
            {
                "id": "codonUsage",
                "name": "Codon Usage Bias",
                "features": ["enc", "rcbs", "rscu", "cpb", "dcbs", "cai", "fop"]
            },
            {
                "id": "disorder",
                "name": "Disorder Prediction",
                "features": ["iupred_score", "disorder_regions", "disorder_fraction"]
            },
            {
                "id": "structure",
                "name": "Structure Features",
                "features": ["helix_propensity", "sheet_propensity", "coil_propensity"]
            },
            {
                "id": "motif",
                "name": "Motif Analysis",
                "features": ["motif_count", "motif_density", "top_motifs"]
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
