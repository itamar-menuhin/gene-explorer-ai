
"""
feature_engineering: A toolkit for biological sequence and structure feature extraction.

Usage:
	from feature_engineering import (
		NucleotideSequence, AminoAcidSequence,
		batch_calculate_features,
		JasparMotifFeaturesMixin, BiotiteStructureFeaturesMixin,
		PfamFeaturesMixin, InterProFeaturesMixin,
		ChemicalFeaturesMixin, SequenceFeaturesMixin,
		SORFFeaturesMixin, LFEFeaturesMixin, CUBFeaturesMixin, DisorderFeaturesMixin
	)

	# Single sequence
	seq_obj = AminoAcidSequence("MKT...AA")
	features = seq_obj.chemical_features()

	# Batch (pandas Series)
	import pandas as pd
	seqs = pd.Series(["MKT...AA", "GHI...AA"])
	df = batch_calculate_features(seqs, {"chemical_features": True})
"""

from .sequence import NucleotideSequence, AminoAcidSequence
from .batch import batch_calculate_features
from .jaspar_motif_features import JasparMotifFeaturesMixin

# Optional imports - may not be available in all environments
try:
    from .biotite_structure_features import BiotiteStructureFeaturesMixin
except ImportError:
    BiotiteStructureFeaturesMixin = None

try:
    from .hmmer_features import PfamFeaturesMixin, InterProFeaturesMixin
except ImportError:
    PfamFeaturesMixin = None
    InterProFeaturesMixin = None

from .chemical import ChemicalFeaturesMixin
from .sequence_features import SequenceFeaturesMixin

try:
    from .sorf import SORFFeaturesMixin
except ImportError:
    SORFFeaturesMixin = None

try:
    from .lfe import LFEFeaturesMixin
except ImportError:
    LFEFeaturesMixin = None

from .cub import CUBFeaturesMixin

try:
    from .disorder import DisorderFeaturesMixin
except ImportError:
    DisorderFeaturesMixin = None

__all__ = [
	"NucleotideSequence",
	"AminoAcidSequence",
	"batch_calculate_features",
	"JasparMotifFeaturesMixin",
	"ChemicalFeaturesMixin",
	"SequenceFeaturesMixin",
	"CUBFeaturesMixin",
]

# Add optional exports if available
if SORFFeaturesMixin:
    __all__.append("SORFFeaturesMixin")
if LFEFeaturesMixin:
    __all__.append("LFEFeaturesMixin")
if DisorderFeaturesMixin:
    __all__.append("DisorderFeaturesMixin")
if BiotiteStructureFeaturesMixin:
    __all__.append("BiotiteStructureFeaturesMixin")
if PfamFeaturesMixin:
    __all__.append("PfamFeaturesMixin")
if InterProFeaturesMixin:
    __all__.append("InterProFeaturesMixin")
