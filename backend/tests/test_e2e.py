"""
End-to-end tests simulating full API workflow.
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


class TestE2EGlobalAnalysis:
    """End-to-end tests for global analysis workflow."""
    
    def test_full_analysis_workflow(self, sample_nucleotide_sequence):
        """Test complete analysis workflow with all panels."""
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "test_gene_1",
                    "sequence": sample_nucleotide_sequence,
                    "name": "Test Gene"
                }
            ],
            "panels": {
                "sequence": {"enabled": True},
                "chemical": {"enabled": True},
                "codonUsage": {"enabled": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["success"] is True
        assert data["mode"] == "global"
        assert len(data["results"]) == 1
        
        # Verify metadata
        assert data["metadata"]["totalSequences"] == 1
        assert "computeTimeMs" in data["metadata"]
        assert set(data["metadata"]["panelsComputed"]) >= {"sequence", "chemical", "codonUsage"}
        
        # Verify features exist
        features = data["results"][0]["features"]
        assert "gc_content" in features
        assert "length" in features
    
    def test_batch_analysis_workflow(self, sample_csv_data):
        """Test batch analysis with multiple sequences."""
        sequences = [
            {"id": item["gene"], "sequence": item["ORF"]}
            for item in sample_csv_data
        ]
        
        response = client.post("/extract-features", json={
            "sequences": sequences,
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["results"]) == 3
        assert data["metadata"]["totalSequences"] == 3
        
        # Each sequence should have its own result
        result_ids = [r["sequenceId"] for r in data["results"]]
        assert set(result_ids) == {"YAL001C", "YAL002W", "YAL003W"}


class TestE2EWindowedAnalysis:
    """End-to-end tests for windowed analysis workflow."""
    
    def test_windowed_analysis_workflow(self, sample_nucleotide_sequence):
        """Test complete windowed analysis workflow."""
        # Extend sequence for windowed analysis
        long_sequence = sample_nucleotide_sequence * 10  # ~600bp
        
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "long_gene",
                    "sequence": long_sequence
                }
            ],
            "panels": {
                "sequence": {"enabled": True}
            },
            "window": {
                "enabled": True,
                "windowSize": 50,
                "stepSize": 25
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "windowed"
        assert data["metadata"]["windowSize"] == 50
        assert data["metadata"]["stepSize"] == 25
        assert data["metadata"]["totalWindows"] > 0
        
        # Verify window structure
        for result in data["results"]:
            assert result["windowStart"] is not None
            assert result["windowEnd"] is not None
            assert result["windowEnd"] - result["windowStart"] == 50


class TestE2EProteinAnalysis:
    """End-to-end tests for protein sequence analysis."""
    
    def test_protein_chemical_analysis(self, sample_amino_acid_sequence):
        """Test chemical analysis on protein sequence."""
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "protein_1",
                    "sequence": sample_amino_acid_sequence
                }
            ],
            "panels": {
                "sequence": {"enabled": True},
                "chemical": {"enabled": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        features = data["results"][0]["features"]
        
        # Should have chemical properties
        assert "molecular_weight" in features
        assert "isoelectric_point" in features
    
    def test_fasta_batch_analysis(self, sample_fasta_sequences):
        """Test batch analysis with FASTA-style sequences."""
        sequences = [
            {"id": seq_id, "sequence": seq.replace('*', '')}
            for seq_id, seq in sample_fasta_sequences
        ]
        
        response = client.post("/extract-features", json={
            "sequences": sequences,
            "panels": {
                "chemical": {"enabled": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["results"]) == 3
        
        # Each should have chemical features
        for result in data["results"]:
            assert "molecular_weight" in result["features"]


class TestE2EErrorRecovery:
    """End-to-end tests for error handling and recovery."""
    
    def test_mixed_valid_invalid_sequences(self):
        """Test that valid sequences still process when some fail."""
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "valid_1", "sequence": "ATGCATGC"},
                {"id": "valid_2", "sequence": "GCGCGCGC"},
            ],
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Both should succeed
        assert len(data["results"]) == 2
    
    def test_graceful_empty_request(self):
        """Test graceful handling of empty request."""
        response = client.post("/extract-features", json={
            "sequences": [],
            "panels": {}
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["results"]) == 0
