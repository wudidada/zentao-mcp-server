import { AuthError } from "../errors.js";
import type { ZentaoApiV1Adapter } from "../adapters/zentaoApiV1.js";
import type { ZentaoAuthSession } from "../types/zentao.js";

export class AuthService {
  private credentials?: {
    account: string;
    password?: string;
    token?: string;
  };

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
      this.credentials = {
        account,
        password: input.password,
        token: input.token,
      };
      return this.adapter.setToken(account, input.token);
    }

    if (!input.password) {
      throw new AuthError("初始化失败：未提供 password 或 token。");
    }

    this.credentials = { account, password: input.password };
    return this.adapter.login(account, input.password);
  }

  public async reauthenticate(): Promise<ZentaoAuthSession> {
    if (!this.credentials) {
      throw new AuthError("自动续登失败：没有可用的账号密码或 token 配置。");
    }

    if (this.credentials.password) {
      return this.adapter.login(this.credentials.account, this.credentials.password);
    }

    if (this.credentials.token) {
      return this.adapter.setToken(this.credentials.account, this.credentials.token);
    }

    throw new AuthError("自动续登失败：没有可用的密码或 token。");
  }

  public getSession(): ZentaoAuthSession | undefined {
    return this.adapter.getSession();
  }
}
