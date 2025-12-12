import functools

def windowed_feature(feature_func):
    @functools.wraps(feature_func)
    def wrapper(self, windowed=False, window_size=None, step=1, from_end=False, num_windows=None, batch_mode=False, start_index=None, end_index=None):
        def sliding_windows(sequence, window_size, step, from_end, num_windows, start_index=None, end_index=None):
            # Apply start/end indices if provided
            if start_index is not None or end_index is not None:
                start_idx = start_index if start_index is not None else 0
                end_idx = end_index if end_index is not None else len(sequence)
                sequence = sequence[start_idx:end_idx]
            
            seq_len = len(sequence)
            windows = []
            window_indices = []
            
            if from_end:
                start = seq_len - window_size
                while start >= 0:
                    windows.append(sequence[start:start+window_size])
                    # Calculate actual indices accounting for any slicing
                    actual_start = (start_index or 0) + start
                    window_indices.append((actual_start, actual_start + window_size))
                    start -= step
            else:
                start = 0
                while start + window_size <= seq_len:
                    windows.append(sequence[start:start+window_size])
                    actual_start = (start_index or 0) + start
                    window_indices.append((actual_start, actual_start + window_size))
                    start += step
            
            if num_windows is not None:
                windows = windows[:num_windows]
                window_indices = window_indices[:num_windows]
            
            return windows, window_indices

        seqs = [self.sequence]
        indices = [(0, len(self.sequence))]
        
        if windowed and window_size:
            seqs, indices = sliding_windows(self.sequence, window_size, step, from_end, num_windows, start_index, end_index)
        
        results = [feature_func(self, seq) for seq in seqs]
        
        if batch_mode and windowed:
            # For batch mode, return a dict with windowed columns including indices
            result_dict = {}
            for i, (v, (start, end)) in enumerate(zip(results, indices)):
                result_dict[f"{feature_func.__name__}_{i+1}"] = v
                result_dict[f"{feature_func.__name__}_{i+1}_start"] = start
                result_dict[f"{feature_func.__name__}_{i+1}_end"] = end
            return result_dict
        
        if windowed:
            # Return results with indices
            return [(v, start, end) for v, (start, end) in zip(results, indices)]
        
        return results[0]
    return wrapper
