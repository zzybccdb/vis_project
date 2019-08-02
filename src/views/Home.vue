<template>
	<v-container ref='Home' grid-list-md fill-height>
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
						<!-- 欄位選擇 -->
						<v-combobox
						:error-messages="columns_errors"
						v-model="columns"
						:items="columns_all"
						label="Dimension"
						multiple
						chips
						@change="updateParam(onColumnsChange)"
						:disabled="disableForm"
						readonly
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
						<div ref='pcpChart' style='margin:0px;width:100%'>
							<PCP ref='pcp' v-if="pcp"/>
						</div>

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
					<!-- training 結果預覽圖表部分 -->
					<!-- <v-layout style="height:572px" v-if="recon_loss || dist_loss" row nowrap> -->
					<v-layout style="height:572px" row nowrap>
						<div style="height:542px;width:512px">
							<ColorScatter ref='latent_scatter'/>
							<v-layout style='width:528px' justify-space-between>
								<v-btn ref='adjust' :disabled="disableNewTrainBtn || pcp" color="primary" @click="onMask">
									<v-icon>swap_horiz</v-icon>
									{{adjust}}
								</v-btn>
								<v-btn :disabled="disableNewTrainBtn" color="primary" @click="onClearAllMask">
									<v-icon>delete_outline</v-icon>
									Clear All Mask
								</v-btn>
								<v-btn :disabled="disableNewTrainBtn" color="primary" @click="onPCP">
									<v-icon>check_circle_outline</v-icon>
									PCP
								</v-btn>
							</v-layout>
						</div>
						<v-layout  style="margin:10px" column>
							<div ref='histWrapper' style="margin-top:10px;width:100%;height:362px;overflow-y:scroll">	
								<HISTOGRAM ref='histogram'/>
							</div>
							<canvas v-if="recon_loss" style="height:150px;maxwidth:521px" id="loss"></canvas>
							<canvas v-if="dist_loss" style="height:150px;maxwidth:512px" id="dis_loss"></canvas>
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
import PCP from '@/components/Pcp_only.vue'
// import { EventEmitter } from 'events';

