import { AuthError } from "../errors.js";
import type { ZentaoApiV1Adapter } from "../adapters/zentaoApiV1.js";
import type { ZentaoAuthSession } from "../types/zentao.js";

export class AuthService {
  constructor(private readonly adapter: ZentaoApiV1Adapter) {}

  public async initLogin(input: {
    baseUrl?: string;
    account?: string;
    password?: string;
    token?: string;
  }): Promise<ZentaoAuthSession> {
    const account = input.account;
    if (!account) {
      throw new AuthError("初始化失败：缺少 account。");
    }

    if (input.token) {
      return this.adapter.setToken(account, input.token);
    }

    if (!input.password) {
      throw new AuthError("初始化失败：未提供 password 或 token。");
    }

    return this.adapter.login(account, input.password);
  }

  public getSession(): ZentaoAuthSession | undefined {
    return this.adapter.getSession();
  }
}
