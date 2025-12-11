import os
import tempfile
import requests
from biotite.structure import io, structure as struc
import numpy as np
from .universal_feature_mixin import UniversalFeatureMixin

class BiotiteStructureFeaturesMixin(UniversalFeatureMixin):
    """
    Mixin for extracting structural features from PDB files using Biotite.
    Accepts: PDB file path, PDB ID, or URL. Downloads file if needed.
    Returns: Dictionary of structure features for the protein.
    """
    @staticmethod
    def _download_pdb(pdb_id_or_url):
        """
        Download PDB file from RCSB or URL if not a local file. Returns local file path.
        """
        if os.path.isfile(pdb_id_or_url):
            return pdb_id_or_url
        if pdb_id_or_url.lower().startswith("http"):
            response = requests.get(pdb_id_or_url)
            response.raise_for_status()
            tmp_path = os.path.join(tempfile.gettempdir(), os.path.basename(pdb_id_or_url))
            with open(tmp_path, "wb") as f:
                f.write(response.content)
            return tmp_path
        # Assume PDB ID
        pdb_id = pdb_id_or_url.lower()
        url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
        response = requests.get(url)
        response.raise_for_status()
        tmp_path = os.path.join(tempfile.gettempdir(), f"{pdb_id}.pdb")
        with open(tmp_path, "wb") as f:
            f.write(response.content)
        return tmp_path

    def _extract_features_single(self, pdb_file_or_id, features_json=None, reference_set=None, **kwargs):
        """
        Extracts structural features from a PDB file/ID/URL using Biotite.
        Returns: dict of features.
        """
        try:
            pdb_path = self._download_pdb(pdb_file_or_id)
            atom_array = io.load_structure(pdb_path)
            aa = atom_array[struc.filter_amino_acids(atom_array)]
            sse = struc.annotate_sse(aa)
            helix_frac = np.mean(sse == 'a')
            sheet_frac = np.mean(sse == 'b')
            coil_frac = np.mean(sse == 'c')

            sasa = struc.sasa(aa)
            avg_sasa = np.mean(sasa)
            exposed_frac = np.mean(sasa > np.median(sasa))

            hbonds = struc.hbond(aa).shape[0]
            avg_hbond = hbonds / len(aa) if len(aa) > 0 else 0.0

            phi, psi, omega = struc.dihedral_backbone(aa)
            feats = {
                "helix_frac": helix_frac,
                "sheet_frac": sheet_frac,
                "coil_frac": coil_frac,
                "avg_sasa": avg_sasa,
                "exposed_frac": exposed_frac,
                "hbond_count": hbonds,
                "hbond_avg_per_res": avg_hbond,
                "phi_mean": np.nanmean(phi),
                "psi_mean": np.nanmean(psi),
                "phi_std": np.nanstd(phi),
                "psi_std": np.nanstd(psi),
            }
            # If features_json is provided, filter output
            if features_json:
                feats = {k: v for k, v in feats.items() if k in features_json and features_json[k].get("enabled", True)}
            return feats
        except Exception as e:
            return {"error": str(e)}
