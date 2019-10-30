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
						<v-layout column>
							<v-combobox
							:error-messages="columns_errors"
							label="Covariance matrix & Scatter plots"
							ref="covariance_matrix_btn"
							readonly
							>
							</v-combobox>
							<v-flex style='width:100%;overflow:hidden;' v-if='covanriance_plot'>
								<Covariance />
							</v-flex>
						</v-layout>
						<v-layout column>
							<v-combobox
							:error-messages="columns_errors"
							label="Parallel Coordinates Plot"
							ref="pcp_button"
							readonly
							>
							</v-combobox>
							<div ref='pcpChart' style='margin:0px;width:100%'>
								<PCP ref='pcp' v-if="pcp"/>
							<div id='error_info' style='height:100px;width:100px' v-if='pcp_error_info'>
								<h4>No PCP Chart, please run Training!And try again</h4>
							</div>
							</div>
						</v-layout>
					</v-form>
					<v-layout column>
						<v-layout style='padding:24px' row nowrap>
							<v-flex style="height:700px;width:520px">
								<v-layout column>
									<v-layout column>
										<!-- training 結果預覽圖表部分  -->
										<canvas ref= 'model_loss' id="model_loss" style="height:150px;maxwidth:512px" ></canvas>
									</v-layout>
									<v-flex>
										<v-btn small :loading="requesting == 'newTrain'" color="primary" :disabled="disableNewTrainBtn" @click="onNewTrain">
											<v-icon>add_box</v-icon>
											New Training
											<span slot="loader" class="arrow-loader">
												<v-icon light>cached</v-icon>
											</span>
										</v-btn>
										<v-btn small :loading="requesting == 'continue'" :disabled="disableContinueBtn" @click="onContinue">
											<v-icon>play_arrow</v-icon>
											Continue
											<span slot="loader" class="arrow-loader">
												<v-icon light>cached</v-icon>
											</span>
										</v-btn>
										<v-btn small :loading="requesting == 'pause'" :disabled="disablePauseBtn" @click="onPause">
											<v-icon>pause</v-icon>
											Pause
											<span slot="loader" class="arrow-loader">
												<v-icon light>cached</v-icon>
											</span>
										</v-btn>
										<v-btn small ref='adjust' :disabled="disableNewTrainBtn" color="primary" @click="onMask">
											<v-icon>swap_horiz</v-icon>
											{{adjust}}
										</v-btn>
									</v-flex>
								</v-layout>
								<ColorScatter ref='latent_scatter'/>
							</v-flex>
							<v-flex lg12>
								<v-layout  style="margin-left:10px" column>
									<div ref='histWrapper' style="height:700px;overflow-y:scroll">	
										<HISTOGRAM ref='histogram'/>
									</div>
								</v-layout>
							</v-flex>
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
// import { setTimeout } from 'timers';
import HISTOGRAM from '@/components/Histogram.vue'
import ColorScatter from '@/components/ColorScatter.vue'
import PCP from '@/components/Pcp_only.vue'
import { Promise } from 'q';
import Covariance from '@/views/Results.vue'

