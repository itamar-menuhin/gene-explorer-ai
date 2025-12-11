import numpy as np
import pandas as pd
from typing import Union
from .universal_feature_mixin import UniversalFeatureMixin

class ChimeraARSFeaturesMixin(UniversalFeatureMixin):
    """
    Mixin for calculating ChimeraARS scores using a suffix array DataFrame.
    Supports single sequence and batch extraction, features_json, and reference_set.
    """
    def __init__(self, suffix_array: pd.DataFrame = None):
        self.suffix_array = suffix_array

    def score_curr_seq(self, full_seq: str, prev_score: int = 2) -> int:
        df_array = self.suffix_array
        ii = prev_score - 1
        curr_seq = full_seq[:ii]
        low = 0
        high = df_array.shape[0]
        mid = (low + high) // 2
        top_count = int(np.log2(high)) + 100
        for _ in range(top_count):
            compare_seq = df_array.loc[mid, 'seq'][:ii]
            if curr_seq == compare_seq:
                ii += 1
                curr_seq = full_seq[:ii]
            elif curr_seq < compare_seq:
                high = mid
                mid = (low + high) // 2
            else:
                low = mid
                mid = (low + high) // 2
            if high - low <= 1:
                break
        score = ii - 1
        return score

    def score_gene(self, full_seq: str, curr_ORF: Union[str, int], suffix_array=None) -> float:
        df_array = suffix_array if suffix_array is not None else self.suffix_array
        df_curr_array = df_array[df_array.ORF != curr_ORF].reset_index(drop=True)
        scores = []
        curr_score = 2
        for jj in range(len(full_seq)):
            curr_score = self.score_curr_seq(full_seq[jj:], prev_score=curr_score)
            scores.append(curr_score)
        gene_score = np.mean(scores)
        return gene_score

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract ChimeraARS score for a single sequence.
        features_json can specify 'chimeraARS' and per-feature args (e.g., ORF, gene_id, suffix_array).
        reference_set can be used as suffix_array if provided.
        Returns: dict of features
        """
        # Determine suffix_array
        suffix_array = reference_set if reference_set is not None else self.suffix_array
        # Default args
        orf = kwargs.get('orf', sequence)
        gene_id = kwargs.get('gene_id', None)
        # Feature selection and args
        enabled = True
        if features_json and 'chimeraARS' in features_json:
            v = features_json['chimeraARS']
            enabled = v.get('enabled', True)
            orf = v.get('orf', orf)
            gene_id = v.get('gene_id', gene_id)
            if 'suffix_array' in v:
                suffix_array = v['suffix_array']
        if not enabled:
            return {}
        score = self.score_gene(orf, gene_id, suffix_array=suffix_array)
        return {'chimeraARS': score}
