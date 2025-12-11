import os
import tempfile
import urllib.request
import gzip
import pyhmmer
import numpy as np
from .universal_feature_mixin import UniversalFeatureMixin

class PfamFeaturesMixin(UniversalFeatureMixin):
    """
    Mixin for extracting Pfam domain features from amino acid sequences using pyhmmer.
    Expects: Amino acid sequence string (standard 20 AA, no stop codon)
    Returns: Dictionary of Pfam domain features for each sequence
    """
    pfam_url = "ftp://ftp.ebi.ac.uk/pub/databases/Pfam/current_release/Pfam-A.hmm.gz"
    pfam_path = None
    hmm_list = None

    @classmethod
    def setup_pfam_db(cls, pfam_path=None):
        cls.pfam_path = pfam_path or cls._fetch_pfam_hmm()
        cls.hmm_list = cls._load_hmm_db(cls.pfam_path)

    @classmethod
    def _fetch_pfam_hmm(cls):
        tmp_path = os.path.join(tempfile.gettempdir(), "Pfam-A.hmm.gz")
        if not os.path.exists(tmp_path):
            urllib.request.urlretrieve(cls.pfam_url, tmp_path)
        hmm_path = tmp_path.rstrip(".gz")
        if not os.path.exists(hmm_path):
            with gzip.open(tmp_path, "rb") as f_in, open(hmm_path, "wb") as f_out:
                f_out.write(f_in.read())
        return hmm_path

    @classmethod
    def _load_hmm_db(cls, hmm_path):
        hmm_db = pyhmmer.plan7.HMMFile(hmm_path)
        return list(hmm_db)

    def pfam_features(self, seq, name="prot"):
        """
        Expects: Amino acid sequence string
        Returns: Dictionary of Pfam domain features for the sequence
        """
        # All imports at top of file
        if self.hmm_list is None:
            raise RuntimeError("Pfam database not loaded. Call setup_pfam_db() first.")
        seq_str = str(seq)
        digital_seq = pyhmmer.easel.DigitalSequence(name=name, sequence=seq_str)
        hits = pyhmmer.plan7.hmmsearch(self.hmm_list, digital_seq)
        domains = []
        for hit in hits:
            for domain in hit.domains:
                domains.append({
                    "name": domain.name.decode() if hasattr(domain.name, 'decode') else str(domain.name),
                    "bitscore": domain.score,
                    "start": domain.env_from,
                    "end": domain.env_to
                })
        sequence_len = len(seq_str)
        if not domains:
            return {
                "pfam_count": 0,
                "pfam_unique": 0,
                "pfam_architecture": "",
                "pfam_bitscore_mean": 0.0,
                "pfam_bitscore_max": 0.0,
                "pfam_bitscore_std": 0.0,
                "pfam_total_coverage": 0.0,
                "pfam_largest_domain_frac": 0.0,
                "pfam_mean_domain_length": 0.0,
                "pfam_first_domain_pos": 0.0,
                "pfam_last_domain_pos": 0.0,
                "pfam_interdomain_avg_gap": 0.0
            }
        names = [d["name"] for d in domains]
        bitscores = [d["bitscore"] for d in domains]
        positions = sorted([(d["start"], d["end"]) for d in domains])
        lengths = [end - start + 1 for start, end in positions]
        gaps = [positions[i+1][0] - positions[i][1] for i in range(len(positions)-1)]
        total_coverage = sum(lengths) / sequence_len if sequence_len > 0 else 0.0
        architecture = "|".join(names)
        return {
            "pfam_count": len(names),
            "pfam_unique": len(set(names)),
            "pfam_architecture": architecture,
            "pfam_bitscore_mean": np.mean(bitscores),
            "pfam_bitscore_max": np.max(bitscores),
            "pfam_bitscore_std": np.std(bitscores) if len(bitscores) > 1 else 0.0,
            "pfam_total_coverage": round(total_coverage, 3),
            "pfam_largest_domain_frac": max(lengths) / sequence_len if sequence_len > 0 else 0.0,
            "pfam_mean_domain_length": np.mean(lengths),
            "pfam_first_domain_pos": positions[0][0] / sequence_len,
            "pfam_last_domain_pos": positions[-1][1] / sequence_len,
            "pfam_interdomain_avg_gap": np.mean(gaps) if gaps else 0.0
        }

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract Pfam domain features for a single amino acid sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        # Setup DB if not already loaded
        if self.hmm_list is None:
            self.setup_pfam_db()
        # Allow for per-feature args
        args = kwargs.copy()
        seq = sequence
        name = args.get("name", "prot")
        # Feature selection
        results = {}
        feature_funcs = {
            "pfam": lambda a: self.pfam_features(seq, name=name),
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


# InterPro features via REST API
import requests
import time
import pandas as pd
import io

INTERPRO_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/run"
STATUS_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/status"
RESULT_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/result"

class InterProFeaturesMixin(UniversalFeatureMixin):
    """
    Mixin for extracting InterPro domain features from amino acid sequences using the InterProScan REST API.
    Expects: Amino acid sequence string (standard 20 AA, no stop codon)
    Returns: Dictionary of InterPro domain features for each sequence
    """
    INTERPRO_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/run"
    STATUS_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/status"
    RESULT_URL = "https://www.ebi.ac.uk/Tools/services/rest/iprscan5/result"

    def interpro_features(self, sequence: str, email: str = None) -> dict:
        """
        Submit protein sequence to InterProScan REST API and extract rich functional domain features.
        Returns: Dictionary of expanded InterPro domain features for the sequence
        """
        # All imports at top of file
        # Submit the sequence
        data = {
            "sequence": sequence,
            "email": email or "example@example.com",
            "stype": "protein",
            "format": "TSV"
        }
        response = requests.post(self.INTERPRO_URL, data=data)
        response.raise_for_status()
        job_id = response.text.strip()

        # Poll for completion
        while True:
            status = requests.get(f"{self.STATUS_URL}/{job_id}").text.strip()
            if status in ("FINISHED", "SUCCESS"):
                break
            elif status in ("FAILURE", "ERROR"):
                raise RuntimeError(f"InterProScan failed for job {job_id}")
            time.sleep(5)

        # Fetch results as TSV
        tsv_data = requests.get(f"{self.RESULT_URL}/{job_id}/tsv").text
        df = pd.read_csv(io.StringIO(tsv_data), sep="\t", header=None)
        df.columns = [
            "seq_id", "md5", "length", "analysis", "signature_acc", "signature_desc",
            "start", "end", "score", "status", "date", "interpro_acc",
            "interpro_desc", "go_terms", "pathways"
        ]

        sequence_len = int(df["length"].iloc[0]) if not df.empty else len(sequence)
        domain_locs = df[["start", "end"]].dropna().astype(int).values.tolist()
        domain_bases = sum(e - s + 1 for s, e in domain_locs)
        domain_lengths = [e - s + 1 for s, e in domain_locs]
        gaps = [domain_locs[i+1][0] - domain_locs[i][1] for i in range(len(domain_locs)-1)] if len(domain_locs) > 1 else []
        architecture = "|".join(df["signature_acc"].dropna().astype(str).tolist())
        interpro_architecture = "|".join(df["interpro_acc"].dropna().astype(str).tolist())
        most_freq_domain = df["signature_acc"].mode().iloc[0] if not df["signature_acc"].mode().empty else ""
        most_freq_interpro = df["interpro_acc"].mode().iloc[0] if not df["interpro_acc"].mode().empty else ""
        unique_interpro_desc = ";".join(sorted(df["interpro_desc"].dropna().unique()))
        unique_signature_desc = ";".join(sorted(df["signature_desc"].dropna().unique()))
        go_terms = ";".join(sorted({go for cell in df["go_terms"].dropna() for go in cell.split("|")}))
        pathways = ";".join(sorted({pw for cell in df["pathways"].dropna() for pw in cell.split("|")}))

        features = {
            "ipr_domain_count": len(df),
            "ipr_domain_unique": df["signature_acc"].nunique(),
            "ipr_interpro_count": df["interpro_acc"].nunique(),
            "ipr_domain_coverage": round(domain_bases / sequence_len, 3) if sequence_len > 0 else 0.0,
            "ipr_domain_architecture": architecture,
            "ipr_interpro_architecture": interpro_architecture,
            "ipr_most_freq_domain": most_freq_domain,
            "ipr_most_freq_interpro": most_freq_interpro,
            "ipr_unique_interpro_desc": unique_interpro_desc,
            "ipr_unique_signature_desc": unique_signature_desc,
            "ipr_go_terms": go_terms,
            "ipr_pathways": pathways,
            "ipr_domain_length_mean": np.mean(domain_lengths) if domain_lengths else 0.0,
            "ipr_domain_length_max": max(domain_lengths) if domain_lengths else 0.0,
            "ipr_domain_length_std": np.std(domain_lengths) if len(domain_lengths) > 1 else 0.0,
            "ipr_first_domain_pos": domain_locs[0][0] / sequence_len if domain_locs else 0.0,
            "ipr_last_domain_pos": domain_locs[-1][1] / sequence_len if domain_locs else 0.0,
            "ipr_interdomain_avg_gap": np.mean(gaps) if gaps else 0.0,
        }
        return features

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract InterPro domain features for a single amino acid sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        args = kwargs.copy()
        email = args.get("email", None)
        results = {}
        feature_funcs = {
            "interpro": lambda a: self.interpro_features(sequence, email=a.get("email", email)),
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
