#!/usr/bin/env python3
"""
Test script for CUB panel pipeline with both windowed and global features.
This script creates a few test sequences, processes them through the CUB panel,
and generates both CSV output and visualizations.
"""

import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
import pandas as pd

client = TestClient(app)

# Test sequences - a few real-ish coding sequences
TEST_SEQUENCES = [
    {
        "id": "test_seq_1",
        "sequence": "ATGGTACTGACGATTTATCCTGACGAACTCGTACAAATAGTGTCTGATAAAATTGCTTCAATGAACAAAGGTAAGATAACACTGAATCAGTTATGGGATATATCTGGTAAATATTTTGATCTGAGTGATAAAAAGGTTAAGCAATTCGTACTTTCATGCGTTATTCTTAAGAAAGATATAGAA",
        "name": "Test Gene 1"
    },
    {
        "id": "test_seq_2",
        "sequence": "ATGGCTAGCAAGCTGATTGCAGCAGGTGTTGCTGCAATAGCAGCTACTGCTTCAGCTACTACTTTGCTAGCTCAATCTGATGAGCGCGTAAACCTGGTGGAATTGGGTGTTTACGTGTCAGATATTCGTGCGCATTTGGCTCAGTATTATATGTTTCAAGCTGCTCATCCTACTGAA",
        "name": "Test Gene 2"
    },
    {
        "id": "test_seq_3",
        "sequence": "ATGAAAGTTTTAACTTCTATAGCTGCAGGTGTTGCTGCTATAGCTGCTACAGCTTCAGCTACTACTACACTGGCTCAATCTGATGAAAGAGTTAATCTTGTGGAGCTGGGCGTATACGTTTCTGACATTCGTGCTCATCTGGCACAGTATTATATGTTTCAGGCAGCACATCCTACTGAATAA",
        "name": "Test Gene 3"
    }
]

def test_global_features():
    """Test global (full sequence) feature extraction with CUB panel."""
    print("=" * 80)
    print("TEST 1: Global Feature Extraction")
    print("=" * 80)
    
    response = client.post("/extract-features", json={
        "sequences": TEST_SEQUENCES,
        "panels": {
            "sequence": {"enabled": True},
            "codonUsage": {"enabled": True}
        }
    })
    
    assert response.status_code == 200, f"Request failed with status {response.status_code}"
    data = response.json()
    
    print(f"✓ Request successful")
    print(f"✓ Mode: {data['mode']}")
    print(f"✓ Total sequences: {data['metadata']['totalSequences']}")
    print(f"✓ Panels computed: {data['metadata']['panelsComputed']}")
    print(f"✓ Results count: {len(data['results'])}")
    
    # Check that we have results for each sequence
    assert len(data['results']) == len(TEST_SEQUENCES), \
        f"Expected {len(TEST_SEQUENCES)} results, got {len(data['results'])}"
    
    # Check that each result has features
    for result in data['results']:
        assert 'features' in result
        assert 'gc_content' in result['features'], "Missing sequence features"
        assert 'enc' in result['features'], "Missing CUB features"
        print(f"\n  Sequence: {result['sequenceId']}")
        print(f"    Features: {list(result['features'].keys())}")
        print(f"    Sample values:")
        print(f"      - GC content: {result['features'].get('gc_content', 'N/A')}")
        print(f"      - ENC: {result['features'].get('enc', 'N/A')}")
        print(f"      - RCBS: {result['features'].get('rcbs', 'N/A')}")
    
    print("\n✓ All global features extracted successfully!")
    return data


