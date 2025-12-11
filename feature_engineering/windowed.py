import functools

def windowed_feature(feature_func):
    @functools.wraps(feature_func)
    def wrapper(self, windowed=False, window_size=None, step=1, from_end=False, num_windows=None, batch_mode=False):
        def sliding_windows(sequence, window_size, step, from_end, num_windows):
            seq_len = len(sequence)
            windows = []
            if from_end:
                start = seq_len - window_size
                while start >= 0:
                    windows.append(sequence[start:start+window_size])
                    start -= step
            else:
                start = 0
                while start + window_size <= seq_len:
                    windows.append(sequence[start:start+window_size])
                    start += step
            if num_windows is not None:
                windows = windows[:num_windows]
            return windows

        seqs = [self.sequence]
        if windowed and window_size:
            seqs = sliding_windows(self.sequence, window_size, step, from_end, num_windows)
        results = [feature_func(self, seq) for seq in seqs]
        if batch_mode and windowed:
            # For batch mode, return a dict with windowed columns
            return {f"{feature_func.__name__}_{i+1}": v for i, v in enumerate(results)}
        return results if windowed else results[0]
    return wrapper
