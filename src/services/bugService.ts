import type { ZentaoApiV1Adapter } from "../adapters/zentaoApiV1.js";
import type {
  ActivateBugPayload,
  BugStatus,
  ResolveBugPayload,
  ZentaoBug,
  ZentaoBugDetail,
  ZentaoProduct,
} from "../types/zentao.js";

export class BugService {
  constructor(private readonly adapter: ZentaoApiV1Adapter) {}

  public async getProducts(): Promise<ZentaoProduct[]> {
    return this.adapter.getProducts();
  }

  public async getMyBugs(status?: BugStatus, productId?: number): Promise<ZentaoBug[]> {
    return this.adapter.getMyBugs({ status, productId });
  }

  public async getBugDetail(bugId: number): Promise<ZentaoBugDetail> {
    return this.adapter.getBugDetail(bugId);
  }

  public async resolveBug(bugId: number, payload: ResolveBugPayload): Promise<ZentaoBugDetail> {
    return this.adapter.resolveBug(bugId, payload);
  }

  public async activateBug(bugId: number, payload?: ActivateBugPayload): Promise<ZentaoBugDetail> {
    return this.adapter.activateBug(bugId, payload);
  }
}
