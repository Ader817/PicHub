import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'cropperjs/dist/cropper.css'
import './style.css'
import { pinia } from './pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
