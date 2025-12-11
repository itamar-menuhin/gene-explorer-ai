# Python Backend API Specification

This document describes the API contract between the frontend and the Python feature extraction backend.

## Overview

The frontend calls the Edge Function `extract-features`, which proxies requests to the Python backend when the `PYTHON_BACKEND_URL` environment variable is set.

## Endpoint

```
POST /extract-features
Content-Type: application/json
```

## Request Schema

```json
{
  "sequences": [
    {
      "id": "string (required) - unique identifier",
      "sequence": "string (required) - nucleotide/amino acid sequence",
      "name": "string (optional) - display name",
      "annotations": {
        "key": "value (optional) - additional metadata"
      }
    }
  ],
  "panels": {
    "sequence": { "enabled": true, "params": {} },
    "chemical": { "enabled": true, "params": {} },
    "disorder": { "enabled": false },
    "structure": { "enabled": false },
    "motif": { "enabled": false },
    "codonUsage": { "enabled": false }
  },
  "window": {
    "enabled": false,
    "windowSize": 100,
    "stepSize": 10
  },
  "referenceSet": "string (optional) - reference organism for CAI"
}
```

## Response Schema

### Global Mode (window.enabled = false)

```json
{
  "success": true,
  "mode": "global",
  "results": [
    {
      "sequenceId": "seq_001",
      "features": {
        "gc_content": 52.3,
        "at_content": 47.7,
        "length": 1200,
        "molecular_weight": 396000,
        "melting_temp": 82.5,
        "...": "other computed features"
      }
    }
  ],
  "metadata": {
    "totalSequences": 100,
    "panelsComputed": ["sequence", "chemical"],
    "computeTimeMs": 1234
  },
  "errors": [
    {
      "sequenceId": "seq_002",
      "panel": "disorder",
      "error": "Sequence too short for disorder prediction"
    }
  ]
}
```

### Windowed Mode (window.enabled = true)

```json
{
  "success": true,
  "mode": "windowed",
  "results": [
    {
      "sequenceId": "seq_001",
      "windowStart": 0,
      "windowEnd": 100,
      "features": {
        "gc_content": 55.0,
        "at_content": 45.0,
        "melting_temp": 84.2
      }
    },
    {
      "sequenceId": "seq_001", 
      "windowStart": 10,
      "windowEnd": 110,
      "features": {
        "gc_content": 53.2,
        "...": "..."
      }
    }
  ],
  "metadata": {
    "totalSequences": 100,
    "totalWindows": 5000,
    "windowSize": 100,
    "stepSize": 10,
    "panelsComputed": ["sequence", "chemical"],
    "computeTimeMs": 5678
  }
}
```

## Feature Panels

### Sequence Composition (`sequence`)
Maps to: `feature_engineering/sequence.py`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| gc_content | GC Content | Percentage of G and C nucleotides | % |
| at_content | AT Content | Percentage of A and T nucleotides | % |
| length | Sequence Length | Total number of nucleotides | bp |
| a_count | Adenine Count | Number of A nucleotides | - |
| t_count | Thymine Count | Number of T nucleotides | - |
| g_count | Guanine Count | Number of G nucleotides | - |
| c_count | Cytosine Count | Number of C nucleotides | - |

### Chemical Properties (`chemical`)
Maps to: `feature_engineering/chemical.py`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| molecular_weight | Molecular Weight | Molecular mass of the sequence | Da |
| melting_temp | Melting Temperature | Predicted Tm using nearest-neighbor method | °C |
| extinction_coeff | Extinction Coefficient | Molar extinction coefficient at 260nm | M⁻¹cm⁻¹ |

### Disorder Prediction (`disorder`)
Maps to: `feature_engineering/disorder/`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| iupred_score | IUPred Score | Intrinsic disorder prediction score | - |
| disorder_regions | Disordered Regions | Number of disordered regions | - |
| disorder_fraction | Disorder Fraction | Fraction of sequence predicted disordered | % |

### Structure Features (`structure`)
Maps to: `feature_engineering/biotite_structure_features.py`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| helix_propensity | Helix Propensity | Predicted alpha-helix content | % |
| sheet_propensity | Sheet Propensity | Predicted beta-sheet content | % |
| coil_propensity | Coil Propensity | Predicted random coil content | % |

### Motif Analysis (`motif`)
Maps to: `feature_engineering/jaspar_motif_features.py`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| motif_count | Motif Count | Number of detected motifs | - |
| motif_density | Motif Density | Motifs per kilobase | per kb |
| top_motifs | Top Motifs | Most significant motifs found | - |

### Codon Usage (`codonUsage`)
Maps to: `feature_engineering/cub.py`

| Feature ID | Name | Description | Unit |
|------------|------|-------------|------|
| cai | Codon Adaptation Index | CAI score relative to reference organism | - |
| enc | Effective Number of Codons | ENC measure of codon bias | - |
| rscu | RSCU Values | Relative synonymous codon usage | - |

## Python Implementation Example

```python
from flask import Flask, request, jsonify
from feature_engineering.universal_feature_mixin import UniversalFeatureMixin
from feature_engineering.sequence import SequenceFeatures
from feature_engineering.chemical import ChemicalFeatures
import time

app = Flask(__name__)

# Initialize feature extractors
sequence_extractor = SequenceFeatures()
chemical_extractor = ChemicalFeatures()

@app.route('/extract-features', methods=['POST'])
def extract_features():
    start_time = time.time()
    data = request.json
    
    sequences = data['sequences']
    panels = data['panels']
    window_config = data.get('window', {'enabled': False})
    
    results = []
    errors = []
    enabled_panels = [k for k, v in panels.items() if v.get('enabled')]
    
    for seq in sequences:
        try:
            features = {}
            
            if panels.get('sequence', {}).get('enabled'):
                seq_features = sequence_extractor.extract_features(seq['sequence'])
                features.update(seq_features)
            
            if panels.get('chemical', {}).get('enabled'):
                chem_features = chemical_extractor.extract_features(seq['sequence'])
                features.update(chem_features)
            
            # Add more panel handlers...
            
            results.append({
                'sequenceId': seq['id'],
                'features': features
            })
            
        except Exception as e:
            errors.append({
                'sequenceId': seq['id'],
                'panel': 'unknown',
                'error': str(e)
            })
    
    compute_time = int((time.time() - start_time) * 1000)
    
    return jsonify({
        'success': True,
        'mode': 'windowed' if window_config.get('enabled') else 'global',
        'results': results,
        'metadata': {
            'totalSequences': len(sequences),
            'panelsComputed': enabled_panels,
            'computeTimeMs': compute_time
        },
        'errors': errors if errors else None
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Deployment

Set the `PYTHON_BACKEND_URL` secret in Lovable Cloud to point to your deployed Python API:

```
PYTHON_BACKEND_URL=https://your-python-api.railway.app
```

The Edge Function will automatically proxy requests to this URL when set.
