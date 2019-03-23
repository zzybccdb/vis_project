<template>
	<v-container grid-list-md fill-height>
		<v-layout row wrap>
			<v-flex xs12>
				<v-card>
					<v-card-title primary-title>
					<v-form fill-width id="model-form">
						<v-select
						:error-messages="network_errors"
						v-model="network"
						:items="networks"
						label="Model"
						@change="updateParam(onNetworkChange)"
						:disabled="disableForm"
						></v-select>
						<v-select
						:error-messages="dataset_errors"
						v-model="dataset"
						:items="datasets"
						label="Dataset"
						@change="updateParam(onDatasetChange)"
						:disabled="disableForm"
						></v-select>
						<v-combobox
						:error-messages="columns_errors"
						v-model="columns"
						:items="columns_all"
						label="Dimension"
						multiple
						chips
						clearable
						@change="updateParam(onColumnsChange)"
						:disabled="disableForm"
						>
							<template slot="selection" slot-scope="data">
							<v-chip
								:selected="data.selected"
								close
								small
								text-color="white"
								:color="disableForm ? 'grey' : 'green'"
								@input="remove(data.item)"
							>
								<strong>{{ data.item }}</strong>&nbsp;
							</v-chip>
							</template>
						</v-combobox>
						<!-- Learning Rate, Batch Size, Loss Weight -->
						<v-layout>
							<v-text-field
							:error-messages="learning_rate_errors"
							:disabled="disableForm"
							v-model="learning_rate"
							label="Learning Rate"
							@change="updateParam(onLearningRateChange)"
							></v-text-field>
							<v-text-field
							:error-messages="batch_size_errors"
							:disabled="disableForm"
							v-model="batch_size"
							label="Batch Size"
							@change="updateParam(onBatchSizeChange)"
							></v-text-field>
							<v-text-field
							:error-messages="loss_weight_errors"
							:disabled="disableForm"
							v-model="loss_weight"
							label="Loss Weight"
							@change="onLossWeightChange">
							</v-text-field>
						</v-layout>
						<!-- Window Input Output -->
						<v-layout>
							<v-text-field label="Input Window Size"
							:error-messages="input_window_errors"
							:disabled="disableForm"
							v-model="input_window"
							@change="onWindowSizeChange">
							</v-text-field>
							<v-text-field label="Output Window Size"
							:error-messages="output_window_errors"
							:disabled="disableForm"
							v-model="output_window"
							@change="onWindowSizeChange">
							</v-text-field>
						</v-layout>
						<v-btn :loading="requesting == 'newTrain'" color="primary" :disabled="disableNewTrainBtn" @click="onNewTrain">
							<v-icon>add_box</v-icon>
							New Training
							<span slot="loader" class="arrow-loader">
								<v-icon light>cached</v-icon>
							</span>
						</v-btn>
						<v-btn :loading="requesting == 'continue'" :disabled="disableContinueBtn" @click="onContinue">
							<v-icon>play_arrow</v-icon>
							Continue
							<span slot="loader" class="arrow-loader">
								<v-icon light>cached</v-icon>
							</span>
						</v-btn>
						<v-btn :loading="requesting == 'pause'" :disabled="disablePauseBtn" @click="onPause">
							<v-icon>pause</v-icon>
							Pause
							<span slot="loader" class="arrow-loader">
								<v-icon light>cached</v-icon>
							</span>
						</v-btn>
					</v-form>
					<v-layout column>
						<canvas style="height:450px" id="loss"></canvas>
						<canvas style="height:450px" id="dis_loss"></canvas>
					</v-layout>
					<div style="width: 100%;">
						<!-- <box-plot
						v-if="showAnalysis"
						title='Importance of each dimension (Compare with ground truth)' 
						api-url='/analysis/dim_importance'
						ref="box1"></box-plot> -->
						<!-- <box-plot
						v-if="showAnalysis"
						title='Reconstruction error rate for each dimension' 
						api-url='/analysis/dim_reconstruct'
						ref="box2"></box-plot> -->
					</div>
					</v-card-title>
				</v-card>
			</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
