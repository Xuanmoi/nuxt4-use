/**
 * 核心工具函数库
 * 按功能模块划分：请求处理、GraphQL、错误处理、通用工具
 */

// 定义请求对象接口
interface Request {
  cookies: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  query?: {
    params?: string;
  };
}

// 定义响应头接口
interface ResponseHeaders {
  'x-magento-cache-id'?: string;
  'X-Magento-Cache-Id'?: string;
  [key: string]: string | undefined;
}

// ========================================
// 1. 请求处理相关工具函数
// ========================================

/**
 * 从请求中提取各种 Token 和标识
 */
const extractRequestInfo = {
  /**
   * 获取客户令牌
   * @param req - Express 请求对象
   * @returns 客户令牌
   */
  getCustomerToken: (req: Request): string | undefined => req.cookies['vsf-customer'],

  /**
   * 获取商店标识
   * @param req - Express 请求对象
   * @returns 商店标识
   */
  getStore: (req: Request): string => {
    const store = req?.headers?.['site-store'];
    return store || 'default';
  },

  /**
   * 获取货币设置
   * @param req - Express 请求对象
   * @returns 货币代码
   */
  getCurrency: (req: Request): string | undefined => req.cookies['vsf-currency'],

  /**
   * 获取 Magento 缓存 ID
   * @param req - Express 请求对象
   * @returns 缓存 ID
   */
  getMagentoCacheId: (req: Request): string | undefined => req.cookies['X-Magento-Cache-Id'],

  /**
   * 获取用户 UUID
   * @param req - Express 请求对象
   * @returns 用户 UUID
   */
  getUuid: (req: Request): string | undefined => req.cookies['fp-uuid'],

  /**
   * 获取转发的 IP 地址
   * @param req - Express 请求对象
   * @returns IP 地址
   */
  getXForwardFor: (req: Request): string | undefined =>
    req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'],

  /**
   * 获取用户代理字符串
   * @param req - Express 请求对象
   * @returns 用户代理
   */
  getUserAgent: (req: Request): string | undefined => req.headers['user-agent'],
};

/**
 * 获取请求头信息
 * @param req - Express 请求对象
 * @param customHeaders - 自定义头信息
 * @returns 合并后的头信息
 */
const getHeaders = (req: Request, customHeaders: Record<string, string> = {}): Record<string, string> => {
  const {
    getCustomerToken,
    getStore,
    getCurrency,
    getMagentoCacheId,
    getUuid,
    getXForwardFor,
    getUserAgent,
  } = extractRequestInfo;

  const customerToken = getCustomerToken(req);
  const store = getStore(req);
  const currency = getCurrency(req);
  const magentoCacheId = getMagentoCacheId(req);
  // 'Real-IP', 'Correlation-ID', 'User-Agent'
  const uuid = getUuid(req); // 用户uuid
  const ipAddress = getXForwardFor(req); // 用户IP
  const userAgent = getUserAgent(req); // 用户浏览器信息

  const headers: Record<string, string> = {};
  // 添加认证头
  if (customerToken) {
    headers.Authorization = `Bearer ${customerToken}`;
  }
  // 添加商店信息
  if (store) {
    headers.store = store;
  }
  // 添加货币信息
  if (currency) {
    headers['Content-Currency'] = currency;
  }
  // 添加缓存 ID
  if (magentoCacheId) {
    headers['X-Magento-Cache-Id'] = magentoCacheId;
  }
  // 添加用户标识信息
  if (uuid?.length > 0) {
    headers['Correlation-ID'] = uuid;
  }

  if (ipAddress?.length > 0) {
    headers['Real-IP'] = ipAddress;
  }

  if (userAgent?.length > 0) {
    headers['User-Agent'] = userAgent;
  }

  return {
    ...headers,
    ...customHeaders,
  };
};

/**
 * 判断对象是否为空
 * @param obj - 要检查的对象
 * @returns 是否为空对象
 */