def test_windowed_features():
    """Test windowed feature extraction with CUB panel."""
    print("\n" + "=" * 80)
    print("TEST 2: Windowed Feature Extraction")
    print("=" * 80)
    
    response = client.post("/extract-features", json={
        "sequences": TEST_SEQUENCES,
        "panels": {
            "sequence": {"enabled": True},
            "codonUsage": {"enabled": True}
        },
        "window": {
            "enabled": True,
            "windowSize": 60,  # 20 codons
            "stepSize": 30     # 10 codons step
        }
    })
    
    assert response.status_code == 200, f"Request failed with status {response.status_code}"
    data = response.json()
    
    print(f"✓ Request successful")
    print(f"✓ Mode: {data['mode']}")
    print(f"✓ Total sequences: {data['metadata']['totalSequences']}")
    print(f"✓ Panels computed: {data['metadata']['panelsComputed']}")
    print(f"✓ Window size: {data['metadata']['windowSize']}")
    print(f"✓ Step size: {data['metadata']['stepSize']}")
    print(f"✓ Total windows: {data['metadata']['totalWindows']}")
    print(f"✓ Results count: {len(data['results'])}")
    
    # Separate global and windowed results
    global_results = [r for r in data['results'] if r.get('windowStart') is None]
    windowed_results = [r for r in data['results'] if r.get('windowStart') is not None]
    
    print(f"\n  Global results: {len(global_results)}")
    print(f"  Windowed results: {len(windowed_results)}")
    
    # Check that we have global results for each sequence
    assert len(global_results) == len(TEST_SEQUENCES), \
        f"Expected {len(TEST_SEQUENCES)} global results, got {len(global_results)}"
    
    # Check that we have windowed results
    assert len(windowed_results) > 0, "No windowed results found"
    
    # Display some windowed results
    print("\n  Sample windowed results:")
    for i, result in enumerate(windowed_results[:5]):
        print(f"    Window {i+1}: {result['sequenceId']} [{result['windowStart']}-{result['windowEnd']}]")
        print(f"      GC: {result['features'].get('gc_content', 'N/A')}, " 
              f"ENC: {result['features'].get('enc', 'N/A')}")
    
    print("\n✓ Both global and windowed features extracted successfully!")
    return data


def export_to_csv(data, filename):
    """Export results to CSV."""
    print("\n" + "=" * 80)
    print(f"TEST 3: Export to CSV ({filename})")
    print("=" * 80)
    
    # Convert results to DataFrame
    rows = []
    for result in data['results']:
        row = {
            'sequenceId': result['sequenceId'],
            'windowStart': result.get('windowStart'),
            'windowEnd': result.get('windowEnd')
        }
        row.update(result['features'])
        rows.append(row)
    
    df = pd.DataFrame(rows)
    
    # Save to CSV
    output_path = f"/tmp/{filename}"
    df.to_csv(output_path, index=False)
    
    print(f"✓ CSV saved to {output_path}")
    print(f"✓ Shape: {df.shape[0]} rows × {df.shape[1]} columns")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head())
    
    # Check that CSV is not empty
    assert df.shape[0] > 0, "CSV is empty!"
    assert df.shape[1] > 2, "CSV has too few columns!"
    
    print("\n✓ CSV export successful!")
    return df


