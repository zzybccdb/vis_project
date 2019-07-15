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
						<!-- <v-layout>
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
						</v-layout> -->
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
						<v-btn color="primary" :loading="histogram_loading" :disabled="disableNewTrainBtn" @click="onHistogram">
							<v-icon>bar_chart</v-icon>
							Histogram
							<span slot="loader" class="arrow-loader">
								<v-icon light>cached</v-icon>
							</span>
						</v-btn>
					</v-form>
					<div ref='histWrapper' style="margin-top:10px;width: 100%;" v-if='histogram'>	
						<HISTOGRAM ref='histogram'/>
					</div>
					<v-layout style="height:572px" v-if="recon_loss || dist_loss" row nowrap>
						<div style="height:542px;width:512px">
							<ColorScatter ref='latent_scatter'/>
							<v-layout justify-space-around>
								<v-btn :disabled="disableNewTrainBtn" color="primary" @click="onReset">
									Reset
								</v-btn>
								<v-btn :disabled="disableNewTrainBtn" color="primary" @click="onMask">
									Ajuste
								</v-btn>
							</v-layout>
						</div>
						<v-layout  style="margin:10px" column>
							<canvas v-if="recon_loss" style="height:256px" id="loss"></canvas>
							<canvas v-if="dist_loss" style="height:256px" id="dis_loss"></canvas>
						</v-layout>
					</v-layout>
					</v-card-title>
				</v-card>
			</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
import Chart from 'chart.js'
import { setTimeout } from 'timers';
import HISTOGRAM from '@/components/Histogram.vue'
import ColorScatter from '@/components/ColorScatter.vue'
// import { EventEmitter } from 'events';

const EventBus = {}

