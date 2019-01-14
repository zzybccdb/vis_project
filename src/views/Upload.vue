<template>
	<v-container grid-list-md>
		<v-layout row wrap>
		<v-flex xs12>
		<v-card>
			<v-card-title primary-title>
				<v-layout row wrap>
					<v-flex xs12>
						<h3 class="headline mb-0">Upload your data</h3>
					</v-flex>
					<v-flex xs12>
						<v-text-field v-model="new_dataset_name" label="Dataset Name" required></v-text-field>
					</v-flex>
					<v-flex xs12>
						<v-btn class="primary" @click="onPickFile" :loading="uploading" :disabled="uploading">Choose File</v-btn>
						<input type="file" style="display: none" ref="fileInput" @change="uploadDataset">
					</v-flex>
					<v-flex xs12>
						<v-alert
						:value="this.uploadStatus == 'success'"
						type="success"
						transition="scale-transition"
						>
						Your dataset has been successfully uploaded.
						</v-alert>
						<v-alert
						:value="this.uploadStatus == 'failed'"
						type="error"
						>
						An error has occurred when uploading your dataset: {{ uploadErrorMsg }}
						</v-alert>
					</v-flex>
				</v-layout>
			</v-card-title>
		</v-card>
		</v-flex>
		<v-flex xs12>
		<v-card>
			<v-card-title primary-title>
				<v-layout row wrap>
					<v-flex xs12>
						<h3 class="headline mb-0">Datasets</h3>
					</v-flex>
					<v-flex xs12>
					<v-data-table
						:headers="headers"
						:items="datasets"
						hide-actions
						class="elevation-1"
					>
						<template slot="items" slot-scope="props">
							<td>{{ props.item.name }}</td>
							<td class="text-xs-right">
							<v-icon
								small
								class="mr-2"
								@click="editItem(props.item)"
							>
								edit
							</v-icon>
							<v-icon
								small
								@click="deleteItem(props.item)"
							>
								delete
							</v-icon>
							</td>
						</template>
					</v-data-table>
					</v-flex>
				</v-layout>
			</v-card-title>
		</v-card>
		</v-flex>
		</v-layout>
		<v-dialog
		v-model="uploading"
		persistent
		width="300"
		>
		<v-card
			color="primary"
			dark
		>
			<v-card-text>
			Uploading ... Please stand by
			<v-progress-linear
				indeterminate
				color="white"
				class="mb-0"
			></v-progress-linear>
			</v-card-text>
		</v-card>
		</v-dialog>
	</v-container>
</template>

<script>
export default {
	data: () => ({
		uploadErrorMsg: 'none',
		uploadStatus: 'done',
		new_dataset_name: 'mydataset',
		headers: [
			{
				text: 'Name',
				align: 'left',
				value: 'name'
			},
			{ text: 'Actions', value: 'name', sortable: false, align: 'right' }
		],
		datasets: [
			{
				name: 'hi'
			},
			{
				name: 'world'
			}
		]
	}),
	computed: {
		uploading() {
			return this.uploadStatus == 'uploading'
		}
	},
	methods: {
		onPickFile() {
			this.$refs.fileInput.click();
		},
		editItem(item) {
			console.log(item, 'edit not implemented')
		},
		deleteItem(item) {
			var vm = this;
			vm.$axios.post(vm.$api + '/dataset/delete', {
				'name': item.name
			}).then(() => {
				vm.updateDatasetList()
			}).catch(error => {
				console.log(error.response.data)
			})
		},
		updateDatasetList() {
			var vm = this;
			vm.$axios.get(vm.$api + '/dataset/list_all').then(response => {
				vm.datasets = response.data
			}).catch(error => {
				console.log(error.response.data)
			})
		},
		uploadDataset() {
			let files =  this.$refs.fileInput.files
			
			if (files.length <= 0) {
				return;
			}

			var vm = this
			vm.uploadStatus = 'uploading'
			
			let formData = new FormData()
			formData.append('name', vm.new_dataset_name)
			formData.append('file', files[0])

			vm.$axios.post(vm.$api + '/dataset/upload', formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			}).then(() => {
				vm.uploadStatus = 'success'
				vm.updateDatasetList()
			}).catch(error => {
				vm.uploadStatus = 'failed'
				vm.uploadErrorMsg = error.response.data
			}).finally(() => {
				this.$refs.fileInput.value = ''; // so that it can upload same file consecutively
			})
		}
	},
	mounted() {
		var vm = this
		vm.updateDatasetList()
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
