<template>
<v-app id="inspire">
	<v-navigation-drawer
	:mini-variant.sync="mini"
	permanent
	fixed
	app
	>
	<v-toolbar flat>
	<v-list>
		<v-list-tile avatar>
		<v-list-tile-avatar>
			<img src="/logo.png">
		</v-list-tile-avatar>
		<v-list-tile-content>
			<v-list-tile-title>Dashboard</v-list-tile-title>
		</v-list-tile-content>
		<v-list-tile-action>
			<v-btn
			icon
			@click.stop="mini = !mini"
			>
			<v-icon>chevron_left</v-icon>
			</v-btn>
		</v-list-tile-action>
		</v-list-tile>
	</v-list>
	</v-toolbar>

	<v-divider></v-divider>

	<v-list dense class="pt-0">
	<router-link :to="item.href" tag="v-list-tile" v-for="item in items" :key="item.title">
		<v-list-tile-action>
		<v-icon>{{ item.icon }}</v-icon>
		</v-list-tile-action>

		<v-list-tile-content>
		<v-list-tile-title>{{ item.title }}</v-list-tile-title>
		</v-list-tile-content>
	</router-link>
	</v-list>
	</v-navigation-drawer>
	<v-content>

	<transition name="fade" mode="out-in">
		<router-view/>
	</transition>
	
	</v-content>
	<!-- <v-footer color="indigo" app>
	<span class="white--text">&copy; 2018</span>
	</v-footer> -->
</v-app>
</template>

<script>
export default {
	data: () => ({
		mini: false,
		items: [
			{ title: 'Training', icon: 'build' , href: 'training'},
			{ title: 'Upload Dataset', icon: 'cloud_upload' , href: 'upload'},
			{ title: 'Data Sheet', icon:'table_chart', href: 'RawDataTable'},
			{ title: 'Results', icon: 'attachment' , href: 'results'},
			{ title: 'Calender View', icon: 'pie_chart' , href: 'colormap'},
			// { title: 'Streamgraph', icon: 'pie_chart' , href: 'Streamgraph'},
			// { title: 'test', icon: 'pie_chart' , href: 'TestView'},
		]
	}),
	watch: {
		mini() {
			var vm = this
			vm.$store.commit('toggleMenuDrawer')
		}
	},
	mounted() {
		window.vm_root = this;
	}
}
</script>

<style>
.fade-enter {
	opacity: 0;
}

.fade-enter-active {
	transition: opacity 0.4s ease;
}

.fade-leave {}

.fade-leave-active {
	transition: opacity 0.4s ease;
	opacity: 0;
}

/* total width */
::-webkit-scrollbar {
	background-color:#fff;
	width:16px
}

/* background of the scrollbar except button or resizer */
body::-webkit-scrollbar-track {
	background-color:#fff
}

/* scrollbar itself */
::-webkit-scrollbar-thumb {
	background-color:#babac0;
	border-radius:16px;
	border:4px solid #fff
}

/* set button(top and bottom of the scrollbar) */
::-webkit-scrollbar-button {display:none}




</style>
