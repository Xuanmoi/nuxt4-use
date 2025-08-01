import api from './axiosPoolSingleton'; // 修正导入方式
import {
  getParamsAndHeaders,
  getResponseCacheId,
  graphqlUtils,
  GraphQLError,
  errorHandlers
} from './utils';

// 定义接口类型
interface InterfaceCallOptions {
  query: string;
  variables?: any;
  headers?: Record<string, string>;
  type?: 'post' | 'get';
}

interface ApiResponse {
  code: number;
  data?: any;
  statusCode?: number;
  message?: string;
}

const graphqlUrl = '/graphql'; // 注意这里变成了相对路径，因为baseURL已设置

/**
 * 执行GraphQL请求的核心函数
 * @param options - 请求选项
 * @returns 响应数据或错误信息
 */
const interfaceCall = async ({
  query,
  variables,
  headers = {},
  type = 'post',
}: InterfaceCallOptions): Promise<ApiResponse> => {
  try {
    if (type === 'get') {
      // 压缩 GraphQL 查询
      const compressedQuery = graphqlUtils.compressGraphQLQuery(query);
      // 处理变量
      const variablesStr = graphqlUtils.safeJSONStringify(variables);

      // 对压缩后的查询进行编码
      const encodedQuery = encodeURIComponent(compressedQuery);
      const encodedVariables = encodeURIComponent(variablesStr);

      // 构建完整 URL
      const fullUrl = `${graphqlUrl}?query=${encodedQuery}&variables=${encodedVariables}`;

      // 检查 URL 长度，如果太长则自动切换到 POST
      if (graphqlUtils.isUrlTooLong(fullUrl)) {
        console.warn('GET 请求 URL 过长，自动切换为 POST 请求');
        return await interfaceCall({
          query,
          variables,
          headers,
          type: 'post',
        });
      }

      const response = await api.get(fullUrl, { headers });
      if (response) {
        response.data = {
          ...response?.data,
          cacheId: getResponseCacheId(response?.headers),
        };
      }
      const data: ApiResponse = {
        code: 0,
        data: response?.data,
      };
      return data;
    } else {
      const graphqlQuery = {
        query,
        variables,
      };
      const response = await api.post(graphqlUrl, graphqlQuery, {
        headers,
      });
      if (response) {
        response.data = {
          ...response?.data,
          cacheId: getResponseCacheId(response?.headers),
        };
      }

      const data: ApiResponse = {
        code: 0,
        data: response?.data,
      };
      return data;
    }
  } catch (error: any) {
    // 创建 GraphQL 错误对象
    const statusCode = errorHandlers.getErrorStatusCode(error);

    let message = error.message || 'Unknown error occurred';
    // 根据错误类型定制错误消息
    if (error.code === 'ENOTFOUND') {
      message = 'Network connection failed - server not found';
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Network connection refused by server';
    } else if (error.response) {
      message = `Server error: ${error?.response?.status} ${error?.response?.statusText}`;
    }
    const data: ApiResponse = {
      code: -1,
      statusCode: statusCode,
      message: message,
      data: error?.response?.data,
    };
    // 返回格式化的错误响应
    return data;
  }
};

// 导出接口和函数
export {
  getParamsAndHeaders,
  interfaceCall,
  // 导出类型定义，方便其他模块使用
  InterfaceCallOptions,
  ApiResponse,
};