"""
Pytest configuration and fixtures.
"""
import pytest
import sys
import os

# Ensure proper paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@pytest.fixture
def sample_nucleotide_sequence():
    """Sample nucleotide sequence for testing."""
    return "ATGGTACTGACGATTTATCCTGACGAACTCGTACAAATAGTGTCTGATAAAATTGCTTCA"


@pytest.fixture
def sample_amino_acid_sequence():
    """Sample amino acid sequence for testing."""
    return "MVLTIYPDELVQIVSDKIASNKGKITLNQLWDISGKYFDLSDKKVKQFVLSCVILKKDIE"


@pytest.fixture
def sample_fasta_sequences():
    """Sample FASTA formatted sequences."""
    return [
        ("YAL069W", "MIVNNTHVLTLPLYTTTTCHTHPHLYTDFTYAHGCYSIYHLKLTLLSDSTSLHGPSLTES"),
        ("YAL068W-A", "MHGTCLSGLYPVPFTHNAHHYPHFDIYISFGGPKYCITALNTYVIPLLHHILTTPFIYTY"),
        ("YAL068C", "MVKLTSIAAGVAAIAATASATTTLAQSDERVNLVELGVYVSDIRAHLAQYYMFQAAHPTE"),
    ]


@pytest.fixture
def sample_csv_data():
    """Sample CSV data structure."""
    return [
        {"gene": "YAL001C", "ORF": "ATGGTACTGACGATTTAT"},
        {"gene": "YAL002W", "ORF": "ATGGAGCAAAATGGCCTT"},
        {"gene": "YAL003W", "ORF": "ATGGCATCCACCGATTTC"},
    ]
