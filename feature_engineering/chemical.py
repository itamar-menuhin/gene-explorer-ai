from .universal_feature_mixin import UniversalFeatureMixin

class ChemicalFeaturesMixin(UniversalFeatureMixin):

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
            "aliphatic_index": lambda args={}: pa.aliphatic_index() if pa else self.aliphatic_index(),
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
