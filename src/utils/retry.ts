export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isRetriableStatus(status?: number): boolean {
  if (status === undefined) {
    // 网络超时、连接重置等通常没有 HTTP 状态码；只读请求可安全重试。
    return true;
  }

  return status >= 500 || status === 429;
}
