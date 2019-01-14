<template>
	<v-container grid-list-md>
		<v-layout row wrap>
		<v-flex xs12>
		<v-card>
			<v-card-title primary-title>
				<v-layout row wrap>
					<v-flex xs12>
						<h3 class="headline mb-0">Results</h3>
					</v-flex>
					<v-flex xs12>
					<v-data-table
						:headers="headers"
						:items="results"
						hide-actions
						class="elevation-1"
					>
						<template slot="items" slot-scope="props">
							<td>{{ props.item.name }}</td>
							<td class="text-xs-right">
							<a :href="$api + '/results/download/' + props.item.name">
							<v-icon
								small
								class="mr-2"
							>
								cloud_download
							</v-icon>
							</a>
							</td>
						</template>
					</v-data-table>
					</v-flex>
				</v-layout>
			</v-card-title>
		</v-card>
		</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
export default {
	data: () => ({
		headers: [
			{
				text: 'Name',
				align: 'left',
				value: 'name'
			},
			{ text: 'Actions', value: 'name', sortable: false, align: 'right' }
		],
		results: [
			{
				name: 'hi'
			},
			{
				name: 'world'
			}
		]
	}),
	methods: {
		updateResultsList() {
			var vm = this;
			vm.$axios.get(vm.$api + '/results/list').then(response => {
				vm.results = response.data
			}).catch(error => {
				console.log(error.response.data)
			})
		},
		
	},
	mounted() {
		var vm = this
		vm.updateResultsList()
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
