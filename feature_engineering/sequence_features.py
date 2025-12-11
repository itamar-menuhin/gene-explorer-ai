from collections import Counter
import re
import math
from feature_engineering.windowed import windowed_feature
from .universal_feature_mixin import UniversalFeatureMixin

class SequenceFeaturesMixin(UniversalFeatureMixin):
    @windowed_feature
    def cpg_oe_ratio(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: CpG dinucleotide frequency and observed/expected ratio (dict)
        """
        seq_str = seq.upper() if hasattr(seq, 'upper') else str(seq)
        n = len(seq_str)
        cpg_count = seq_str.count('CG')
        c_count = seq_str.count('C')
        g_count = seq_str.count('G')
        # Observed/Expected ratio
        expected = (c_count * g_count) / n if n > 0 else 0.0
        oe_ratio = (cpg_count / expected) if expected > 0 else 0.0
        freq = cpg_count / (n - 1) if n > 1 else 0.0
        return {"cpg_freq": freq, "cpg_oe_ratio": oe_ratio}
    
    @windowed_feature
    def nuc_fraction(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: Nucleotide feature value (float)
        """
        seq = seq.upper()
        length = len(seq)
        return {f"frac_{nuc}": seq.count(nuc) / length for nuc in "ACGT"}

    @windowed_feature
    def gc_content(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: GC content (float)
        """
        from Bio.SeqUtils import gc_fraction
        seq_str = seq.upper() if hasattr(seq, 'upper') else str(seq)
        gc = gc_fraction(seq_str)
        return {"gc_content": gc}

    @windowed_feature
    def gc_content_positional(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: GC content per codon position (dict)
        """
        from Bio.SeqUtils import gc_fraction
        seq_str = seq.upper() if hasattr(seq, 'upper') else str(seq)
        gc_pos = {}
        for pos in range(3):
            pos_seq = seq_str[pos::3]
            gc_pos[f"gc_content_pos{pos+1}"] = gc_fraction(pos_seq)
        return gc_pos

    @windowed_feature
    def gc_skew(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: GC skew (float)
        """
        seq_str = seq.upper() if hasattr(seq, 'upper') else str(seq)
        g = seq_str.count('G')
        c = seq_str.count('C')
        denom = g + c
        gc_skew = (g - c) / denom if denom > 0 else 0.0
        return {"gc_skew": gc_skew}

    @windowed_feature
    def at_skew(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: AT skew (float)
        """
        seq_str = seq.upper() if hasattr(seq, 'upper') else str(seq)
        a = seq_str.count('A')
        t = seq_str.count('T')
        denom = a + t
        at_skew = (a - t) / denom if denom > 0 else 0.0
        return {"at_skew": at_skew}
    
    @windowed_feature
    def aa_kmers(self, seq):
        """
        Expects: Amino acid sequence object or nucleotide sequence object (translated automatically)
        Returns: Dictionary of all k-mer frequencies for k=1,2,3,4,5 and k-mer entropy for each k
        """
        if hasattr(seq, 'amino_acid_sequence'):
            seq_aa = seq.amino_acid_sequence
        else:
            seq_aa = seq
        k_lens = range(1, 6)
        dict_k = {}
        for k in k_lens:
            kmers = [seq_aa[i:i+k] for i in range(len(seq_aa)-k+1)]
            kmer_counts = Counter(kmers)
            total = sum(kmer_counts.values())
            # Calculate entropy
            entropy = 0.0
            for count in kmer_counts.values():
                p = count / total if total > 0 else 0
                if p > 0:
                    entropy -= p * math.log2(p)
            dict_k[f"kmer_entropy_{k}"] = entropy
            for kmer, count in kmer_counts.items():
                freq = count / total if total > 0 else 0.0
                dict_k[f"{kmer}_{k}"] = freq
        return dict_k

    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract sequence features for a single nucleotide or amino acid sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        args = kwargs.copy()
        feature_funcs = {
            "cpg_oe_ratio": lambda a={}: self.cpg_oe_ratio(sequence),
            "nuc_fraction": lambda a={}: self.nuc_fraction(sequence),
            "gc_content": lambda a={}: self.gc_content(sequence),
            "gc_content_positional": lambda a={}: self.gc_content_positional(sequence),
            "gc_skew": lambda a={}: self.gc_skew(sequence),
            "at_skew": lambda a={}: self.at_skew(sequence),
            "aa_kmers": lambda a={}: self.aa_kmers(sequence),
            "orf_length": lambda a={}: self.orf_length(sequence),
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

    @windowed_feature
    def orf_length(self, seq):
        """
        Expects: Nucleotide or amino acid sequence object
        Returns: ORF length (dict) with key indicating nt or aa
        """
        if hasattr(seq, 'nucleotide_sequence'):
            length_nt = len(seq.nucleotide_sequence)
            return {"orf_length_nt": length_nt}
        elif hasattr(seq, 'amino_acid_sequence'):
            length_aa = len(seq.amino_acid_sequence)
            return {"orf_length_aa": length_aa}
        else:
            # Plain string: assume nucleotide
            length_nt = len(str(seq))
            return {"orf_length_nt": length_nt}
