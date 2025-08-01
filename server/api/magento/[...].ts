import { interfaceCall } from '~/../customApi/core/index';

const getRoute = async (params:any) => {
  console.log('getRoute', params);
   const variables = {
      url: params[0],
    };
    const query = `query route($url:String!){
        route(url:$url) {
          type
          redirect_code
          relative_url
          ...on ProductInterface {
            sku
          }
          ...on CategoryTree {
            uid
            level
          }
          ...on CmsPage {
            identifier
          }
          ...on CategoryInterface {
            uid
            id
          }
        }
      }`;

    const response = await interfaceCall({
      type: 'get',
      query,
      variables,
      headers:{},
    });
    return response;
}
export default defineEventHandler(async (event) => {
  // event.context.path 获取路由路径：'/api/foo/bar/baz'
  // event.context.params._ 获取路由段：'bar/baz'
  //console.log('defineEventHandler', event);
  // 这里可以去接收历史版本的/api/magento/[...].ts信息，进行请求的发起处理和返回
  const method = event._method;
  // @ts-ignore
  const functionName = event.context.params._;
  let response;
  if (method === 'GET') {
    console.log('GET 请求');
    const params = await getQuery(event);
    console.log('路由参数:', params);

    if (functionName) {
      response = getRoute(params.params)
    }
  } else if (method === 'POST') {
    console.log('POST 请求');
    const body = await readBody(event);
    console.log('请求体:', body);
  }

   //console.log('响应:', response);
  return response;
})