export default {
	components: {
		HISTOGRAM,
		ColorScatter
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
		dist_loss:false,
		recon_loss:false,
		histogram:false,
		histogram_loading:false,
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
			this.$refs.box1.load()
			// this.$refs.box2.load()
			// return this.state == 'paused'
			return this.state == "ready"
		}
	},
	methods: {
		// 對 color scatter 進行 reset
		onReset(){
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.onReset()
		},
		// 對 color scatter 進行點的圈選
		onMask(){
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.mask = !latent_scatter.mask
		},
		onHistogram(){
			let vm = this 
			vm.histogram = !vm.histogram
			vm.histogram_loading = vm.histogram
			if(vm.histogram){
				setTimeout(() => {
					let histogram = vm.$refs.histogram
					EventBus.histogram = histogram
					histogram.eventBus = EventBus
					histogram.loadData()
					vm.histogram_loading = false
				}, 200);
			}
			else{
				// histogram.clear()
			}
		},
		onNewTrain() {
			let vm = this
			vm.requesting = 'newTrain'
			vm.start = true
			vm.histogram = false
			if(vm.network === 'NN based MDS'){
				vm.dist_loss = true
				vm.recon_loss = true
				window.recon_loss = true
				window.dist_loss = true 
				setTimeout(()=>{
					console.log('new loss graph')
					// 清除殘留圖像
					if(vm.loss_plot){
						vm.loss_plot.destroy()
					}					
					if(vm.dis_loss_plot){
						vm.dis_loss_plot.destroy()
					}
					// 
					let ctx = document.getElementById('loss').getContext('2d');
					vm.loss_plot = new Chart(ctx, vm.config)

					let dis = document.getElementById('dis_loss').getContext('2d')
					vm.dis_loss_plot = new Chart(dis,vm.dis_config)

					let latent_scatter = vm.$refs.latent_scatter
					EventBus.latent_scatter = latent_scatter
					latent_scatter.eventBus = EventBus
					
					vm.startTrain()
				},500)
			}else if(vm.network === 'Autoencoder' || vm.network === 'VAE'){
				vm.recon_loss = true
				window.recon_loss = true
				setTimeout(()=>{
					let ctx = document.getElementById('loss').getContext('2d');
					vm.loss_plot = new Chart(ctx, vm.config)

					vm.startTrain()
				},500)
			}
			else{
				vm.startTrain()
			}
		},

		startTrain(){
			let vm = this
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
			}).catch(error => {
				console.log('something went wrong!', error.response.data)
			}).finally(() => {
				console.log("clear loss chart")
				vm.requesting = 'none'

				vm.config.data.labels = []
				vm.config.data.datasets[0].data = []
				if(vm.recon_loss)
					vm.loss_plot.update()

				vm.dis_config.data.labels = []
				vm.dis_config.data.datasets[0].data = []
				if(vm.dist_loss)
					vm.dis_loss_plot.update()
			})
		},

		onContinue() {
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.onReset()
			vm.histogram = false
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
			let vm = this
			// 自動滾動，向下移動100px
			window.scroll({
				top: 100,
				left:0,
				behavior: 'smooth'
			});
			vm.requesting = 'pause'
			this.$axios.post(this.$api + '/train/pause').then(response => {
				vm.state = response.data.state
				vm.$axios.get(vm.$api + '/inference/get_training_latent').then(response => {
					let latent_scatter = vm.$refs.latent_scatter
					let data = response.data.latent
					latent_scatter.pointsTransition(data)
				}).catch(error => {
					console.log('Get progress went wrong!', error.response.data)
				})
			}).catch(error => {
				console.log('something went wrong!', error.response.data)
			}).finally(() => {
				vm.requesting = 'none'
			})
		},
		addLoss(rec_loss,dis_loss=undefined,step) {
			let vm = this;
			vm.config.data.labels.push(String(step));
			vm.config.data.datasets[0].data.push(rec_loss);
			if (vm.config.data.labels.length > 100) {
				vm.config.data.labels.shift();
				vm.config.data.datasets[0].data.shift();
			}
			vm.loss_plot.update()	

			if(dis_loss){
				vm.dis_config.data.labels.push(String(step));
				vm.dis_config.data.datasets[0].data.push(dis_loss);
				if (vm.dis_config.data.labels.length > 100) {
					vm.dis_config.data.labels.shift();
					vm.dis_config.data.datasets[0].data.shift();
				}
				vm.dis_loss_plot.update()
			}
		},
		getProgress() {
			let vm = this
			if (vm.state == 'training' && vm.requesting == 'none' && !vm.histogram) {
				this.$axios.post(this.$api + '/train/progress',{'start':vm.start}).then(response => {
					vm.state = response.data.state
					let model = response.data.model
					if(model === 'NN based MDS'){
						if(response.data.rec_loss && response.data.dis_loss){
							vm.addLoss(response.data.rec_loss,response.data.dis_loss,response.data.step)
						}
					}
					else{
						if(response.data.rec_loss){
							vm.addLoss(response.data.rec_loss,undefined,response.data.step)
						}						
					}
					// 加载 latent 资料点
					vm.$axios.get(vm.$api + '/inference/get_training_latent').then(response => {
						let latent_scatter = vm.$refs.latent_scatter
						let data = response.data.latent
						if(latent_scatter.latent){
							latent_scatter.pointsTransition(data)
						}
						else{
							latent_scatter.addPoints(data)
						}
					}).catch(error => {
						console.log('Get progress went wrong!', error.response.data)
					})
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
				// 清空當前 loss 圖表的圖表內容,已經清除圖表暫存數據
				vm.state = response.data.state
				vm.network_errors = []
				vm.requesting = 'none'

				vm.config.data.labels = []
				vm.config.data.datasets[0].data = []
				vm.loss_plot.update()

				vm.dis_config.data.labels = []
				vm.dis_config.data.datasets[0].data = []
				vm.dis_loss_plot.update()

				vm.dist_loss = false
				vm.recon_loss = false
				window.recon_loss = false
				window.dist_loss = false
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

				// 设定 histogram 为 false
				vm.histogram = !vm.histogram
				// 清空 scatter 
				vm.$refs.latent_scatter.removePoints()

			}).catch(error => {
				vm.dataset_errors = [error.response.data]
			})
		},
		onColumnsChange() {
			let vm = this
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
		vm.loss_plot = undefined
		vm.dis_loss_plot = undefined
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

		vm.recon_loss = window.recon_loss
		vm.dist_loss = window.dist_loss
		
		setTimeout(() => {			
			if(vm.recon_loss){
				let ctx = document.getElementById('loss').getContext('2d');
				vm.loss_plot = new Chart(ctx, vm.config)
			}
			if(vm.dist_loss){
				let dis = document.getElementById('dis_loss').getContext('2d')
				vm.dis_loss_plot = new Chart(dis,vm.dis_config)
			}
		}, 300);

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

		EventBus.root = vm
		vm.eventBus = EventBus
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
