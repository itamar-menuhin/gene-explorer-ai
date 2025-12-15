/**
 * Utility functions for window configuration calculations
 */

/**
 * Calculate the number of windows that will be generated for a given configuration
 * 
 * @param windowSize - Size of each window in base pairs
 * @param stepSize - Step size between windows
 * @param startIndex - Starting index (default 0)
 * @param endIndex - Ending index (default maxSequenceLength)
 * @param maxSequenceLength - Maximum sequence length
 * @returns Number of windows that will be generated (0 if invalid parameters)
 */
export function calculateNumWindows(
  windowSize: number,
  stepSize: number,
  startIndex: number | undefined,
  endIndex: number | undefined,
  maxSequenceLength: number
): number {
  const effectiveStart = startIndex ?? 0;
  const effectiveEnd = endIndex ?? maxSequenceLength;
  const effectiveLength = Math.max(0, effectiveEnd - effectiveStart);
  
  if (windowSize <= 0 || stepSize <= 0 || effectiveLength < windowSize) {
    return 0;
  }
  
  return Math.max(1, Math.floor((effectiveLength - windowSize) / stepSize) + 1);
}
