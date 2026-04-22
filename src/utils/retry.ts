export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isRetriableStatus(status?: number): boolean {
  if (status === undefined) {
    return false;
  }

  return status >= 500 || status === 429;
}