const EventBus = {}
let id = 0
export default {
	components: {
		HISTOGRAM,
		ColorScatter,
		PCP
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
		pcp: false,
		// histogram_loading:false,
		adjust: 'pan'
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
			return this.requesting !== 'none' || this.state === 'training' || !this.loaded
		},
		disableNewTrainBtn() {
			return this.requesting !== 'none' || this.state === 'training' || this.anyError
		},
		disableContinueBtn() {
			return (this.requesting !== 'none' || this.state === 'training' || this.state === 'reset' || this.anyError) || !(this.recon_loss || this.dist_loss)
		},
		disablePauseBtn() {
			return this.requesting !== 'none' || this.state === 'ready' || this.state === 'reset'
		},

		showAnalysis() {
			this.$refs.box1.load()
			// this.$refs.box2.load()
			// return this.state == 'paused'
			return this.state == "ready"
		}
	},
	methods: {
		// 绘制 PCP
		onPCP(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			vm.pcp = !vm.pcp
			latent_scatter.pcp_mode = !latent_scatter.pcp_mode
			latent_scatter.mask_mode = latent_scatter.pcp_mode
			vm.adjust = (latent_scatter.mask_mode)?'adjust':'pan'

			// if(vm.adjust !== 'pan'){
			// 	vm.$d3.select('#colorScatter').on('.zoom',null)
			// }
			// else{
			// 	vm.$d3.select('#colorScatter').call(latent_scatter.zoom)
			// }

			if(vm.pcp){
				vm.$axios.get(vm.$api + '/inference/dimension_extent').then(response => {
					let extents = response.data.extents
					let pcp = vm.$refs.pcp
					vm.eventBus.pcp = pcp
					pcp.eventBus = vm.eventBus
					window.scroll({
						top: document.body.scrollHeight-980,
						left: 0,
						behavior: 'smooth'
					});
					pcp.setDimensions(latent_scatter.columns,latent_scatter.data,extents)
				}).catch(error => {
					console.error('获取资料 extents 时错误',error)
				})			
			}
			else{
				latent_scatter.resetColor()
			}

		},
		// 對 color scatter 進行 reset
		onReset(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.onReset()
		},
		// 對 color scatter 進行點的圈選
		onMask(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			if(latent_scatter.mask_pts === undefined){
				latent_scatter.mask_mode = !latent_scatter.mask_mode
				latent_scatter.confirmControlPoints()
			}
			vm.adjust = (latent_scatter.mask_mode)?'adjust':'pan'
			// if(vm.adjust !== 'pan'){
			// 	vm.$d3.select('#colorScatter').on('.zoom',null)
			// }
			// else{
			// 	vm.$d3.select('#colorScatter').call(latent_scatter.zoom)
			// }
		},
		//////////////// 對移動後的 color scatter 進行確認
		// onConfirm(){
		// 	let vm = this
		// 	let latent_scatter = vm.$refs.latent_scatter
		// 	latent_scatter.confirm()
		// },
		////////////////
		// 清空所有 mask 内容
		onClearAllMask(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.clearAllMask()
		},
		onNewTrain() {
			let vm = this
			vm.requesting = 'newTrain'
			vm.start = true
			vm.pcp = false
			if(vm.network === 'NN based MDS'){
				vm.dist_loss = true
				window.dist_loss = true 
				// vm.recon_loss = true
				// window.recon_loss = true
				setTimeout(()=>{
					let latent_scatter = vm.$refs.latent_scatter
					EventBus.latent_scatter = latent_scatter
					latent_scatter.eventBus = EventBus
					latent_scatter.mask_group = []
					// 清除殘留圖像
					// if(vm.loss_plot){
					// 	vm.loss_plot.destroy()
					// }					
					if(vm.dis_loss_plot){
						vm.dis_loss_plot.destroy()
					}
					// 清空 scatter 
					latent_scatter.removePoints()
					// 重新宣告曲线图
					// let ctx = document.getElementById('loss').getContext('2d');
					// vm.loss_plot = new Chart(ctx, vm.config)

					let dis = document.getElementById('dis_loss').getContext('2d')
					vm.dis_loss_plot = new Chart(dis,vm.dis_config)

					vm.startTrain()
					// 自動滾動，向下移動到最底部
					window.scroll({
						top: document.body.scrollHeight,
						left: 0,
						behavior: 'smooth'
					});

				},500)
			}else if(vm.network === 'Autoencoder' || vm.network === 'VAE'){
				vm.recon_loss = true
				window.recon_loss = true
				setTimeout(()=>{
					let latent_scatter = vm.$refs.latent_scatter
					EventBus.latent_scatter = latent_scatter
					latent_scatter.eventBus = EventBus
					latent_scatter.mask_group = []

					// 清除残留影像
					if(vm.loss_plot){
						vm.loss_plot.destroy()
					}

					latent_scatter.removePoints()

					let ctx = document.getElementById('loss').getContext('2d');
					vm.loss_plot = new Chart(ctx, vm.config)

					vm.startTrain()
					// 自動滾動，向下移動到最底部
					window.scroll({
						top: document.body.scrollHeight,
						left: 0,
						behavior: 'smooth'
					});

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
				console.log('startTrain')
				vm.state = response.data.state
			}).catch(error => {
				console.log('something went wrong! Home startTrain', error)
			}).finally(() => {
				console.log("clear loss chart")
				vm.requesting = 'none'

				vm.config.data.labels = []
				vm.config.data.datasets[0].data = []
				if(vm.recon_loss){
					vm.loss_plot.update()
				}

				vm.dis_config.data.labels = []
				vm.dis_config.data.datasets[0].data = []
				if(vm.dist_loss){
					vm.dis_loss_plot.update()
				}
			})
		},
		async onContinue() {
			// 自動滾動，向下移動到最底部
			window.scroll({
				top: document.body.scrollHeight,
				left: 0,
				behavior: 'smooth'
			});
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			
			vm.pcp = false
			latent_scatter.pcp_mode = false
			latent_scatter.mask_mode = true
			// latent_scatter.mask_mode = false
			// latent_scatter.resetColor()

			await latent_scatter.onContinue()
			vm.requesting = 'continue'
			
			vm.$axios.post(vm.$api + '/train/continue').then(response => {
				console.log('on Continue')
				vm.state = response.data.state
			}).catch(error => {
				console.error('something went wrong! Home onContimue', error)
			}).finally(() => {
				vm.requesting = 'none'
			})
		},
		onPause() {
			let vm = this
			vm.requesting = 'pause'
			let latent_scatter = vm.eventBus.latent_scatter
			latent_scatter.mask_mode = false
			vm.adjust = (latent_scatter.mask_mode)?'adjust':'pan'
			// if(vm.adjust !== 'pan'){
			// 	vm.$d3.select('#colorScatter').on('.zoom',null)
			// }
			// else{
			// 	vm.$d3.select('#colorScatter').call(latent_scatter.zoom)
			// }		
			this.$axios.post(this.$api + '/train/pause').then(response => {
				console.log('on Pause')
				vm.state = response.data.state
				id += 1
				vm.$axios.post(vm.$api + '/inference/get_training_latent',{'id':id}).then(response => {
					let latent_scatter = vm.$refs.latent_scatter
					let data = response.data.rawdata
					latent_scatter.pointsTransition(data)
				}).catch(error => {
					console.log('Get progress went wrong! Home onPause -> pause', error)
				})
			}).catch(error => {
				console.log('something went wrong! Home onPause', error)
			}).finally(() => {
				vm.requesting = 'none'
			})
		},
		addLoss(rec_loss,dis_loss=undefined,step) {
			let vm = this;
			if(rec_loss){
				vm.config.data.labels.push(String(step));
				vm.config.data.datasets[0].data.push(rec_loss);
				if (vm.config.data.labels.length > 100) {
					vm.config.data.labels.shift();
					vm.config.data.datasets[0].data.shift();
				}
				if(vm.loss_plot !== undefined){
					vm.loss_plot.update()
				}
			}

			if(dis_loss){
				vm.dis_config.data.labels.push(String(step));
				vm.dis_config.data.datasets[0].data.push(dis_loss);
				if (vm.dis_config.data.labels.length > 100) {
					vm.dis_config.data.labels.shift();
					vm.dis_config.data.datasets[0].data.shift();
				}
				if(vm.dis_loss_plot !== undefined){
					vm.dis_loss_plot.update()
				}
			}
		},
		getProgress() {
			let vm = this
			if (vm.state == 'training' && vm.requesting == 'none' && !vm.pcp) {
				this.$axios.post(this.$api + '/train/progress',{'start':vm.start}).then(response => {
					vm.state = response.data.state
					let model = response.data.model
					if(model === 'NN based MDS'){
						if(response.data.rec_loss && response.data.dis_loss){
							vm.addLoss(undefined,response.data.dis_loss,response.data.step)
						}
					}
					else{
						if(response.data.rec_loss){
							vm.addLoss(response.data.rec_loss,undefined,response.data.step)
						}						
					}
					// 加载 latent 资料点， 资料结构 =》 {日期，dimension1，dimensin2，```，latentx，latenty}
					vm.$axios.post(vm.$api + '/inference/get_training_latent',{'id':0}).then(response => {
						let latent_scatter = vm.$refs.latent_scatter
						let data = response.data.rawdata
						let columns = response.data.columns

						latent_scatter.data = data
						latent_scatter.columns = columns

						if(latent_scatter.latent){
							latent_scatter.pointsTransition(data)
						}
						else{
							latent_scatter.addPoints(data)
						}
					}).catch(error => {
						console.error('Home Get progress went wrong!',error)
					})
				}).catch(error => {
					console.error('Something went wrong!',error)
				})
				vm.start = false
			}
		},
		remove (item) {
			let vm = this
			// 防止沒有抓到 histogram 的時候出現 bug
			if(vm.eventBus.histogram){
				let histogram = vm.eventBus.histogram
				histogram.board[item].alpha = 0.3
				histogram.board[item].disable = true
			}
			vm.columns.splice(this.columns.indexOf(item), 1)
			vm.columns = [...this.columns]

		},
		updateParam(cb) {
			if (this.loaded) {
				cb()
			}
		},
		onNetworkChange() {
			let vm = this
			this.$axios.post(this.$api + '/train/set_param', {
				'network': vm.network
			}).then(response => {
				// 清空當前 loss 圖表的圖表內容,已經清除圖表暫存數據
				if(response.data.success){
					vm.state = response.data.state
					vm.network_errors = []
					vm.requesting = 'none'
	
					if(vm.recon_loss){
						vm.config.data.labels = []
						vm.config.data.datasets[0].data = []
						if(vm.loss_plot !== undefined){
							vm.loss_plot.update()
						}
					}
	
					if(vm.dist_loss){
						vm.dis_config.data.labels = []
						vm.dis_config.data.datasets[0].data = []
						if(vm.dis_loss_plot !== undefined){
							vm.dis_loss_plot.update()
						}
					}
				}
			}).catch(error => {
				vm.network_errors = [error]
			})
		},
		onDatasetChange() {
			let vm = this	
			let histogram = vm.$refs.histogram
			vm.start = true
			this.$axios.post(this.$api + '/train/change_dataset', {
				'name': vm.dataset
			}).then(response => {
				if(response.data.success){
					vm.state = response.data.state
					vm.switch_dataset = true
					vm.columns_all = response.data.columns_all
					vm.columns = response.data.columns
					vm.dataset_errors = []
					// 設定 pcp 爲 false
					vm.pcp = false
					histogram.clear()
					histogram.loadData()
					// // 清空 scatter 
					// vm.$refs.latent_scatter.removePoints()
				}
			}).catch(error => {
				vm.dataset_errors = [error]
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
				vm.columns_errors = [error]
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
				vm.learning_rate_errors = [error]
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
				vm.batch_size_errors = [error]
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
				vm.input_window_errors = [error]
				vm.output_window_errors = [error]
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
				vm.loss_weight_errors = [error]
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
			let histogram = vm.$refs.histogram
			EventBus.histogram = histogram
			histogram.eventBus = EventBus
			histogram.loadData()
			vm.loaded = true
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
/* The switch - the box around the slider */
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
