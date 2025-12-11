import ViennaRNA as VRNA
import random
from Bio.Seq import Seq
from feature_engineering.windowed import windowed_feature
from .universal_feature_mixin import UniversalFeatureMixin

class LFEFeaturesMixin(UniversalFeatureMixin):
    @staticmethod
    def random_permute_seq(seq):
        seq = seq.upper().replace('T', 'U')
        codons = [seq[i:i+3] for i in range(0, len(seq), 3) if len(seq[i:i+3]) == 3]
        aa_seq = [str(Seq(codon).translate(table="Standard")) for codon in codons]
        codon_tuples = [(codon, aa, idx) for idx, (codon, aa) in enumerate(zip(codons, aa_seq))]
        random.shuffle(codon_tuples)
        final_seq = []
        used_indices = set()
        for curr_aa in aa_seq:
            for i, (codon, aa, idx) in enumerate(codon_tuples):
                if aa == curr_aa and idx not in used_indices:
                    final_seq.append(codon)
                    used_indices.add(idx)
                    break
        final_seq = ''.join(final_seq)
        return final_seq

    @windowed_feature
    def mfe_current_sequence(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: Minimum Free Energy (MFE) of the current sequence
        """
        rna_seq = seq.upper().replace('T', 'U')
        MFE = VRNA.fold(rna_seq)
        return MFE

    @windowed_feature
    def mfe_current_gene(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: Dictionary with 'local_mfe' and 'local_dmfe' values
        """
        random_seq = self.random_permute_seq(seq)
        true_mfe = self.mfe_current_sequence(seq)
        random_mfe = self.mfe_current_sequence(random_seq)
        return {
            'local_mfe': true_mfe,
            'local_dmfe': true_mfe - random_mfe
        }

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract LFE features for a single nucleotide sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        args = kwargs.copy()
        feature_funcs = {
            "mfe_current_sequence": lambda a={}: self.mfe_current_sequence(sequence),
            "mfe_current_gene": lambda a={}: self.mfe_current_gene(sequence),
        }
        results = {}
        if features_json:
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    a = dict(v)
                    results[k] = feature_funcs[k](a) if k in feature_funcs else None
        else:
            for k, func in feature_funcs.items():
                results[k] = func(args)
        return results
