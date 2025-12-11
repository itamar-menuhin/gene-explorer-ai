"""
Tests for the FastAPI backend API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""
    
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestPanelsEndpoint:
    """Tests for /panels endpoint."""
    
    def test_list_panels(self):
        response = client.get("/panels")
        assert response.status_code == 200
        data = response.json()
        assert "panels" in data
        panel_ids = [p["id"] for p in data["panels"]]
        assert "sequence" in panel_ids
        assert "chemical" in panel_ids
        assert "codonUsage" in panel_ids


class TestExtractFeaturesGlobal:
    """Tests for global feature extraction."""
    
    def test_extract_sequence_features_nucleotide(self):
        """Test sequence composition features for nucleotide sequence."""
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "test_seq_1",
                    "sequence": "ATGCATGCATGCATGC"
                }
            ],
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["mode"] == "global"
        assert len(data["results"]) == 1
        
        features = data["results"][0]["features"]
        assert "gc_content" in features
        assert "at_content" in features
        assert "length" in features
        assert features["length"] == 16
        assert features["gc_content"] == 50.0  # ATGC repeated
    
    def test_extract_chemical_features_amino_acid(self):
        """Test chemical features for amino acid sequence."""
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "test_protein",
                    "sequence": "MVLTIYPDELVQIVSD"
                }
            ],
            "panels": {
                "chemical": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        features = data["results"][0]["features"]
        assert "molecular_weight" in features
        assert "isoelectric_point" in features
    
    def test_extract_multiple_panels(self):
        """Test extracting features from multiple panels."""
        response = client.post("/extract-features", json={
            "sequences": [
                {
                    "id": "test_seq",
                    "sequence": "ATGGTACTGACGATTTATCCTGAC"
                }
            ],
            "panels": {
                "sequence": {"enabled": True},
                "codonUsage": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        features = data["results"][0]["features"]
        # Should have sequence features
        assert "gc_content" in features
        # Should have CUB features
        assert "enc" in features or "error" not in features
    
    def test_extract_multiple_sequences(self):
        """Test extracting features from multiple sequences."""
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "seq_1", "sequence": "ATGATGATG"},
                {"id": "seq_2", "sequence": "GCGCGCGCG"},
                {"id": "seq_3", "sequence": "ATATAT"}
            ],
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 3
        assert data["metadata"]["totalSequences"] == 3


class TestExtractFeaturesWindowed:
    """Tests for windowed feature extraction."""
    
    def test_windowed_extraction(self):
        """Test windowed analysis mode."""
        # Create a 100bp sequence
        sequence = "ATGC" * 25  # 100bp
        
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "test_seq", "sequence": sequence}
            ],
            "panels": {
                "sequence": {"enabled": True}
            },
            "window": {
                "enabled": True,
                "windowSize": 20,
                "stepSize": 10
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "windowed"
        assert data["metadata"]["windowSize"] == 20
        assert data["metadata"]["stepSize"] == 10
        
        # Should have multiple windows
        assert len(data["results"]) > 1
        
        # Check window boundaries
        first_result = data["results"][0]
        assert first_result["windowStart"] == 0
        assert first_result["windowEnd"] == 20
    
    def test_windowed_extraction_with_step(self):
        """Test that step size is correctly applied."""
        sequence = "A" * 50 + "G" * 50  # 100bp with clear composition change
        
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "test_seq", "sequence": sequence}
            ],
            "panels": {
                "sequence": {"enabled": True}
            },
            "window": {
                "enabled": True,
                "windowSize": 20,
                "stepSize": 20
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        # First windows should be AT-rich, later ones GC-rich
        results = data["results"]
        first_gc = results[0]["features"]["gc_content"]
        last_gc = results[-1]["features"]["gc_content"]
        
        assert first_gc < last_gc  # First window is A-rich, last is G-rich


class TestMetadata:
    """Tests for response metadata."""
    
    def test_metadata_includes_panels(self):
        """Test that metadata includes computed panels."""
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "test", "sequence": "ATGC"}
            ],
            "panels": {
                "sequence": {"enabled": True},
                "chemical": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "panelsComputed" in data["metadata"]
        assert "sequence" in data["metadata"]["panelsComputed"]
        assert "chemical" in data["metadata"]["panelsComputed"]
    
    def test_metadata_includes_compute_time(self):
        """Test that metadata includes compute time."""
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "test", "sequence": "ATGC"}
            ],
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "computeTimeMs" in data["metadata"]
        assert isinstance(data["metadata"]["computeTimeMs"], int)


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_empty_sequences(self):
        """Test handling of empty sequence list."""
        response = client.post("/extract-features", json={
            "sequences": [],
            "panels": {
                "sequence": {"enabled": True}
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["results"]) == 0
    
    def test_no_panels_enabled(self):
        """Test handling when no panels are enabled."""
        response = client.post("/extract-features", json={
            "sequences": [
                {"id": "test", "sequence": "ATGC"}
            ],
            "panels": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Features should be empty
        assert data["results"][0]["features"] == {}
