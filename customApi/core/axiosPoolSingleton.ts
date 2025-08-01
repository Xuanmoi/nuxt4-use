import axios, { AxiosInstance } from 'axios';
import { HttpsAgent } from 'agentkeepalive';

// 声明全局变量类型
declare global {
  var __axiosInstance: AxiosInstance | undefined;
}

// 使用全局变量确保单例
global.__axiosInstance =
  global.__axiosInstance ||
  (() => {
    console.log('初始化HTTP连接池(仅初始化一次)');

    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 170,
      maxFreeSockets: 30,
      timeout: 60000,
      freeSocketTimeout: 30000,
    });

    return axios.create({
      baseURL: 'https://api.jeeda.net',
      httpsAgent,
      timeout: 60000,
    });
  })();

// 导出单例
export default global.__axiosInstance;