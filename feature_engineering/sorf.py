import re
import pandas as pd
from feature_engineering.windowed import windowed_feature
from .universal_feature_mixin import UniversalFeatureMixin

class SORFFeaturesMixin(UniversalFeatureMixin):
    sORF_wins = [30, 200]  # In codons

    @windowed_feature
    def sORF_features(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: Dictionary with sORF features including number of sORFs, max sORF length, and mean sORF length.
        """
        pot_starts = [i.start() for i in re.finditer("ATG", seq) if i.start() > 0]
        pot_stops = []
        for stop_codon in ["TAG", "TAA", "TGA"]:
            pot_stops += [i.start() for i in re.finditer(stop_codon, seq)]
        ORF_starts = []
        ORF_lens = []
        for pot_start in pot_starts:
            rel_stops = [i for i in pot_stops if i > pot_start and not (i - pot_start) % 3]
            if rel_stops:
                ORF_starts.append(pot_start)
                ORF_lens.append(min(rel_stops) + 2 - pot_start + 1)
        ORF_df = pd.DataFrame({"ORF_starts": ORF_starts, "ORF_lens": ORF_lens})
        dict_sORF = {
            "num_sORF": ORF_df.shape[0],
            "max_sORF_len": ORF_df["ORF_lens"].max(),
            "mean_sORF_len": ORF_df["ORF_lens"].mean()
        }
        for win in self.sORF_wins:
            curr_ORFs = ORF_df.loc[ORF_df["ORF_starts"] <= win * 3]
            dict_sORF[f"num_sORF_win{win}"] = curr_ORFs.shape[0]
            dict_sORF[f"max_sORF_win{win}"] = curr_ORFs["ORF_lens"].max()
            dict_sORF[f"mean_sORF_win{win}"] = curr_ORFs["ORF_lens"].mean()
        return dict_sORF

    def _extract_features_single(self, sequence, features_json=None, reference_set=None):
        """
        Extract sORF features for a single nucleotide sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        feature_funcs = {
            "sORF_features": lambda: self.sORF_features(sequence),
        }
        results = {}
        if features_json:
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    results[k] = feature_funcs[k]() if k in feature_funcs else None
        else:
            for k, func in feature_funcs.items():
                results[k] = func()
        return results
