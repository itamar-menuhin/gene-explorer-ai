
import pandas as pd
import gget
import requests
import io

# Download ELM database locally (only needs to be done once)
gget.setup("elm")

# Download the ELM instances file directly from the ELM website
tsv_url = "http://elm.eu.org/instances.tsv?q=None&taxon=&instance_logic="
response = requests.get(tsv_url)
if response.status_code != 200:
	raise Exception(f"Failed to download ELM instances file: {response.status_code}")

instances_df = pd.read_csv(io.StringIO(response.text), sep="\t")
print(instances_df.head())
# Extract unique UniProt IDs automatically
if "Uniprot" in instances_df.columns:
	all_uniprot_ids = instances_df["Uniprot"].dropna().unique().tolist()
else:
	raise ValueError("Could not find 'Uniprot' column in ELM instances file.")

all_motifs = []
for uid in all_uniprot_ids:
	ortholog_df, regex_df = gget.elm(uid, uniprot=True, expand=True)
	if ortholog_df is not None and not ortholog_df.empty:
		ortholog_df["UniProt_ID"] = uid
		all_motifs.append(ortholog_df)
	if regex_df is not None and not regex_df.empty:
		regex_df["UniProt_ID"] = uid
		all_motifs.append(regex_df)

if all_motifs:
	motifs_df = pd.concat(all_motifs, ignore_index=True)
	motifs_df.to_csv("../Data/elm_motifs.csv", index=False)
	print("Motif data saved to ../Data/elm_motifs.csv")
else:
	print("No motif data found for any UniProt IDs in the ELM instances file.")
