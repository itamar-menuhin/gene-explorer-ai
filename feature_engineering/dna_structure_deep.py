import pandas as pd
from .universal_feature_mixin import UniversalFeatureMixin

try:
    from deepdnashape import DeepDNAshape
except ImportError:
    raise ImportError("Please install deepDNAshape: pip install deepdnashape")

class DNAStructureDeepFeaturesMixin(UniversalFeatureMixin):
    """
    Mixin for predicting DNA shape features using deepDNAshape.
    Implements the unified _extract_features_single interface.
    """
    def __init__(self, model_path=None):
        self.model = DeepDNAshape(model_path=model_path) if model_path else DeepDNAshape()

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract DNA shape features for a single sequence.
        Supports per-feature args and features_json selection.
        Returns: dict of features (all or selected shape features).
        """
        sequence = sequence.upper()
        features = self.model.predict(sequence)
        # features is a dict: {feature_name: [values]}
        # If features_json is provided, filter output
        if features_json:
            filtered = {k: v for k, v in features.items() if k in features_json and features_json[k].get("enabled", True)}
            return filtered
        return features
