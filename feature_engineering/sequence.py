from Bio.Seq import Seq
from Bio.SeqUtils import seq1
from .chemical import ChemicalFeaturesMixin
class NucleotideSequence:
    def __init__(self, nucleotide_sequence: str, reference_set=None):
        self.nucleotide_sequence = nucleotide_sequence.upper()
        self.reference_set = reference_set
        self.amino_acid_sequence = self._translate_to_amino_acids()
        self._validate_nucleotide_sequence()

    def __repr__(self):
        return f"NucleotideSequence('{self.nucleotide_sequence}')"

    def _translate_to_amino_acids(self):
        """
        Translate this nucleotide sequence to an amino acid sequence.

        Expects:
            - A nucleotide sequence object

        Returns:
            AminoAcidSequence: Corresponding amino acid sequence
        """
        aa_seq = str(Seq(self.nucleotide_sequence).translate(to_stop=True))
        return AminoAcidSequence(aa_seq)

    def set_reference_set(self, reference_set):
        """
        Set or update the reference set object for this sequence.

        Expects:
            - A reference set object

        Returns:
            None
        """
        self.reference_set = reference_set

    def get_reference_set(self):
        """
        Get the current reference set object.

        Returns:
            Reference set object
        """
        return self.reference_set

    def _validate_nucleotide_sequence(self):
        valid_nucleotides = set('ACGTU')
        seq_set = set(self.nucleotide_sequence.upper())
        if not seq_set.issubset(valid_nucleotides):
            raise ValueError(f"Invalid nucleotide sequence: contains non-nucleotide characters {seq_set - valid_nucleotides}")

class AminoAcidSequence(ChemicalFeaturesMixin):
    def __init__(self, amino_acid_sequence: str, reference_set=None):
        self.amino_acid_sequence = amino_acid_sequence.upper()
        self.reference_set = reference_set
        self._validate_amino_acid_sequence()

    def __repr__(self):
        return f"AminoAcidSequence('{self.amino_acid_sequence}')"

    def set_reference_set(self, reference_set):
        """
        Set or update the reference set object for this amino acid sequence.

        Expects:
            - A reference set object

        Returns:
            None
        """
        self.reference_set = reference_set

    def get_reference_set(self):
        """
        Get the current reference set object.

        Returns:
            Reference set object
        """
        return self.reference_set

    def _validate_amino_acid_sequence(self):
        valid_aas = set('ACDEFGHIKLMNPQRSTVWY*')
        seq_set = set(self.amino_acid_sequence.upper())
        if not seq_set.issubset(valid_aas):
            raise ValueError(f"Invalid amino acid sequence: contains non-amino acid characters {seq_set - valid_aas}")

    # Feature calculation methods are provided by mixins
