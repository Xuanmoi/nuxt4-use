export default defineEventHandler(async (event) => {
  // event.context.path 获取路由路径：'/api/foo/bar/baz'
  // event.context.params._ 获取路由段：'bar/baz'
  // console.log('defineEventHandler', event);
  const method = event._method;
  if (method === 'GET') {
    console.log('GET 请求');
    const params = await getQuery(event);
    console.log('路由参数:', params);
  } else if (method === 'POST') {
    console.log('POST 请求');
    const body = await readBody(event);
    console.log('请求体:', body);
  }

  return `默认 foo 处理器`
})
