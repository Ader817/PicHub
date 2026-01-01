<template>
  <div class="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
    <div class="w-full max-w-md p-6 text-center pg-card-pop pg-interactive">
      <div class="text-4xl font-extrabold" :style="{ fontFamily: 'var(--pg-font-heading)' }">404</div>
      <div class="mt-2 text-sm" :style="{ color: 'var(--pg-muted-foreground)' }">页面不存在</div>
      <router-link class="mt-4 inline-block pg-link" to="/gallery">返回图库</router-link>
    </div>
  </div>
</template>
