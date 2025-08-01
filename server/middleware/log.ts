export default defineEventHandler((event) => {
  console.log('新请求: ' + getRequestURL(event))
})
