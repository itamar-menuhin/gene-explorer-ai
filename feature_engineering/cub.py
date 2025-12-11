
import numpy as np
import re
from collections import Counter
from statistics import geometric_mean
import os
import pandas as pd
import Bio.Data.CodonTable
from codonbias.scores import (
    TrnaAdaptationIndex,
    CodonAdaptationIndex,
    EffectiveNumberOfCodons,
    RelativeCodonBiasScore,
    FrequencyOfOptimalCodons,
    RelativeSynonymousCodonUsage,
    CodonPairBias,
    DirectionalCodonBiasScore
)
from codonbias.pairwise import CodonUsageFrequencySimilarity
from .universal_feature_mixin import UniversalFeatureMixin
from .reference_loader import ReferenceSequenceSet

class CUBFeaturesMixin(UniversalFeatureMixin):

    def _get_codon_table(self):
        nt2aa = Bio.Data.CodonTable.standard_dna_table.forward_table
        aas = [aa for aa in nt2aa.values()]
        aa2nt = {aa: [x for x in nt2aa.keys() if nt2aa[x] == aa] for aa in aas}
        return aa2nt, nt2aa

    def _get_gene_dict(self, genes_csv_path):
        seq_dict = pd.read_csv(genes_csv_path, delimiter=',')
        return seq_dict.set_index('gene')['ORF'].to_dict()
    
    def calc_nTE(self, seq, genes_csv_path, rpkm_path, reference_set=None, tai_path=None, trna_path=None):
        """
        Calculate nTE for a sequence using weights calculated in-memory from genes.csv, RPKM.txt, and tAI.xls or tRNA copy numbers.
        Args:
            seq: nucleotide sequence (str)
            genes_csv_path: path to genes.csv file
            rpkm_path: path to RPKM.txt file
            tai_path: path to tAI.xls file (optional)
            trna_path: path to tRNA copy number file (optional, used if tai_path is not provided)
            reference_set: ReferenceSequenceSet (optional)
        Returns:
            nTE value (float)
        """
        # Use weights from reference_set if available, else calculate and store
        weights = None
        if reference_set is not None:
            if not hasattr(reference_set, 'nte_weights'):
                reference_set.nte_weights = reference_set.generate_weights("nte", genes_csv_path=genes_csv_path, rpkm_path=rpkm_path, tai_path=tai_path, trna_path=trna_path)
            weights = reference_set.nte_weights
        else:
            # fallback: calculate weights ad hoc
            weights = ReferenceSequenceSet(None, {}).generate_weights("nte", genes_csv_path=genes_csv_path, rpkm_path=rpkm_path, tai_path=tai_path, trna_path=trna_path)
        codons_seq = re.findall('.{3}', seq)
        nTE_scores = [weights[c] for c in codons_seq if c in weights and weights[c] > 0]
        return geometric_mean(nTE_scores)

    def calc_tAI(self, seq, reference_set=None, trna_path=None):
        """
        Expects: Nucleotide sequence object
        Returns: tAI value (float)
        """
        # Use weights from reference_set if available, else calculate and store
        weights = None
        if reference_set is not None:
            if not hasattr(reference_set, 'tai_weights'):
                reference_set.tai_weights = reference_set.generate_weights("tai", trna_path=trna_path)
            weights = reference_set.tai_weights
        else:
            weights = ReferenceSequenceSet(None, {}).generate_weights("tai", trna_path=trna_path)
        tai = TrnaAdaptationIndex(weights)
        return tai.score(seq)
    
    def _get_rca_weights(self, seq_dict, aa2nt):
        """
        Calculate codon weights for RCA from gene sequences, following utils.py logic.
        Args:
            seq_dict: dict of gene -> ORF
            aa2nt: dict of amino acid -> codons
        Returns:
            Dictionary of codon weights for RCA
        """
        codons = re.findall('.{3}', ''.join(seq_dict.values()))
        # Calculate nucleotide distribution at each position (for RCA)
        nt_dist = {}
        for n in range(3):
            curr_dist = Counter([c[n] for c in codons])
            for nt in "ACGT":
                curr_dist.setdefault(nt, 0.5)
            s = sum(curr_dist.values())
            for nt in curr_dist:
                curr_dist[nt] /= s
            nt_dist[n] = curr_dist
        RCA_w = {}
        for syn_codons in aa2nt.values():
            for codon in syn_codons:
                w_codon = codons.count(codon)
                freq_nt = nt_dist[0][codon[0]] * nt_dist[1][codon[1]] * nt_dist[2][codon[2]]
                RCA_w[codon] = (w_codon / len(codons)) / freq_nt if w_codon > 0 else 0.5
        return RCA_w

    def calc_CAI(self, seq, reference_set=None):
        """
        Calculate Codon Adaptation Index (CAI) for a nucleotide sequence.
        Returns: CAI value (float)
        """
        # Use weights from reference_set if available, else calculate and store
        if reference_set is not None:
            if not hasattr(reference_set, 'cai_weights'):
                if hasattr(reference_set, 'generate_weights'):
                    reference_set.cai_weights = reference_set.generate_weights("cai")
                else:
                    reference_set.cai_weights = ReferenceSequenceSet(None, {}).generate_weights("cai")
            weights = reference_set.cai_weights
        else:
            weights = ReferenceSequenceSet(None, {}).generate_weights("cai")
        cai = CodonAdaptationIndex(weights)
        return cai.score(seq)

    def calc_ENC(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: ENC value (float)
        """
        enc = EffectiveNumberOfCodons()
        return enc.score(seq)

    def calc_RCBS(self, seq):
        """
        Expects: Nucleotide sequence object
        Returns: RCBS value (float)
        """
        rcbs = RelativeCodonBiasScore()
        return rcbs.score(seq)

    def calc_FOP(self, seq, reference_set=None, reference_seqs=None):
        """
        Calculate Frequency of Optimal Codons (FOP) using codon-bias library.
        Args:
            seq: nucleotide sequence (str)
            reference_set: ReferenceSequenceSet (optional)
            reference_seqs: list of reference sequences (optional, legacy)
        Returns:
            FOP value (float)
        """
        # Use weights from reference_set if available, else calculate and store
        weights = None
        if reference_set is not None:
            if not hasattr(reference_set, 'fop_weights'):
                reference_set.fop_weights = reference_set.generate_weights("cai")
            weights = reference_set.fop_weights
        elif reference_seqs is not None:
            from codonbias.scores import CodonAdaptationIndex
            cai = CodonAdaptationIndex(reference_seqs)
            weights = cai.weights
        else:
            from .reference_loader import ReferenceSequenceSet
            weights = ReferenceSequenceSet(None, {}).generate_weights("cai")
        fop = FrequencyOfOptimalCodons(weights)
        return fop.score(seq)

    def calc_RSCU(self, seq):
        """
        Calculate Relative Synonymous Codon Usage (RSCU) for a sequence.
        Returns a scalar summary (mean) if the result is a dictionary, otherwise returns the scalar as-is.
        """
        rscu = RelativeSynonymousCodonUsage()
        result = rscu.score(seq)
        # If the result is a dictionary (codon -> RSCU), return the mean as a scalar summary
        if isinstance(result, dict):
            return float(np.mean(list(result.values()))) if result else float('nan')
        # If already a scalar, return as-is
        return float(result)

    def calc_CPB(self, seq):
        """
        Calculate Codon Pair Bias (CPB) using codon-bias library.
        Args:
            seq: nucleotide sequence (str)
        Returns:
            CPB value (float)
        """
        cpb = CodonPairBias()
        return cpb.score(seq)

    def calc_DCBS(self, seq):
        """
        Calculate Directional Codon Bias Score (DCBS) using codon-bias library.
        Args:
            seq: nucleotide sequence (str)
        Returns:
            DCBS value (float)
        """
        dcbs = DirectionalCodonBiasScore()
        return dcbs.score(seq)
    
    def _extract_features_single(self, sequence, features_json=None, reference_set=None, **kwargs):
        """
        Extract CUB features for a single nucleotide sequence.
        Supports per-feature args and reference_set.
        Returns: dict of features
        """
        # Use reference_set for gene dict or reference sequences if provided
        # Default args
        args = kwargs.copy()
        # Feature functions, all pass reference_set
        feature_funcs = {
            "nTE": lambda a: self.calc_nTE(sequence, a.get("genes_csv_path"), a.get("rpkm_path"), reference_set=reference_set, tai_path=a.get("tai_path")),
            "tAI": lambda a: self.calc_tAI(sequence, reference_set=reference_set, trna_path=a.get("trna_path")),
            "CAI": lambda a: self.calc_CAI(sequence, reference_set=reference_set),
            "ENC": lambda a: self.calc_ENC(sequence),
            "RCBS": lambda a: self.calc_RCBS(sequence),
            "FOP": lambda a: self.calc_FOP(sequence, reference_set=reference_set, reference_seqs=a.get("reference_seqs")),
            "RSCU": lambda a: self.calc_RSCU(sequence),
            "CPB": lambda a: self.calc_CPB(sequence),
            "DCBS": lambda a: self.calc_DCBS(sequence),
            "CUFS": lambda a: self.calc_CUFS(a.get("seq1", sequence), a.get("seq2")),
            "CUB": lambda a: self.calc_CUB(sequence, a.get("genes_csv_path"), first_last=a.get("first_last", 50)),
        }
        # Feature selection and args
        results = {}
        if features_json:
            for k, v in features_json.items():
                if isinstance(v, dict) and v.get("enabled", True):
                    a = dict(v)
                    a["reference_set"] = reference_set
                    val = feature_funcs[k](a) if k in feature_funcs else None
                    # If the result is a dict, convert to mean float (should not happen, but for safety)
                    if isinstance(val, dict):
                        val = float(np.mean(list(val.values()))) if val else float('nan')
                    results[k] = val
        else:
            for k, func in feature_funcs.items():
                val = func(args)
                if isinstance(val, dict):
                    val = float(np.mean(list(val.values()))) if val else float('nan')
                results[k] = val
        return results

    def calc_CUFS(self, seq1, seq2):
        """
        Calculate Codon Usage Frequency Similarity (CUFS) between two sequences using codon-bias library.
        Args:
            seq1: nucleotide sequence (str)
            seq2: nucleotide sequence (str)
        Returns:
            CUFS value (float)
        """
        cufs = CodonUsageFrequencySimilarity()
        return cufs.score(seq1, seq2)

