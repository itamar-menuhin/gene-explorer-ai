from Bio import motifs
from Bio import SeqIO
from Bio.Seq import Seq
import requests
import os
import tempfile
import pandas as pd
from .universal_feature_mixin import UniversalFeatureMixin

class JasparMotifFeaturesMixin(UniversalFeatureMixin):
    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract JASPAR motif features for a single nucleotide sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        args = kwargs.copy()
        threshold_frac = args.get("threshold_frac", 0.8)
        tax_group = args.get("tax_group", None)
        # Feature selection
        results = {}
        feature_funcs = {
            "jaspar_motif": lambda a: self.jaspar_motif_features(sequence, threshold_frac=a.get("threshold_frac", threshold_frac), tax_group=a.get("tax_group", tax_group)),
        }
        if features_json:
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    a = dict(v)
                    results[k] = feature_funcs[k](a) if k in feature_funcs else None
        else:
            for k, func in feature_funcs.items():
                results[k] = func(args)
        return results
    """
    Mixin for extracting JASPAR motif features from nucleotide sequences using Biopython.
    Downloads JASPAR motifs and scans input sequence(s) for matches.
    Returns: Dictionary or DataFrame of motif features for the sequence(s).
    """
    JASPAR_URL = "http://jaspar.genereg.net/download/data/2024/CORE/JASPAR2024_CORE_vertebrates_non-redundant_pfms_jaspar.txt"
    jaspar_path = None
    motif_list = None

    @classmethod
    def setup_jaspar_db(cls, jaspar_path=None, tax_group="vertebrates"):
        """
        Load JASPAR motifs for a specified taxonomic group (default: vertebrates).
        Loads all relevant collections for the tax_group.
        """
        try:
            from Bio.motifs.jaspar.db import JASPAR5
            jaspar_db = JASPAR5()
            # Get all available collections for the tax_group
            collections = jaspar_db.list_collections()
            motifs_all = []
            for coll in collections:
                # Only load collections that have motifs for the tax_group
                motifs_coll = jaspar_db.fetch_motifs(collection=coll, tax_group=tax_group)
                if motifs_coll:
                    motifs_all.extend(motifs_coll)
            cls.motif_list = motifs_all
        except Exception:
            # Fallback: only CORE collection is supported for file download
            cls.jaspar_path = jaspar_path or cls._fetch_jaspar_motifs()
            with open(cls.jaspar_path) as handle:
                cls.motif_list = list(motifs.parse(handle, "jaspar"))

    @classmethod
    def _fetch_jaspar_motifs(cls):
        tmp_path = os.path.join(tempfile.gettempdir(), "JASPAR2024_CORE_vertebrates_pfms.txt")
        if not os.path.exists(tmp_path):
            response = requests.get(cls.JASPAR_URL)
            response.raise_for_status()
            with open(tmp_path, "wb") as f:
                f.write(response.content)
        return tmp_path

    @staticmethod
    def scan_sequence_pwm(pwm, sequence, threshold_frac=0.8):
        scores = []
        positions = []
        for pos, score in pwm.search(sequence):
            scores.append(score)
            positions.append(pos)
        if not scores:
            return 0.0, 0, 0.0, False
        max_score = max(scores)
        threshold = max_score * threshold_frac
        matches = [s for s in scores if s >= threshold]
        match_positions = [p for s, p in zip(scores, positions) if s >= threshold]
        count = len(matches)
        mean_score = sum(matches) / count if count > 0 else 0.0
        clustered = any(abs(p1 - p2) <= 50 for i, p1 in enumerate(match_positions) for p2 in match_positions[i+1:])
        return max_score, count, mean_score, clustered

    def jaspar_motif_features(self, sequence, threshold_frac=0.8, tax_group=None):
        """
        Scans a single nucleotide sequence for JASPAR motif matches and returns expanded features.
        Optionally specify tax_group to reload motifs for a different group.
        """
        if tax_group is not None:
            self.setup_jaspar_db(tax_group=tax_group)
        if self.motif_list is None:
            raise RuntimeError("JASPAR motifs not loaded. Call setup_jaspar_db() first.")
        seq = Seq(str(sequence).upper())
        motif_features = {}
        total_matches = 0
        unique_motifs = 0
        motif_names_matched = []
        for motif in self.motif_list:
            motif_id = motif.name.replace(" ", "_")
            pwm = motif.counts.normalize(pseudocounts=0.5).log_odds()
            ms, cnt, mn, cl = self.scan_sequence_pwm(pwm, seq, threshold_frac)
            motif_features[f"{motif_id}_max_score"] = ms
            motif_features[f"{motif_id}_match_count"] = cnt
            motif_features[f"{motif_id}_mean_score"] = mn
            motif_features[f"{motif_id}_clustered"] = cl
            if cnt > 0:
                motif_names_matched.append(motif_id)
            total_matches += cnt
        motif_features["total_matches"] = total_matches
        motif_features["unique_motifs_matched"] = len(motif_names_matched)
        motif_features["motif_names_matched"] = ";".join(motif_names_matched)
        return motif_features

    def jaspar_motif_features_batch(self, sequence_series, threshold_frac=0.8, tax_group=None):
        """
        Scans a batch of nucleotide sequences for JASPAR motif matches and returns a DataFrame of features.
        Optionally specify tax_group to reload motifs for a different group.
        """
        if tax_group is not None:
            self.setup_jaspar_db(tax_group=tax_group)
        if self.motif_list is None:
            raise RuntimeError("JASPAR motifs not loaded. Call setup_jaspar_db() first.")
        df = pd.DataFrame({"sequence": sequence_series})
        motif_prefixes = [motif.name.replace(" ", "_") for motif in self.motif_list]
        for motif in self.motif_list:
            motif_id = motif.name.replace(" ", "_")
            pwm = motif.counts.normalize(pseudocounts=0.5).log_odds()
            f_max, f_count, f_mean, f_clustered = [], [], [], []
            for seq in sequence_series:
                s = Seq(str(seq).upper())
                ms, cnt, mn, cl = self.scan_sequence_pwm(pwm, s, threshold_frac)
                f_max.append(ms)
                f_count.append(cnt)
                f_mean.append(mn)
                f_clustered.append(cl)
            df[f"{motif_id}_max_score"] = f_max
            df[f"{motif_id}_match_count"] = f_count
            df[f"{motif_id}_mean_score"] = f_mean
            df[f"{motif_id}_clustered"] = f_clustered
        df["total_matches"] = df[[f"{m}_match_count" for m in motif_prefixes]].sum(axis=1)
        df["unique_motifs_matched"] = df[[f"{m}_match_count" for m in motif_prefixes]].gt(0).sum(axis=1)
        return df