const EventBus = {}
let id = 0
const classic_network = ['PCA','MDS','TSNE','UMAP']
export default {
	components: {
		HISTOGRAM,
		ColorScatter,
		PCP,
		Covariance
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
		model_loss:true,
		histogram:false,
		pcp: false,
		iteration:0,
		adjust: 'pan',
		progress : true,
		pcp_error_info: false,
		covanriance_plot:false,
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
			return !(this.network === 'NN based MDS' || this.network === 'Autoencoder' || this.network === 'VAE') || (this.requesting !== 'none' || this.state === 'training' || this.state === 'reset' || this.anyError) 
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
		// cavaraince 绘制
		onCovariance(){
			let vm = this
			vm.covanriance_plot = !vm.covanriance_plot
		},
		// 绘制 PCP
		onPCP(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.pcp_mode = !latent_scatter.pcp_mode
			// latent_scatter.mask_mode = true
			// vm.adjust = (latent_scatter.mask_mode)?'adjust':'pan'
			
			if( latent_scatter.data !== undefined){
				vm.pcp = !vm.pcp
				if(vm.pcp){
					vm.$axios.get(vm.$api + '/inference/dimension_extent').then(response => {
						let pcp = vm.$refs.pcp
						let extents = response.data.extents
						let cb = latent_scatter.getColor
						
						vm.eventBus.pcp = pcp
						pcp.eventBus = vm.eventBus
	
						pcp.setDimensions(vm.columns,latent_scatter.data,extents)
						latent_scatter.mask_group.forEach(mask_pts => {
							pcp.drawMaskDataLine(mask_pts)
						})
					}).catch(error => {
						console.error('获取资料 extents 时错误',error)
					})	
				}
				else{
					latent_scatter.resetColor()
				}
			}else{
				vm.pcp_error_info = !vm.pcp_error_info
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
			latent_scatter.mask_mode = !latent_scatter.mask_mode
			vm.adjust = (latent_scatter.mask_mode)?'adjust':'pan'
		},
		onClearAllMask(){
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			latent_scatter.clearAllMask()
		},
		onNewTrain() {
			console.log('on New Train')
			let vm = this
			vm.requesting = 'newTrain'
			vm.start = true
			vm.pcp = false
			
			let latent_scatter = vm.$refs.latent_scatter
			EventBus.latent_scatter = latent_scatter
			latent_scatter.eventBus = EventBus
			latent_scatter.mask_group = []
			latent_scatter.pcp_mode = false

			// 清空 scatter 
			latent_scatter.removePoints()
			

			new Promise((resolve) => {
				if(vm.network === 'NN based MDS'){
					vm.loss_plot.reset()
					vm.config.options.title.text = 'Distance Loss'
					resolve('NN based MDS')
				}
				else if(vm.network === 'Autoencoder' || vm.network === 'VAE'){
					vm.loss_plot.reset()
					vm.config.options.title.text = 'Reconstruction Loss'
					resolve('Autoencoder or VAE')
				}
				else{
					resolve('not a NN based model')
				}
			}).then(() => {
				vm.startTrain()
			}).catch(error => {
				console.error('new train plot error',error)
			})
		},
		startTrain(){
			console.log(' training start ')
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter

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
				latent_scatter.column_index = response.data.column_index
				vm.state = response.data.state
			}).catch(error => {
				console.log('something went wrong! Home startTrain', error)
			}).finally(() => {
				console.log("clear loss chart")
				vm.requesting = 'none'

				vm.config.data.labels = []
				vm.config.data.datasets[0].data = []
				vm.loss_plot.update()
				
				// 傳統降維方式 繪製 
				if(classic_network.indexOf(vm.network) !== -1){
					this.$axios.get(this.$api + '/inference/get_classic_latent')
					.then(response => {
						let data = response.data.rawdata
						let columns = response.data.columns

						latent_scatter.column_index = response.data.column_index
						latent_scatter.data = data
						latent_scatter.columns = columns	

						if(latent_scatter.latent===false){
							latent_scatter.addPoints(window.sample_raw_data)
							latent_scatter.pointsTransition(data)
						}
					})
				}
			})
		},
		async onContinue() {
			let vm = this
			let latent_scatter = vm.$refs.latent_scatter
			
			vm.pcp = false
			latent_scatter.pcp_mode = false
			latent_scatter.mask_mode = true

			EventBus.latent_scatter = latent_scatter
			latent_scatter.eventBus = EventBus


			await latent_scatter.onContinue()
			vm.requesting = 'continue'
			
			vm.$axios.post(vm.$api + '/train/continue').then(response => {
				vm.state = response.data.state
				let latent_scatter = vm.$refs.latent_scatter
				latent_scatter.column_index = response.data.column_index
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
			this.$axios.post(this.$api + '/train/pause').then(response => {
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
		addLoss(rec_loss=undefined,dis_loss=undefined,step) {
			let vm = this;
			if(rec_loss){
				vm.config.data.labels.push(String(step));
				vm.config.data.datasets[0].data.push(rec_loss);				
			}

			if(dis_loss){
				vm.config.data.labels.push(String(step));
				vm.config.data.datasets[0].data.push(dis_loss);
			}

			if (vm.config.data.labels.length > 40) {
				vm.config.data.labels.shift();
				vm.config.data.datasets[0].data.shift();
			}
			vm.loss_plot.update()
		},
		getProgress() {
			let vm = this
			if (vm.state == 'training' && vm.requesting == 'none' && !vm.pcp && vm.progress) {
				vm.progress = false
				this.$axios.post(this.$api + '/train/progress',{'start':vm.start}).then(response => {
					vm.state = response.data.state
					let model = response.data.model
					let progress_response = response
					let latent_scatter = vm.$refs.latent_scatter
					if(latent_scatter.latent===false){
						latent_scatter.addPoints(window.sample_raw_data)
					}
					if(model === 'NN based MDS'){
						if(progress_response.data.rec_loss && progress_response.data.dis_loss){
							vm.addLoss(undefined,progress_response.data.dis_loss,progress_response.data.step)
						}
					}
					else{
						if(progress_response.data.rec_loss){
							vm.addLoss(progress_response.data.rec_loss,undefined,progress_response.data.step)
						}						
					}
					// 加载 latent 资料点， 资料结构 =》 {date,latentx，latenty}
					vm.$axios.post(vm.$api + '/inference/get_training_latent',{'id':vm.iteration}).then(response => {
						let data = response.data.rawdata
						let columns = response.data.columns

						latent_scatter.data = data
						latent_scatter.columns = columns

						if(latent_scatter.latent){
							latent_scatter.pointsTransition(data)
						}
						vm.progress = true
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

					vm.config.data.labels = []
					vm.config.data.datasets[0].data = []
					vm.loss_plot.update()	
				}
			}).catch(error => {
				vm.network_errors = [error]
			})
		},
		onDatasetChange() {
			let vm = this	
			let histogram = vm.$refs.histogram
			if(histogram.wrapper !== undefined){
				histogram.wrapper.alpha = 0
			}
			vm.start = true
			this.$axios.post(this.$api + '/train/change_dataset', {
				'name': vm.dataset
			}).then(response => {
				if(response.data.success){
					histogram.clear()
					vm.state = response.data.state
					vm.switch_dataset = true
					vm.columns_all = response.data.columns_all
					vm.columns = response.data.columns
					vm.dataset_errors = []
					vm.sample_raw_data = response.data.sample_raw_data
					window.sample_raw_data = vm.sample_raw_data		
					// 設定 pcp 爲 false
					vm.pcp = false
					histogram.loadData()
					// // 清空 scatter 
					// vm.$refs.latent_scatter.removePoints()
				}
				if(histogram.wrapper !== undefined){
					histogram.wrapper.alpha = 1
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
					text: 'Distance Loss',
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
		let ctx = document.getElementById('model_loss').getContext('2d')
		vm.loss_plot = new Chart(ctx,vm.config)
		let sampled = (window.sample_raw_data === undefined)?false:true
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

			if(sampled === false){
				vm.sample_raw_data = response.data.sample_raw_data
				window.sample_raw_data = vm.sample_raw_data
			}else{
				vm.sample_raw_data = window.sample_raw_data
			}

			if(window.latent){
				let latent_scatter = vm.$refs.latent_scatter
				latent_scatter.column_index = window.column_index
				latent_scatter.pcp_mode = false
				latent_scatter.mask_mode = false

				EventBus.latent_scatter = latent_scatter
				latent_scatter.eventBus = EventBus
				
				if(latent_scatter.latent===false){
					latent_scatter.addPoints(window.sample_raw_data)
				}
				
				//區分爲傳統降維方法和非傳統降維方式 
				if(classic_network.indexOf(vm.network) !== -1){
					this.$axios.get(this.$api + '/inference/get_classic_latent')
					.then(response => {
						let data = response.data.rawdata
						let columns = response.data.columns

						latent_scatter.data = data
						latent_scatter.columns = columns	
						latent_scatter.pointsTransition(data)
						// 載入上一輪設定的控制點
						latent_scatter.setPreMask_group(window.mask_group)
					})					
				}else{
					// 加载 latent 资料点， 资料结构 =》 {date,latentx，latenty}
					vm.$axios.get(vm.$api + '/inference/get_pre_latent')
					.then(response => {
						let data = response.data.rawdata
						let columns = response.data.columns
	
						latent_scatter.data = data
						latent_scatter.columns = columns
						// 載入上一輪latent 位置
						latent_scatter.pointsTransition(data)
						// 載入上一輪設定的控制點
						latent_scatter.setPreMask_group(window.mask_group)
					}).catch(error => {
						console.error('Home Get progress went wrong!',error)
					})
				}

			}

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
		// 將 pcp 和 covariance 的 v-combobox 的 click event 修改
		vm.$refs.pcp_button.$el.getElementsByClassName('v-messages')[0].remove()
		vm.$refs.pcp_button.$el.getElementsByClassName('v-select__slot')[0].getElementsByTagName('input')[0].remove()
		vm.$refs.pcp_button.$el.getElementsByClassName('v-input__icon v-input__icon--append')[0].getElementsByTagName('i')[0].onclick = vm.onPCP
		vm.$refs.pcp_button.$el.getElementsByClassName('v-input__icon v-input__icon--append')[0].getElementsByTagName('i')[0].style.cursor = 'pointer'

		vm.$refs.covariance_matrix_btn.$el.getElementsByClassName('v-messages')[0].remove()
		vm.$refs.covariance_matrix_btn.$el.getElementsByClassName('v-select__slot')[0].getElementsByTagName('input')[0].remove()
		vm.$refs.covariance_matrix_btn.$el.getElementsByClassName('v-input__icon v-input__icon--append')[0].getElementsByTagName('i')[0].onclick = vm.onCovariance
		vm.$refs.covariance_matrix_btn.$el.getElementsByClassName('v-input__icon v-input__icon--append')[0].getElementsByTagName('i')[0].style.cursor = 'pointer'
	},

	beforeDestroy() {
		let vm = this
		clearInterval(this.timer)
		let latent_scatter = vm.$refs.latent_scatter
		window.sample_raw_data = vm.sample_raw_data
		window.mask_group = latent_scatter.mask_group
		window.latent = latent_scatter.latent
		window.column_index = latent_scatter.column_index
		let new_latent = {}
		if(Object.keys(latent_scatter.dataWrapper).length){
			let x_scale = latent_scatter.x_scale.invert
			let y_scale = latent_scatter.y_scale.invert
			for(let index in latent_scatter.dataWrapper){
				let x = latent_scatter.dataWrapper[index].point.x
				let y = latent_scatter.dataWrapper[index].point.y
				new_latent[index] = [x_scale(x),y_scale(y)]
			}
		}
		latent_scatter.latentChange(new_latent)
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
body{
	user-select: none;
}
.v-autocomplete.v-input, .v-autocomplete .v-menu__activator, .v-autocomplete .v-menu__activator * {
    cursor: default;
}
/* The switch - the box around the slider */
#model-form {
	width: 100%;
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
