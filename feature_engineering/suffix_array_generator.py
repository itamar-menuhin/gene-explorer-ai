import pandas as pd
from typing import Optional

class SuffixArrayGenerator:
    """
    Utility to generate a suffix array from a reference set of sequences in a DataFrame.
    Expects a DataFrame with a sequence column and an optional gene id column.
    """
    def __init__(self, max_seq: int = 200):
        self.max_seq = max_seq

    def build_array_single_gene(self, gene_seq: str, gene_id: str):
        return [(gene_seq[ii:ii+self.max_seq], gene_id, ii) for ii in range(len(gene_seq))]

    def generate_suffix_array(self, df: pd.DataFrame, seq_column: str = 'seq', id_column: Optional[str] = None, path_suffix_array: Optional[str] = None) -> pd.DataFrame:
        """
        Generate suffix array for a DataFrame of sequences.
        seq_column: column name for sequences
        id_column: column name for gene ids (optional, uses constant value if not provided)
        path_suffix_array: optional path to save CSV
        Returns: DataFrame of suffix array
        """
        # Ensure there is a gene id column
        gene_id_col = id_column if id_column and id_column in df.columns else '_tmp_gene_id'
        if gene_id_col not in df.columns:
            df[gene_id_col] = 'GENE'
        df_suffix_array = pd.DataFrame(columns=['seq', gene_id_col, 'index'])
        for ii, row in df.iterrows():
            gene_id = row[gene_id_col]
            gene_seq = row[seq_column]
            gene_array = self.build_array_single_gene(gene_seq, gene_id)
            df_curr = pd.DataFrame.from_records(gene_array, columns=['seq', gene_id_col, 'index'])
            df_suffix_array = pd.concat([df_suffix_array, df_curr]).drop_duplicates(subset=['seq', gene_id_col])
            df_suffix_array = df_suffix_array.sort_values(by='seq').reset_index(drop=True)
            if (ii % 20 == 0) and path_suffix_array:
                print(ii)
                df_suffix_array.to_csv(path_suffix_array)
        if path_suffix_array:
            df_suffix_array.to_csv(path_suffix_array)
        # Drop temporary gene id column if it was created
        if gene_id_col == '_tmp_gene_id':
            df_suffix_array = df_suffix_array.drop(columns=['_tmp_gene_id'])
        return df_suffix_array
