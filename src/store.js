import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		drawer: false,
	},
	mutations: {
		toggleMenuDrawer() {
			this.state.drawer = !this.state.drawer
		}
	},
	getters: {
		getMenuDrawer: state => {
			return state.drawer
		}
	},
	actions: {

	}
})
