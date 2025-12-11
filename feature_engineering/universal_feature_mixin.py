import json
import pandas as pd

class UniversalFeatureMixin:
    """
    Base mixin for unified feature extraction interface.
    All feature mixins should inherit from this and implement _extract_features_single.
    Supports feature selection via features_json argument.
    """
    def extract_features(self, sequence_or_series, features_json=None, reference_set=None, **kwargs):
        """
        Extract features for a single sequence (returns dict) or batch (returns DataFrame).
        Args:
            sequence_or_series: str, list, or pandas Series of sequences
            features_json: dict or JSON string specifying which features to calculate (default: all)
            **kwargs: passed to _extract_features_single
        Returns:
            dict (single sequence) or DataFrame (batch)
        """
        if features_json is not None and isinstance(features_json, str):
            features_json = json.loads(features_json)
        if isinstance(sequence_or_series, pd.Series):
            seqs = sequence_or_series.values
            idx = sequence_or_series.index
        elif isinstance(sequence_or_series, list):
            seqs = sequence_or_series
            idx = None
        else:
            # Single sequence
            return self._extract_features_single(sequence_or_series, features_json=features_json, reference_set=reference_set, **kwargs)
        # Batch mode
        results = [self._extract_features_single(seq, features_json=features_json, reference_set=reference_set, **kwargs) for seq in seqs]
        df = pd.DataFrame(results, index=idx)
        return df

    def _extract_features_single(self, sequence, features_json=None, reference_set=None):
        """
        Implement this in child mixins to extract features for a single sequence.
        features_json: dict of {feature_name: {"enabled": bool, ...args}}
        Returns: dict of features
        """
        raise NotImplementedError("Child mixin must implement _extract_features_single")