const isEmptyObject = (obj: any): boolean => {
  if (obj === null || obj === undefined) {
    return true;
  }
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * 解析请求参数和头部信息
 * @param req - Express 请求对象
 * @returns 包含参数和头部信息的对象
 * @throws 参数解析失败时抛出错误
 */
const getParamsAndHeaders = (req: Request): { params: any; headers: Record<string, string> } => {
  try {
    const params = isEmptyObject(req?.body)
      ? JSON.parse(req?.query?.params || '[]')
      : req?.body;
    const customHeaders = params?.length > 1 ? params[params.length - 1] : {};
    const headers = getHeaders(req, customHeaders);
    return { params, headers };
  } catch (error: any) {
    throw new Error(`参数解析失败: ${error.message}`);
  }
};

/**
 * 从响应头中获取缓存 ID
 * @param headers - 响应头对象
 * @returns 缓存 ID
 */
const getResponseCacheId = (headers?: ResponseHeaders): string => {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  return headers['x-magento-cache-id'] || headers['X-Magento-Cache-Id'] || '';
};

// ========================================
// 2. GraphQL 相关工具函数
// ========================================

interface GraphQLUtils {
  compressGraphQLQuery(query: string): string;
  isUrlTooLong(url: string, maxLength?: number): boolean;
  safeJSONStringify(obj: any): string;
}

const graphqlUtils: GraphQLUtils = {
  /**
   * 压缩 GraphQL 查询字符串并添加 __typename
   * @param query - GraphQL 查询字符串
   * @returns 压缩后的查询字符串
   */
  compressGraphQLQuery: (query: string): string => {
    if (!query || typeof query !== 'string') {
      return query;
    }

    // 1. 临时保护括号内的内容，避免替换其中的}
    const protectedSections: string[] = [];
    let sectionIndex = 0;

    // 保护所有被()包裹的内容
    let protectedQuery = query.replace(/\([^)]*\)/g, (match) => {
      const placeholder = `__PROTECTED_PARAM_${sectionIndex}__`;
      protectedSections[sectionIndex] = match;
      sectionIndex++;
      return placeholder;
    });

    // 2. 在除括号保护区域外的}前增加__typename
    protectedQuery = protectedQuery.replace(/}/g, ' __typename }');

    // 3. 恢复被保护的括号内容
    protectedSections.forEach((content, index) => {
      const placeholder = `__PROTECTED_PARAM_${index}__`;
      protectedQuery = protectedQuery.replace(placeholder, content);
    });

    return (
      protectedQuery
        // 移除注释
        .replace(/#.*$/gm, '')
        // 移除多余的空白字符和换行符
        .replace(/\s+/g, ' ')
        // 移除字符和符号周围的空格
        .replace(/\s*([{}(),:])\s*/g, '$1')
        // 移除开头和结尾的空格
        .trim()
    );
  },
  /**
   * 检查 URL 长度是否超过限制
   * @param url - 完整的 URL
   * @param maxLength - 最大长度限制
   * @returns 是否超过限制
   */
  isUrlTooLong: (url: string, maxLength: number = 8192): boolean => {
    return url.length > maxLength;
  },
  /**
   * 安全的 JSON 字符串化，处理 null/undefined
   * @param obj - 要序列化的对象
   * @returns JSON 字符串
   */
  safeJSONStringify: (obj: any): string => {
    if (obj === null || obj === undefined) {
      return '{}';
    }

    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.warn('JSON 序列化失败:', error);
      return '{}';
    }
  },
};

// ========================================
// 3. 错误处理相关工具函数
// ========================================

/**
 * 自定义 GraphQL 错误类
 */
class GraphQLError extends Error {
  name: string;
  statusCode: number;
  response: any;
  query: string;
  variables: any;
  timestamp: string;

  constructor(
    message: string, 
    statusCode: number, 
    response: any, 
    query?: string, 
    variables?: any
  ) {
    super(message);
    this.name = 'GraphQLError';
    this.statusCode = statusCode;
    this.response = response;
    this.query = query?.substring(0, 200) + (query?.length > 200 ? '...' : ''); // 截断长查询
    this.variables = variables;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      query: this.query,
    };
  }
}

interface ErrorHandlers {
  getErrorStatusCode(error: any): number;
  formatErrorResponse(error: any, query?: string, variables?: any): Record<string, any>;
}

const errorHandlers: ErrorHandlers = {
  /**
   * 获取错误对应的 HTTP 状态码
   * @param error - 错误对象
   * @returns HTTP 状态码
   */
  getErrorStatusCode: (error: any): number => {
    // 网络超时错误
    if (
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ERR_SOCKET_TIMEOUT'
    ) {
      return 400;
    }

    // 网络连接错误
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return 500;
    }

    // Axios 错误
    if (error?.isAxiosError) {
      return error.response?.status || 500;
    }

    // GraphQL 错误
    if (error?.networkError) {
      return error.networkError.statusCode || 500;
    }

    // 自定义错误
    if (error?.statusCode) {
      return error.statusCode;
    }

    // 默认服务器错误
    return 500;
  },
  /**
   * 格式化错误响应
   * @param error - 错误对象
   * @param query - GraphQL 查询字符串
   * @param variables - GraphQL 变量
   * @returns 格式化的错误响应
   */
  formatErrorResponse: (error: any, query?: string, variables?: any): Record<string, any> => {
    const statusCode = errorHandlers.getErrorStatusCode(error);
    // 基础错误信息
    const baseError = {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error occurred',
    };

    // 根据错误类型添加详细信息
    if (error?.response?.data) {
      // 包含服务器响应的错误
      return {
        ...baseError,
        data: null,
        errors: error.response.data.errors || [
          {
            message: error.message,
            extensions: {
              code: statusCode,
              exception: {
                stacktrace: error.stack?.split('\n'),
              },
            },
          },
        ],
        serverResponse: error.stack?.split('\n'),
      };
    }

    if (query) {
      return {
        ...baseError,
        data: null,
        errors: [
          {
            message: error.message,
            extensions: {
              code: statusCode,
              query: query?.substring(0, 100) + '...',
              variables: variables,
            },
          },
        ],
      };
    }

    // 通用错误
    return {
      ...baseError,
      data: null,
      errors: [
        {
          message: error.message,
          extensions: {
            code: statusCode,
          },
        },
      ],
    };
  },
};

export {
  getParamsAndHeaders,
  getResponseCacheId,
  graphqlUtils,
  GraphQLError,
  errorHandlers,
};