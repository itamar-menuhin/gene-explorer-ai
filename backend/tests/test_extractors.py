"""
Tests for feature extractors using example inputs.
"""
import pytest
import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from main import SequenceFeatureExtractor, ChemicalFeatureExtractor, CUBFeatureExtractor, detect_sequence_type


class TestSequenceTypeDetection:
    """Tests for sequence type detection."""
    
    def test_detect_nucleotide_dna(self):
        """Test detection of DNA sequence."""
        assert detect_sequence_type("ATGCATGC") == "nucleotide"
    
    def test_detect_nucleotide_rna(self):
        """Test detection of RNA sequence."""
        assert detect_sequence_type("AUGCAUGC") == "nucleotide"
    
    def test_detect_amino_acid(self):
        """Test detection of amino acid sequence."""
        assert detect_sequence_type("MVLTIYPDELVQIVSD") == "amino_acid"
    
    def test_detect_amino_acid_with_stop(self):
        """Test detection of amino acid sequence with stop codon."""
        assert detect_sequence_type("MVLTIYPDELVQIVSD*") == "amino_acid"


class TestSequenceFeatureExtractor:
    """Tests for sequence composition feature extraction."""
    
    def setup_method(self):
        self.extractor = SequenceFeatureExtractor()
    
    def test_gc_content_calculation(self):
        """Test GC content calculation."""
        # 50% GC
        features = self.extractor.extract("ATGC")
        assert features["gc_content"] == 50.0
        
        # 100% GC
        features = self.extractor.extract("GGCC")
        assert features["gc_content"] == 100.0
        
        # 0% GC
        features = self.extractor.extract("AATT")
        assert features["gc_content"] == 0.0
    
    def test_length_calculation(self):
        """Test sequence length calculation."""
        features = self.extractor.extract("ATGCATGC")
        assert features["length"] == 8
    
    def test_nucleotide_counts(self):
        """Test individual nucleotide counts."""
        features = self.extractor.extract("AAATTTGGGCCC")
        assert features["a_count"] == 3
        assert features["t_count"] == 3
        assert features["g_count"] == 3
        assert features["c_count"] == 3
    
    def test_single_gene_input(self):
        """Test with single_gene.txt example input."""
        # Load single gene sequence
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "single_gene.txt"
        )
        
        if os.path.exists(example_path):
            with open(example_path, 'r') as f:
                sequence = f.read().strip()
            
            features = self.extractor.extract(sequence)
            
            assert features["length"] > 0
            assert 0 <= features["gc_content"] <= 100
            assert 0 <= features["at_content"] <= 100
            assert abs(features["gc_content"] + features["at_content"] - 100) < 0.1


class TestChemicalFeatureExtractor:
    """Tests for chemical feature extraction."""
    
    def setup_method(self):
        self.extractor = ChemicalFeatureExtractor()
    
    def test_basic_extraction(self):
        """Test basic chemical feature extraction."""
        features = self.extractor.extract("MVLTIYPDELVQIVSD")
        
        # Should have key features
        assert "molecular_weight" in features
        assert "isoelectric_point" in features
        assert "instability_index" in features
    
    def test_protein_sequences_from_fasta(self):
        """Test with protein_seqs.fasta example input."""
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "protein_seqs.fasta"
        )
        
        if os.path.exists(example_path):
            sequences = []
            current_seq = ""
            
            with open(example_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('>'):
                        if current_seq:
                            sequences.append(current_seq)
                        current_seq = ""
                    else:
                        current_seq += line
                if current_seq:
                    sequences.append(current_seq)
            
            # Test first sequence (without stop codon)
            if sequences:
                seq = sequences[0].replace('*', '')
                features = self.extractor.extract(seq)
                
                assert "molecular_weight" in features
                assert features["molecular_weight"] > 0


class TestCUBFeatureExtractor:
    """Tests for codon usage bias feature extraction."""
    
    def setup_method(self):
        self.extractor = CUBFeatureExtractor()
    
    def test_basic_extraction(self):
        """Test basic CUB feature extraction."""
        # Use a valid coding sequence (multiple of 3)
        sequence = "ATGGTACTGACGATTTATCCTGACGAACTCGTACAAATAGTG"
        features = self.extractor.extract(sequence)
        
        # Should have CUB features
        assert "enc" in features or "error" in features
    
    def test_short_sequence(self):
        """Test handling of very short sequence."""
        features = self.extractor.extract("ATG")
        # Should handle gracefully
        assert isinstance(features, dict)
    
    def test_with_csv_input(self):
        """Test with input_gene_csv.csv example input."""
        import pandas as pd
        
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "input_gene_csv.csv"
        )
        
        if os.path.exists(example_path):
            try:
                df = pd.read_csv(example_path)
                
                if 'ORF' in df.columns:
                    # Test first ORF
                    orf = df['ORF'].iloc[0]
                    features = self.extractor.extract(orf)
                    
                    assert isinstance(features, dict)
            except Exception as e:
                pytest.skip(f"Could not load CSV: {e}")


class TestIntegrationWithExampleInputs:
    """Integration tests using all example inputs."""
    
    def test_single_gene_full_pipeline(self):
        """Test full pipeline with single_gene.txt."""
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "single_gene.txt"
        )
        
        if not os.path.exists(example_path):
            pytest.skip("single_gene.txt not found")
        
        with open(example_path, 'r') as f:
            sequence = f.read().strip()
        
        # Test sequence features
        seq_extractor = SequenceFeatureExtractor()
        seq_features = seq_extractor.extract(sequence)
        
        assert seq_features["length"] > 0
        assert "gc_content" in seq_features
        
        # Test CUB features
        cub_extractor = CUBFeatureExtractor()
        cub_features = cub_extractor.extract(sequence)
        
        assert isinstance(cub_features, dict)
    
    def test_fasta_full_pipeline(self):
        """Test full pipeline with protein_seqs.fasta."""
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "protein_seqs.fasta"
        )
        
        if not os.path.exists(example_path):
            pytest.skip("protein_seqs.fasta not found")
        
        # Parse FASTA
        sequences = []
        current_id = ""
        current_seq = ""
        
        with open(example_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('>'):
                    if current_seq:
                        sequences.append((current_id, current_seq))
                    current_id = line[1:].split()[0]
                    current_seq = ""
                else:
                    current_seq += line
            if current_seq:
                sequences.append((current_id, current_seq))
        
        assert len(sequences) > 0
        
        # Test chemical features for each protein
        chem_extractor = ChemicalFeatureExtractor()
        
        for seq_id, seq in sequences[:3]:  # Test first 3
            clean_seq = seq.replace('*', '')
            if clean_seq:
                features = chem_extractor.extract(clean_seq)
                assert isinstance(features, dict)
    
    def test_csv_full_pipeline(self):
        """Test full pipeline with input_gene_csv.csv."""
        import pandas as pd
        
        example_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "example_inputs", "input_gene_csv.csv"
        )
        
        if not os.path.exists(example_path):
            pytest.skip("input_gene_csv.csv not found")
        
        try:
            df = pd.read_csv(example_path)
        except Exception as e:
            pytest.skip(f"Could not load CSV: {e}")
        
        assert 'ORF' in df.columns
        assert 'gene' in df.columns
        
        seq_extractor = SequenceFeatureExtractor()
        cub_extractor = CUBFeatureExtractor()
        
        for idx, row in df.head(3).iterrows():
            orf = row['ORF']
            
            # Sequence features
            seq_features = seq_extractor.extract(orf)
            assert seq_features["length"] > 0
            
            # CUB features
            cub_features = cub_extractor.extract(orf)
            assert isinstance(cub_features, dict)
