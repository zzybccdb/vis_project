import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
//   mode: 'history',
  base: process.env.BASE_URL,
  routes: [
	{
		path: '/',
		redirect: '/training'
	},
	{
		path: '/training',
		name: 'home',
		component: () => {return import('@/views/Home.vue')}
	},
	{
		path: '/upload',
		name: 'upload',
		component: () => {return import('@/views/Upload.vue')}
	},
	{
		path: '/results',
		name: 'results',
		component: () => {return import('@/views/Results.vue')}
	},
	{
		path: '/colormap',
		name: 'colormap',
		component: () => {return import('@/views/Colormap.vue')}
	},
	{
		path: '/Streamgraph',
		name: 'Streamgraph',
		component: () => {return import('@/views/test.vue')}		
	},
  ]
})
