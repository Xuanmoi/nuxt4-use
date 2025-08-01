<template>
  <div>
    <h1>欢迎来到首页</h1>
    <!-- <AppAlert>
      这是一个自动导入的组件
    </AppAlert> -->
    <!-- 中间件发请求 -->
    <!-- 组件里发请求 -->
    <!-- 验证生产模式下工作情况 -->
    <!-- 发起graphql请求 -->
     {{ data }}
  </div>
</template>
<script setup lang="ts">
const { data } = await useFetch('/api/magento/test', {
    method: 'get',
    query: {
      params: ['injection-pump', {}]
    }
  })
</script>