from .universal_feature_mixin import UniversalFeatureMixin

try:
    from Bio.SeqUtils.ProtParam import ProteinAnalysis
    HAS_PROTPARAM = True
except ImportError:
    HAS_PROTPARAM = False

class ChemicalFeaturesMixin(UniversalFeatureMixin):
    
    def _get_protein_analysis(self):
        """Get ProteinAnalysis object for the amino acid sequence."""
        if not HAS_PROTPARAM:
            return None
        if not hasattr(self, 'amino_acid_sequence'):
            return None
        try:
            # Remove stop codons for ProteinAnalysis
            seq = self.amino_acid_sequence.replace('*', '')
            if not seq:
                return None
            return ProteinAnalysis(seq)
        except Exception:
            return None
    
    def gravy(self):
        """Calculate GRAVY (Grand Average of Hydropathy) score."""
        # Simple implementation if ProteinAnalysis is not available
        if not hasattr(self, 'amino_acid_sequence'):
            return 0.0
        # Kyte-Doolittle hydropathy values
        kd = {
            'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
            'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
            'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
            'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
        }
        seq = self.amino_acid_sequence.replace('*', '')
        if not seq:
            return 0.0
        return sum(kd.get(aa, 0) for aa in seq) / len(seq)
    
    def aliphatic_index(self):
        """Calculate aliphatic index."""
        if not hasattr(self, 'amino_acid_sequence'):
            return 0.0
        seq = self.amino_acid_sequence.replace('*', '')
        if not seq:
            return 0.0
        a = seq.count('A')
        v = seq.count('V')
        i = seq.count('I')
        l = seq.count('L')
        return (a + 2.9 * v + 3.9 * (i + l)) / len(seq) * 100
    
    def net_charge_per_residue(self):
        """Calculate net charge per residue at pH 7."""
        if not hasattr(self, 'amino_acid_sequence'):
            return 0.0
        seq = self.amino_acid_sequence.replace('*', '')
        if not seq:
            return 0.0
        # Positive charges
        pos = seq.count('K') + seq.count('R') + seq.count('H')
        # Negative charges
        neg = seq.count('D') + seq.count('E')
        return (pos - neg) / len(seq)

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract chemical features for a single amino acid sequence.
        Returns: dict of features. Supports per-feature args and reference_set.
        """
        self.amino_acid_sequence = sequence
        pa = self._get_protein_analysis()
        # Define feature functions and their default args
        feature_funcs = {
            "isoelectric_point": lambda args={}: pa.isoelectric_point() if pa else 0.0,
            "instability_index": lambda args={}: pa.instability_index() if pa else 0.0,
            "average_flexibility": lambda args={}: (sum(pa.flexibility()) / len(pa.flexibility()) if pa and pa.flexibility() else 0.0),
            "aromaticity_index": lambda args={}: pa.aromaticity() if pa else 0.0,
            "net_charge_per_residue": lambda args={}: self.net_charge_per_residue(),
            "gravy": lambda args={}: pa.gravy() if pa else self.gravy(),
            "molecular_weight": lambda args={}: pa.molecular_weight() if pa else 0.0,
            "aliphatic_index": lambda args={}: self.aliphatic_index(),  # ProteinAnalysis doesn't have this
            "helix_frac": lambda args={}: (pa.secondary_structure_fraction()[0] if pa else 0.0),
            "turn_frac": lambda args={}: (pa.secondary_structure_fraction()[1] if pa else 0.0),
            "sheet_frac": lambda args={}: (pa.secondary_structure_fraction()[2] if pa else 0.0),
            "molar_extinction_reduced": lambda args={}: (pa.molar_extinction_coefficient()[0] if pa else 0),
            "molar_extinction_cystine": lambda args={}: (pa.molar_extinction_coefficient()[1] if pa else 0),
        }
        # Determine which features to calculate and with what args
        if features_json:
            results = {}
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    # Pass reference_set if requested in args
                    args = dict(v)
                    if "reference_set" in args or reference_set is not None:
                        args["reference_set"] = args.get("reference_set", reference_set)
                    results[k] = feature_funcs[k](args) if k in feature_funcs else None
            return results
        # Default: calculate all
        return {k: func() for k, func in feature_funcs.items()}
