
import json
import pandas as pd
from .sequence import AminoAcidSequence, NucleotideSequence

def batch_calculate_features(sequence_list, method_json, sequence_type="amino", output_csv=None):
    """
    sequence_list: list of strings (sequences)
    method_json: dict or JSON string specifying methods to run, e.g. {"chemical_features": true, "aliphatic_index": true}
    sequence_type: "amino" or "nucleotide"
    output_csv: output file name (optional)
    Returns: pandas DataFrame. If output_csv is provided, also writes CSV.
    """
    if isinstance(method_json, str):
        method_json = json.loads(method_json)

    # Detect pandas Series input
    is_series = isinstance(sequence_list, pd.Series)
    if is_series:
        seq_values = sequence_list.values
        seq_index = sequence_list.index
    else:
        seq_values = sequence_list
        seq_index = None

    # Prepare objects
    if sequence_type == "amino":
        objects = [AminoAcidSequence(seq) for seq in seq_values]
    elif sequence_type == "nucleotide":
        objects = [NucleotideSequence(seq) for seq in seq_values]
    else:
        raise ValueError("sequence_type must be 'amino' or 'nucleotide'")

    # Prepare feature names
    feature_names = list(method_json.keys())
    results = []
    for obj in objects:
        row = {"sequence": obj.sequence}
        for feat in feature_names:
            method = getattr(obj, feat, None)
            if method and method_json[feat]:
                value = method()
                # If value is a dict, flatten it
                if isinstance(value, dict):
                    for k, v in value.items():
                        row[f"{feat}_{k}"] = v
                else:
                    row[feat] = value
        results.append(row)

    # Collect all columns
    all_columns = set()
    for row in results:
        all_columns.update(row.keys())
    all_columns = ["sequence"] + sorted([c for c in all_columns if c != "sequence"])

    # Create DataFrame, preserve index if input was Series
    if is_series:
        df = pd.DataFrame(results, columns=all_columns, index=seq_index)
    else:
        df = pd.DataFrame(results, columns=all_columns)

    # Write to CSV if requested
    if output_csv:
        df.to_csv(output_csv, index=is_series)

    return df
