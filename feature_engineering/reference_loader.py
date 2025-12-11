from typing import List, Optional
import pandas as pd
from .suffix_array_generator import SuffixArrayGenerator
from Bio import SeqIO, Entrez
import Bio.Data.CodonTable
import re
from collections import Counter

class ReferenceSequenceLoader:
    """
    Utility class to retrieve reference coding sequences for codon usage bias metrics.
    """
    def __init__(self, email: Optional[str] = None):
        self.email = email or "your.email@example.com"

    def get_sequences(self, genome_id: Optional[str] = None, path: Optional[str] = None, column: Optional[str] = None,
                      format: Optional[str] = None, df: Optional[pd.DataFrame] = None,
                      top_genes: Optional[float] = None, comparison: Optional[str] = None,
                      comparison_inputs: Optional[dict] = None) -> List[str]:
        # Load reference set into a DataFrame
        if df is not None:
            ref_df = df.copy()
        elif path and format:
            if format.lower() == 'csv':
                ref_df = pd.read_csv(path)
            elif format.lower() == 'excel':
                ref_df = pd.read_excel(path)
            elif format.lower() == 'fasta':
                records = list(SeqIO.parse(path, "fasta"))
                ref_df = pd.DataFrame({column: [str(r.seq) for r in records]})
            elif format.lower() == 'genbank':
                records = []
                for record in SeqIO.parse(path, "genbank"):
                    for feature in record.features:
                        if feature.type == "CDS" and "translation" in feature.qualifiers:
                            records.append(feature.qualifiers["translation"][0])
                ref_df = pd.DataFrame({column: records})
            else:
                raise ValueError(f"Unsupported format: {format}")
        elif genome_id:
            Entrez.email = "your.email@example.com"
            handle = Entrez.efetch(db="nuccore", id=genome_id, rettype="fasta", retmode="text")
            records = list(SeqIO.parse(handle, "fasta"))
            handle.close()
            ref_df = pd.DataFrame({column: [str(r.seq) for r in records]})
        else:
            raise ValueError("No valid reference source provided.")
        # Filtering logic
        if top_genes is not None and column:
            # If comparison is a column, use its values
            if comparison and comparison in ref_df.columns:
                ref_df = ref_df.sort_values(comparison, ascending=False)
            # If comparison is a codon bias metric, use provided module
            elif comparison and comparison_inputs:
                metric_func = comparison_inputs.get('metric_func')
                metric_args = comparison_inputs.get('metric_args', {})
                ref_df[comparison] = ref_df[column].apply(lambda seq: metric_func(seq, **metric_args))
                ref_df = ref_df.sort_values(comparison, ascending=False)
            # Select top genes
            if isinstance(top_genes, int) and top_genes > 0:
                ref_df = ref_df.iloc[:top_genes]
            elif isinstance(top_genes, float) and 0 < top_genes < 1:
                n = max(1, int(top_genes * len(ref_df)))
                ref_df = ref_df.iloc[:n]
        return ref_df[column].dropna().astype(str).tolist()

class ReferenceSequenceSet:
    """
    Class representing a set of reference sequences, with utility methods.
    Communicates with ReferenceSequenceLoader to load sequences.
    """
    def __init__(self, loader: ReferenceSequenceLoader, loader_args: dict):
        """
        loader: ReferenceSequenceLoader instance
        loader_args: arguments for loader.get_sequences
        """
        self.loader = loader
        self.loader_args = loader_args
        self.sequences = self.loader.get_sequences(**self.loader_args)
        # If sequences are not (locus_tag, gene_seq) tuples, convert to that format
        if self.sequences and isinstance(self.sequences[0], str):
            self.sequences = [(str(i), seq) for i, seq in enumerate(self.sequences)]

    def generate_weights(self, metric: str, **kwargs):
        """
        Generate codon weights or reference data for a given metric using the reference set.
        For CAI: returns codon weights as used by CodonAdaptationIndex.
        For tAI: returns codon weights as used by TrnaAdaptationIndex.
        For nTE, RCA: returns codon->weight dicts as before.
        """
        metric = metric.lower()
        seqs = [seq for _, seq in self.sequences]
        # CAI: Codon Adaptation Index codon weights
        if metric == "cai":
            from codonbias.scores import CodonAdaptationIndex
            cai = CodonAdaptationIndex(seqs)
            return cai.weights
        # tAI: tRNA Adaptation Index codon weights
        elif metric == "tai":
            trna_path = kwargs.get("trna_path")
            if trna_path:
                trna_df = pd.read_csv(trna_path, delimiter='\t')
                trna_dict = dict(zip(trna_df['codon'], trna_df['copy_number']))
                from codonbias.scores import TrnaAdaptationIndex
                tai = TrnaAdaptationIndex(trna_dict)
                return tai.weights
            else:
                from codonbias.scores import TrnaAdaptationIndex
                tai = TrnaAdaptationIndex()
                return tai.weights
        # nTE: normalized Translation Efficiency weights
        elif metric == "nte":
            genes_csv_path = kwargs.pop("genes_csv_path", None)
            rpkm_path = kwargs.pop("rpkm_path", None)
            tai_path = kwargs.pop("tai_path", None)
            trna_path = kwargs.pop("trna_path", None)
            if not genes_csv_path or not rpkm_path:
                raise ValueError("genes_csv_path and rpkm_path are required for nTE weights.")
            rpkm = pd.read_csv(rpkm_path, delimiter='\t')
            rpkm.sort_values('RPKM', ascending=False, inplace=True)
            rpkm = rpkm.set_index('gene')['RPKM'].to_dict()
            seq_dict = pd.read_csv(genes_csv_path, delimiter=',').set_index('gene')['ORF'].to_dict()
            # tAI weights
            if tai_path:
                tAI_weights = self.generate_weights("tai", trna_path=tai_path)
            elif trna_path:
                tAI_weights = self.generate_weights("tai", trna_path=trna_path)
            else:
                tAI_weights = self.generate_weights("tai")
            w = {}
            for gene, seq_ in seq_dict.items():
                if gene in rpkm:
                    curr_lvl = rpkm[gene]
                else:
                    continue
                codons = re.findall('.{3}', seq_)
                for c in codons:
                    if c not in ['TAA', 'TAG', 'TGA']:
                        if c not in w:
                            w[c] = curr_lvl
                        else:
                            w[c] += curr_lvl
            if not w:
                raise ValueError("No codon weights calculated for nTE.")
            m = max(w.values())
            for codon in w:
                w[codon] = tAI_weights.get(codon, 1.0) / (w[codon] / m)
            m = max(w.values())
            for codon in w:
                w[codon] = w[codon] / m
            return w
        # RCA: Relative Codon Adaptation weights
        elif metric == "rca":
            nt2aa = Bio.Data.CodonTable.standard_dna_table.forward_table
            aas = [aa for aa in nt2aa.values()]
            aa2nt = {aa: [x for x in nt2aa.keys() if nt2aa[x] == aa] for aa in aas}
            codons = re.findall('.{3}', ''.join(seqs))
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
        else:
            raise ValueError(f"Metric '{metric}' not supported for weight generation.")

    def generate_suffix_array(self, max_seq: int = 200, path_suffix_array: Optional[str] = None) -> pd.DataFrame:
        """
        Generate a suffix array from the reference set using SuffixArrayGenerator.
        max_seq: maximum subsequence length
        path_suffix_array: optional path to save CSV
        Returns: DataFrame of suffix array
        """
        generator = SuffixArrayGenerator(max_seq=max_seq)
        return generator.generate_suffix_array(self.sequences, path_suffix_array)
