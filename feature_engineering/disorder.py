import pandas as pd
import numpy as np
import subprocess
from subprocess import check_output
from io import StringIO
from disorder.IUPred.iupred3 import iupred
from .universal_feature_mixin import UniversalFeatureMixin
from feature_engineering.windowed import windowed_feature

class DisorderFeaturesMixin(UniversalFeatureMixin):
    @windowed_feature
    def calc_iupred_column(self, seq):
        """
        Expects: Amino acid sequence object or nucleotide sequence object (translated automatically)
        Returns: List or array of IUPred disorder scores for each residue
        """
        if hasattr(seq, 'amino_acid_sequence'):
            seq_aa = seq.amino_acid_sequence
        else:
            seq_aa = seq
        return iupred(seq_aa)[0]

    @windowed_feature
    def calc_moreronn_column(self, seq):
        """
        Expects: Amino acid sequence object or nucleotide sequence object (translated automatically)
        Returns: List or array of MoreRONN disorder scores for each residue
        """
        if hasattr(seq, 'amino_acid_sequence'):
            seq_aa = seq.amino_acid_sequence
        else:
            seq_aa = seq
        out = check_output(f"echo {seq_aa} | ./disorder/MoreRONN -s", shell=True, stderr=subprocess.DEVNULL)
        out = StringIO(out.decode('utf-8'))
        df_ronn = pd.read_csv(out, sep="\t", comment=">", header=None, names=["aa", "moreronn_score"]).dropna()
        return list(df_ronn["moreronn_score"])

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract disorder features for a single sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        feature_funcs = {
            "iupred_column": lambda args={}: self.calc_iupred_column(sequence),
            "moreronn_column": lambda args={}: self.calc_moreronn_column(sequence),
        }
        results = {}
        if features_json:
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    args = dict(v)
                    if "reference_set" in args or reference_set is not None:
                        args["reference_set"] = args.get("reference_set", reference_set)
                    results[k] = feature_funcs[k](args) if k in feature_funcs else None
        else:
            for k, func in feature_funcs.items():
                results[k] = func()
        return results