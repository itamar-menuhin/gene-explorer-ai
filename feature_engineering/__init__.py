
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
from .biotite_structure_features import BiotiteStructureFeaturesMixin
from .hmmer_features import PfamFeaturesMixin, InterProFeaturesMixin
from .chemical import ChemicalFeaturesMixin
from .sequence_features import SequenceFeaturesMixin
from .sorf import SORFFeaturesMixin
from .lfe import LFEFeaturesMixin
from .cub import CUBFeaturesMixin
from .disorder import DisorderFeaturesMixin

__all__ = [
	"NucleotideSequence",
	"AminoAcidSequence",
	"batch_calculate_features",
	"JasparMotifFeaturesMixin",
	"BiotiteStructureFeaturesMixin",
	"PfamFeaturesMixin",
	"InterProFeaturesMixin",
	"ChemicalFeaturesMixin",
	"SequenceFeaturesMixin",
	"SORFFeaturesMixin",
	"LFEFeaturesMixin",
	"CUBFeaturesMixin",
	"DisorderFeaturesMixin",
]
