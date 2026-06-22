/**
 * Retries a function that returns a Promise with a delay between attempts.
 *
 * @param fn - The function to retry
 * @param delayMs - Delay in milliseconds between retries
 * @param maxRetries - Maximum number of retry attempts
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  delayMs: number,
  maxRetries: number
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (maxRetries === 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithDelay(fn, delayMs, maxRetries - 1);
  }
}