def generate_visualizations(df):
    """Generate basic visualizations."""
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    
    print("\n" + "=" * 80)
    print("TEST 4: Generate Visualizations")
    print("=" * 80)
    
    # Separate global and windowed data
    global_df = df[df['windowStart'].isna()]
    windowed_df = df[df['windowStart'].notna()]
    
    print(f"✓ Global data: {len(global_df)} rows")
    print(f"✓ Windowed data: {len(windowed_df)} rows")
    
    # Display statistics for global features
    if len(global_df) > 0:
        print("\nGlobal Feature Statistics:")
        numeric_cols = global_df.select_dtypes(include=['float64', 'int64']).columns
        for col in numeric_cols[:5]:  # Show first 5 numeric columns
            print(f"  {col}:")
            print(f"    Mean: {global_df[col].mean():.4f}")
            print(f"    Std: {global_df[col].std():.4f}")
    
    # Display statistics for windowed features
    if len(windowed_df) > 0:
        print("\nWindowed Feature Statistics:")
        numeric_cols = windowed_df.select_dtypes(include=['float64', 'int64']).columns
        for col in list(numeric_cols)[:5]:  # Show first 5 numeric columns
            print(f"  {col}:")
            print(f"    Mean: {windowed_df[col].mean():.4f}")
            print(f"    Std: {windowed_df[col].std():.4f}")
    
    # Generate actual plots
    if len(windowed_df) > 0:
        print("\nGenerating visualizations...")
        
        # Create a figure with multiple subplots
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        fig.suptitle('CUB Panel Features - Visualization', fontsize=14, fontweight='bold')
        
        # Plot 1: GC content distribution (global)
        if len(global_df) > 0:
            axes[0, 0].bar(global_df['sequenceId'], global_df['gc_content'])
            axes[0, 0].set_title('GC Content (Global)')
            axes[0, 0].set_ylabel('GC %')
            axes[0, 0].tick_params(axis='x', rotation=45)
        
        # Plot 2: ENC distribution (global)
        if len(global_df) > 0 and 'enc' in global_df.columns:
            axes[0, 1].bar(global_df['sequenceId'], global_df['enc'])
            axes[0, 1].set_title('Effective Number of Codons (Global)')
            axes[0, 1].set_ylabel('ENC')
            axes[0, 1].tick_params(axis='x', rotation=45)
        
        # Plot 3: Windowed GC content profile
        for seq_id in windowed_df['sequenceId'].unique():
            seq_data = windowed_df[windowed_df['sequenceId'] == seq_id]
            if len(seq_data) > 0:
                axes[1, 0].plot(seq_data['windowStart'], seq_data['gc_content'], 
                              marker='o', label=seq_id)
        axes[1, 0].set_title('GC Content Profile (Windowed)')
        axes[1, 0].set_xlabel('Position')
        axes[1, 0].set_ylabel('GC %')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
        
        # Plot 4: Windowed ENC profile
        if 'enc' in windowed_df.columns:
            for seq_id in windowed_df['sequenceId'].unique():
                seq_data = windowed_df[windowed_df['sequenceId'] == seq_id]
                if len(seq_data) > 0:
                    axes[1, 1].plot(seq_data['windowStart'], seq_data['enc'], 
                                  marker='s', label=seq_id)
            axes[1, 1].set_title('ENC Profile (Windowed)')
            axes[1, 1].set_xlabel('Position')
            axes[1, 1].set_ylabel('ENC')
            axes[1, 1].legend()
            axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        viz_path = '/tmp/cub_features_visualization.png'
        plt.savefig(viz_path, dpi=100, bbox_inches='tight')
        plt.close()
        
        print(f"✓ Visualization saved to {viz_path}")
    
    print("\n✓ Visualization generation complete!")


def main():
    """Run all tests."""
    print("\n" + "=" * 80)
    print("CUB PANEL PIPELINE TEST")
    print("=" * 80)
    print(f"\nTesting with {len(TEST_SEQUENCES)} sequences")
    print(f"Using CUB panel for codon usage bias analysis\n")
    
    try:
        # Test 1: Global features
        global_data = test_global_features()
        
        # Test 2: Windowed features
        windowed_data = test_windowed_features()
        
        # Test 3: Export to CSV
        global_df = export_to_csv(global_data, "global_features.csv")
        windowed_df = export_to_csv(windowed_data, "windowed_features.csv")
        
        # Test 4: Generate visualizations
        generate_visualizations(windowed_df)
        
        print("\n" + "=" * 80)
        print("ALL TESTS PASSED! ✓")
        print("=" * 80)
        print("\nSummary:")
        print(f"  - {len(TEST_SEQUENCES)} sequences processed")
        print(f"  - Global features: {len(global_df)} rows")
        print(f"  - Windowed features: {len(windowed_df)} rows")
        print(f"  - CSV files generated in /tmp/")
        print(f"  - All panels completed successfully")
        print("\n✓ Pipeline is working correctly!\n")
        
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