import Chart from 'chart.js'
// import BoxPlot from '@/components/BoxPlot.vue'

export default {
	components: {
		// BoxPlot
	},
	data: () => ({
		state: 'reset',
		network: undefined,
		network_errors: [],
		networks: [
		],
		dataset: undefined,
		dataset_errors: [],
		datasets: [
		],
		columns_all: [
		],
		columns: [
		],
		columns_errors: [],
		learning_rate: 0.0001,
		learning_rate_errors: [],
		input_window_errors:[],
		output_window_errors:[],
		loss_weight_errors:[],
		batch_size: 64,
		batch_size_errors: [],
		loaded: false,
		requesting: 'none',
		switch_dataset: false,
		input_window:1,
		output_window:1,
		loss_weight:1.00,

	}),
	computed: {
		anyError() {
			return this.network_errors.length > 0 ||
				this.dataset_errors.length > 0 ||
				this.columns_errors.length > 0 ||
				this.learning_rate_errors.length > 0 ||
				this.batch_size_errors.length > 0 ||
				this.input_window_errors.length > 0 ||
				this.output_window_errors.length > 0 ||
				this.loss_weight_errors.length > 0 ||
				this.requesting !== 'none'
		},
		disableForm() {
			return this.requesting !== 'none' || this.state == 'training' || !this.loaded
		},
		disableNewTrainBtn() {
			return this.requesting !== 'none' || this.state == 'training' || this.anyError
		},
		disableContinueBtn() {
			return this.requesting !== 'none' || this.state == 'training' || this.state == 'reset' || this.anyError
		},
		disablePauseBtn() {
			// return this.requesting !== 'none' || this.state == 'paused' || this.state == 'reset'
			return this.requesting !== 'none' || this.state == 'ready' || this.state == 'reset'
		},

		showAnalysis() {
			// this.$refs.box1.load()
			// this.$refs.box2.load()
			// return this.state == 'paused'
			return this.state == "ready"
		}
	},
	methods: {
		onNewTrain() {
			var vm = this
			vm.requesting = 'newTrain'
			vm.start = true
			// this.$axios.post(this.$api + '/train/start_new', {
			this.$axios.post(this.$api + '/train/start', {
				'network': vm.network,
				'dataset': vm.dataset,
				'columns': vm.columns,
				'learning_rate': Number(vm.learning_rate),
				'batch_size': Number(vm.batch_size),
				'loss_weight':Number(vm.loss_weight),
				'input_window':Number(vm.input_window),
				'output_window':Number(vm.output_window),
			}).then(response => {
				vm.state = response.data.state
				vm.start = true
			}).catch(error => {
				console.log('something went wrong!', error.response.data)
			}).finally(() => {
				vm.requesting = 'none'

				vm.config.data.labels = []
				vm.config.data.datasets[0].data = []

				vm.loss_plot.update()

				vm.dis_config.data.labels = []
				vm.dis_config.data.datasets[0].data = []
				vm.dis_loss_plot.update()
			})
		},
		onContinue() {
			var vm = this
			vm.requesting = 'continue'
			this.$axios.post(this.$api + '/train/continue').then(response => {
				vm.state = response.data.state
			}).catch(error => {
				console.log('something went wrong!', error.response.data)
			}).finally(() => {
				vm.requesting = 'none'
			})
		},
		onPause() {
			var vm = this
			vm.requesting = 'pause'
			this.$axios.post(this.$api + '/train/pause').then(response => {
				vm.state = response.data.state
			}).catch(error => {
				console.log('something went wrong!', error.response.data)
			}).finally(() => {
				vm.requesting = 'none'
			})
		},
		addLoss(rec_loss,dis_loss,step) {
			let vm = this;
			vm.config.data.labels.push(String(step));
			vm.config.data.datasets[0].data.push(rec_loss);
			console.log(step,rec_loss)
			if (vm.config.data.labels.length > 100) {
				vm.config.data.labels.shift();
				vm.config.data.datasets[0].data.shift();
			}

			vm.dis_config.data.labels.push(String(step));
			vm.dis_config.data.datasets[0].data.push(dis_loss);
			if (vm.dis_config.data.labels.length > 100) {
				vm.dis_config.data.labels.shift();
				vm.dis_config.data.datasets[0].data.shift();
			}

			vm.dis_loss_plot.update()
			vm.loss_plot.update()	
		},
		getProgress() {
			var vm = this
			if (vm.state == 'training' && vm.requesting == 'none') {
				this.$axios.post(this.$api + '/train/progress',{'start':vm.start}).then(response => {
					vm.state = response.data.state
					console.log(response.data)
					if(response.data.rec_loss && response.data.dis_loss){
						vm.addLoss(response.data.rec_loss,response.data.dis_loss,response.data.step)
					}
					
				}).catch(error => {
					console.log('something went wrong!', error.response.data)
				})
				vm.start = false
			}
		},
		remove (item) {
			this.columns.splice(this.columns.indexOf(item), 1)
			this.columns = [...this.columns]
		},
		updateParam(cb) {
			if (this.loaded) {
				cb()
			}
		},
		onNetworkChange() {
			var vm = this
			this.$axios.post(this.$api + '/train/set_param', {
				'network': vm.network
			}).then(response => {
				vm.state = response.data.state
				vm.network_errors = []
			}).catch(error => {
				vm.network_errors = [error.response.data]
			})
		},
		onDatasetChange() {
			var vm = this
			console.log(vm.dataset)
			vm.start = true
			this.$axios.post(this.$api + '/train/change_dataset', {
				'name': vm.dataset
			}).then(response => {
				vm.state = response.data.state
				vm.switch_dataset = true
				vm.columns_all = response.data.columns_all
				vm.columns = response.data.columns
				vm.dataset_errors = []
			}).catch(error => {
				vm.dataset_errors = [error.response.data]
			})
		},
		onColumnsChange() {
			var vm = this
			if(vm.switch_dataset){
				vm.switch_dataset = false
				return
			}
			if (vm.columns.length == 0) {
				return
			}
			if (!vm.columns_all.includes(vm.columns[0])) {
				let newcols = vm.columns[0].split(',').map(c => {
					return c.trim()
				})
				vm.columns = []
				newcols.forEach(c => {
					if (vm.columns_all.includes(c)) {
						vm.columns.push(c)
					}
				})
			}
			this.$axios.post(this.$api + '/train/set_param', {
				'columns': vm.columns
			}).then(response => {
				vm.state = response.data.state
				vm.columns_errors = []
			}).catch(error => {
				vm.columns_errors = [error.response.data]
			})
		},
		onLearningRateChange() {
			var vm = this
			this.$axios.post(this.$api + '/train/set_param', {
				// 'learning_rate': vm.learning_rate
				'learning_rate': Number(vm.learning_rate)
			}).then(response => {
				vm.state = response.data.state
				vm.learning_rate_errors = []
			}).catch(error => {
				vm.learning_rate_errors = [error.response.data]
			})
		},
		onBatchSizeChange() {
			var vm = this
			this.$axios.post(this.$api + '/train/set_param', {
				// 'batch_size': vm.batch_size
				'batch_size': Number(vm.batch_size)
			}).then(response => {
				vm.state = response.data.state
				vm.batch_size_errors = []
			}).catch(error => {
				vm.batch_size_errors = [error.response.data]
			})
		},
		onWindowSizeChange(){
			let vm = this
			vm.$axios.post(this.$api + '/train/set_param',{
				'input_window':Number(vm.input_window),
				'output_window':Number(vm.output_window)
			}).then(res => {
				vm.state = res.data.state
				vm.input_window_errors = []
				vm.output_window_errors = []
			}).catch(error => {
				vm.input_window_errors = [error.response.data]
				vm.output_window_errors = [error.response.data]
			})
		},
		onLossWeightChange(){
			let vm = this
			vm.$axios.post(this.$api + '/train/set_param',{	
				'loss_weight':Number(vm.loss_weight)
			}).then(res => {
				vm.state = res.data.state
				vm.loss_weight_errors = []
			}).catch(error => {
				vm.loss_weight_errors = [error.response.data]
			})
		},
	},
	mounted() {
		var vm = this;
		window.vm = vm
		vm.config = {
			type: 'line',
			data: {
				labels: [],
				datasets: [{
					label: '',
					backgroundColor: 'rgb(255, 99, 132)',
					borderColor: 'rgb(255, 99, 132)',
					data: [],
					fill: false,
				}]
			},
			options: {
				legend: {
					display: false
				},
				responsive: true,
				title: {
					display: true,
					text: 'Reconstruction Loss'
				},
				tooltips: {
					mode: 'index',
					intersect: false,
				},
				hover: {
					mode: 'nearest',
					intersect: true
				},
				scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Gradient Step'
						}
					}],
					yAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Value'
						}
					}]
				}
			}
		}
		vm.dis_config = {
			type: 'line',
			data: {
				labels: [],
				datasets: [{
					label: '',
					backgroundColor: 'rgb(99, 132, 255)',
					borderColor: 'rgb(99, 132, 255)',
					data: [],
					fill: false,
				}]
			},
			options: {
				legend: {
					display: false
				},
				responsive: true,
				title: {
					display: true,
					text: 'Distance Loss'
				},
				tooltips: {
					mode: 'index',
					intersect: false,
				},
				hover: {
					mode: 'nearest',
					intersect: true
				},
				scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Gradient Step'
						}
					}],
					yAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Value'
						}
					}]
				}
			}
		}
		var ctx = document.getElementById('loss').getContext('2d');
		vm.loss_plot = new Chart(ctx, vm.config)
		let dis = document.getElementById('dis_loss').getContext('2d')
		vm.dis_loss_plot = new Chart(dis,vm.dis_config)
		// this.$axios.post(this.$api + '/train/get_param', {
		// 	'param': [
		this.$axios.post(this.$api + '/train/get_param', [
				'networks',
				'network',
				'datasets',
				'dataset',
				'columns_all',
				'columns',
				'learning_rate',
				'batch_size',
				'state',
				'loss_weight',
				'input_window',
				'output_window',
			// ]
		// }).then((response) => {
		]).then((response) => {
			vm.state = response.data.state
			vm.network = response.data.network
			vm.networks = response.data.networks
			vm.dataset = response.data.dataset
			vm.datasets = response.data.datasets
			vm.columns = response.data.columns
			vm.columns_all = response.data.columns_all
			vm.learning_rate = response.data.learning_rate
			vm.batch_size = response.data.batch_size
			vm.loss_weight = response.data.loss_weight
			vm.input_window = response.data.input_window
			vm.output_window = response.data.output_window
			vm.$nextTick(function() {
				vm.loaded = true
			})
		})
		// 一秒鐘詢問一次當前的 loss數值
		vm.timer = setInterval(vm.getProgress.bind(vm), 1000)
	},

	beforeDestroy() {
		clearInterval(this.timer)
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#model-form {
	width: 100%;
}
#loss {
	max-width: 1024px;
	max-height: 784px;
}

.arrow-loader {
	animation: loader 1s infinite;
	display: flex;
}
@-moz-keyframes loader {
	from {
		transform: rotate(0);
	}
	to {
		transform: rotate(360deg);
	}
}
@-webkit-keyframes loader {
	from {
		transform: rotate(0);
	}
	to {
		transform: rotate(360deg);
	}
}
@-o-keyframes loader {
	from {
		transform: rotate(0);
	}
	to {
		transform: rotate(360deg);
	}
}
@keyframes loader {
	from {
		transform: rotate(0);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
