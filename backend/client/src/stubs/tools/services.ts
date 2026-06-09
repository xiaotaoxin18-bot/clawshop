/**
 * Services stub - 替代 @lark-apaas/client-toolkit/tools/services
 * 部门和用户搜索功能将不可用，但页面不会白屏
 */

// 类型 stub
export type AccountType = string;
export type DepartmentInfo = Record<string, unknown>;
export type UserInfo = Record<string, unknown>;
export type SearchAvatar = Record<string, unknown>;
export type SearchDepartmentsParams = Record<string, unknown>;
export type SearchDepartmentsResponse = { items: unknown[] };

class StubService {
  protected name: string;
  constructor(name: string) {
    this.name = name;
  }
  async query(..._args: unknown[]): Promise<unknown> {
    console.warn(`[stub] ${this.name} is not available in standalone mode`);
    return { items: [] };
  }
}

export class DepartmentService extends StubService {
  constructor() {
    super('DepartmentService');
  }
  async searchDepartments(_params: SearchDepartmentsParams): Promise<SearchDepartmentsResponse> {
    return { items: [] };
  }
}

export class UserProfileService extends StubService {
  constructor() {
    super('UserProfileService');
  }
}

export class UserService extends StubService {
  constructor() {
    super('UserService');
  }
}
