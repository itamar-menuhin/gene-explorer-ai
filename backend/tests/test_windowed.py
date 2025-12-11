"""
Tests for windowed feature extraction.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import extract_window_features, PanelsConfig, PanelConfig


class TestWindowedExtraction:
    """Tests for windowed feature extraction logic."""
    
    def test_window_count(self):
        """Test correct number of windows are generated."""
        sequence = "A" * 100  # 100bp sequence
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        # Window size 20, step 10 should give (100-20)/10 + 1 = 9 windows
        results = extract_window_features(sequence, "test", panels, 20, 10)
        assert len(results) == 9
    
    def test_window_boundaries(self):
        """Test window start/end positions are correct."""
        sequence = "ATGC" * 25  # 100bp
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 20, 20)
        
        # Check positions
        assert results[0].windowStart == 0
        assert results[0].windowEnd == 20
        assert results[1].windowStart == 20
        assert results[1].windowEnd == 40
    
    def test_window_features_vary(self):
        """Test that features vary across windows with different content."""
        # Sequence with clear composition change
        sequence = "A" * 50 + "G" * 50
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 20, 20)
        
        # First window should be AT-rich
        first_gc = results[0].features["gc_content"]
        # Last window should be GC-rich
        last_gc = results[-1].features["gc_content"]
        
        assert first_gc < 10  # Nearly 0% GC
        assert last_gc > 90  # Nearly 100% GC
    
    def test_window_smaller_than_sequence(self):
        """Test handling when sequence is smaller than window."""
        sequence = "ATGC"  # 4bp
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 10, 5)
        
        # Should return no windows
        assert len(results) == 0
    
    def test_window_exact_sequence_length(self):
        """Test when window size equals sequence length."""
        sequence = "ATGC" * 5  # 20bp
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 20, 10)
        
        # Should return exactly 1 window
        assert len(results) == 1
        assert results[0].windowStart == 0
        assert results[0].windowEnd == 20
    
    def test_windowed_with_multiple_panels(self):
        """Test windowed extraction with multiple panels enabled."""
        # Use a coding sequence for CUB
        sequence = "ATG" * 40  # 120bp coding sequence
        panels = PanelsConfig(
            sequence=PanelConfig(enabled=True),
            codonUsage=PanelConfig(enabled=True)
        )
        
        results = extract_window_features(sequence, "test", panels, 30, 30)
        
        # Should have results with both feature sets
        for result in results:
            assert "gc_content" in result.features  # From sequence panel


class TestWindowedEdgeCases:
    """Edge case tests for windowed extraction."""
    
    def test_step_larger_than_window(self):
        """Test with step size larger than window size."""
        sequence = "A" * 100
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        # This should work - we'll have gaps between windows
        results = extract_window_features(sequence, "test", panels, 10, 30)
        
        assert len(results) > 0
        # Windows should not overlap
        assert results[1].windowStart >= results[0].windowEnd
    
    def test_very_long_sequence(self):
        """Test with a very long sequence."""
        sequence = "ATGC" * 2500  # 10000bp
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 100, 50)
        
        # Should handle large sequences
        assert len(results) > 100
    
    def test_step_size_one(self):
        """Test with step size of 1 (maximum overlap)."""
        sequence = "ATGCATGCATGC"  # 12bp
        panels = PanelsConfig(sequence=PanelConfig(enabled=True))
        
        results = extract_window_features(sequence, "test", panels, 5, 1)
        
        # Should have 8 windows (12 - 5 + 1 = 8)
        assert len(results) == 8
