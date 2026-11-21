export class UserError extends Error {}
export function safeMessage(error: unknown): string {
  return error instanceof UserError
    ? error.message
    : '本地数据操作失败，请检查存储权限或可用空间后重试。';
}
