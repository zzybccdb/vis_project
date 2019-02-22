<template>
	<v-container grid-list-md fill-height pa-2 style="max-width: none !important">
		<v-layout column>
			<v-flex class="pt-0 px-1 ">
				<v-card class="depressed-border">
					<v-card-text class="pa-0">
						<parallel ref="pcp" @loaded="onParallelLoaded"></parallel>
					</v-card-text>
				</v-card>
			</v-flex>
			<v-flex xs12 class="pink-box" pa-1 ref="ruler">
				<v-layout row fill-height>
					<v-flex ref="leftpanel" style="width: 350px;" pa-1>
						<v-card class="left-panel depressed-border" height="100%" style="min-width: 270px;">
						<v-layout column>
							<v-flex class="pt-0 px-1 ">
							<v-layout row class="pt-0 px-1" style="margin: 2px;">
								<v-flex d-flex>
									<v-menu
										ref="startDateMenu"
										:close-on-content-click="false"
										v-model="startDateMenu"
										:nudge-right="40"
										:return-value.sync="startDate"
										lazy
										transition="scale-transition"
										offset-y
										full-width
										min-width="290px"

										>
										<v-text-field
										slot="activator"
										v-model="startDate"
										label="Start Date"
										prepend-icon="event"
										readonly
										></v-text-field>
										<v-date-picker v-model="startDate"
										@input="onStartDatePicked"
										:min="minDate"
										:max="maxDate"></v-date-picker>

									</v-menu>
								</v-flex>
								<v-flex d-flex>
									<v-menu
										ref="endDateMenu"
										:close-on-content-click="false"
										v-model="endDateMenu"
										:nudge-right="40"
										:return-value.sync="endDate"
										lazy
										transition="scale-transition"
										offset-y
										full-width
										min-width="290px"
										>
										<v-text-field
										slot="activator"
										v-model="endDate"
										label="End Date"
										prepend-icon="event"
										readonly
										></v-text-field>
										<v-date-picker v-model="endDate" @input="onEndDatePicked"
										:min="minDate"
										:max="maxDate"></v-date-picker>
									</v-menu>
								</v-flex>

							</v-layout>
							</v-flex>
							<v-flex>
								<v-card flat style="min-width: 256px;max-width: 256px; margin: 0 auto;">
									<colormap ref="cm" @loaded="onColormapLoaded"></colormap>
									<v-card-actions class="py-0" style="max-height: 40px;">
										<!-- <span>alpha_manual</span> -->
										<!-- <v-spacer></v-spacer> -->
										<v-slider
											v-model="lineAlpha"
											thumb-label
											value="30"
										></v-slider>
										<v-spacer></v-spacer>
										<v-btn flat @click="$refs.cm.resetZoom()">
											<v-icon>refresh</v-icon>reset
										</v-btn>
									</v-card-actions>
									<v-card-actions class="py-0" style="max-height: 40px;">
										<!-- <span>alpha_error</span> -->
										<!-- <v-spacer></v-spacer> -->
										<v-slider
											v-model="errorAlpha"
											thumb-label
											value="0"
										></v-slider>
									</v-card-actions>
									<v-card-actions class="py-0" style="max-height: 50px;">
										<v-switch :label="`Mode: ${zoomMode?'Zoom':'Select'}`" v-model="zoomMode" @change="changeMode()"></v-switch>
										<v-btn depressed color="error" @click="$refs.cm.clearSelect()">
											clear
										</v-btn>
									</v-card-actions>
								</v-card>
							</v-flex>
							<v-flex>
								<v-list>
									<v-list-group prepend-icon="local_activity">
										<v-list-tile slot="activator">
											<v-list-tile-content>
											<v-list-tile-title>Normalization</v-list-tile-title>
											</v-list-tile-content>
										</v-list-tile>
										<v-card flat style="min-width: 256px;max-width: 256px; margin: 10px auto;">
											<v-form>
												<v-select
												v-model="normalizedin"
												:items="normalizedin_options"
												@change="onNormalizedInChange()"
												label="Normalized In"
												class="my-3 mx-2"
												></v-select>
												
												<v-select
												v-model="normalizedby"
												:items="normalizedby_options"
												@change="onNormalizedByChange()"
												label="Normalized By"
												class="my-3 mx-2"
												></v-select>
											</v-form>
										</v-card>
									</v-list-group>
									<v-list-group prepend-icon="local_activity">
										<v-list-tile slot="activator">
											<v-list-tile-content>
											<v-list-tile-title>Dimensions</v-list-tile-title>
											</v-list-tile-content>
										</v-list-tile>
										<v-card flat style="min-width: 256px;max-width: 256px; margin: 10px auto;">
											<v-combobox
											:error-messages="columns_errors"
											v-model="columns"
											:items="columns_all"
											label="Columns"
											multiple
											chips
											@change="updateSelectedColumn()"
											>
												<template slot="selection" slot-scope="data">
												<v-chip
													:selected="data.selected"
													close
													small
													text-color="white"
													color='blue'
													@input="remove(data.item)"
												>
													<strong>{{ isTrainCol(data.item) }}</strong>&nbsp;
												</v-chip>
												</template>
											</v-combobox>
										</v-card>
									</v-list-group>
								</v-list>
							</v-flex>
						</v-layout>
						</v-card>
					</v-flex>
					<v-flex xs12 class="pink-box">
						<v-card class="depressed-border" height="100%" ref="mx_height">
							<Calendar ref="cal" style="padding-top: 30px;" @loaded="onCalendarLoaded"></Calendar>
						</v-card>
					</v-flex>
				</v-layout>
			</v-flex>
		</v-layout>
	</v-container>
</template>

<script>
const EventBus = {

}
import { mapGetters } from 'vuex'
import Colormap from '@/components/Colormap.vue'
import Calendar from '@/components/Calendar.vue'
import Parallel from '@/components/Parallel.vue'
import Slider from '@/components/Slider.vue'

export default {
	components: {
		Colormap,
		Calendar,
		Parallel,
		Slider,
	},
	data: () => ({
		calendar_mode: 0,

		zoomMode: true,

		startDate: null,
		startDateMenu: false,
		endDate: null,
		endDateMenu: false,

		minDate: null,
		maxDate: null,
		dotAlpha: 100,
		lineAlpha:30,
		errorAlpha: 0,
		init: {
			cal: false,
			cm: false,
			pcp: false,
			me: false,
		},

		columns_all: [
		],
		columns_train: [

		],
		columns: [
		],
		columns_errors: [],

		firstLoad: true,

		normalizedby: 'each dimension',
		normalizedby_options: ['each dimension', 'all dimension'],

		normalizedin: 'view region',
		normalizedin_options: ['selected region', 'view region']
	}),
	watch: {
		dotAlpha() {
			this.changeAlpha()
		},
		lineAlpha(){
			this.changeAlpha()
		},
		myState() {
			// not sure if this is costly
			this.handleResize()
		},
		// calendar_mode() {
		// 	this.changeCalendarMode()
		// },
		errorAlpha() {
			this.changeView()
		}
	},
	methods: {
		changeView() {
			var vm = this
			vm.$refs.cal.updateAlpha()
			vm.$refs.pcp.updateAlpha()
			vm.$refs.pcp.filterLines()
		},

		isTrainCol(item) {
			var vm = this
			if (vm.columns_train.includes(item)) {
				return '* ' + item
			}
			return item
		},

		onNormalizedInChange() {
			var vm = this;
			vm.eventBus.pcp.normalizedin = vm.normalizedin
			vm.eventBus.pcp.adjustTicks()
			vm.eventBus.pcp.adjustLines()
		},

		onNormalizedByChange() {
			var vm = this;
			vm.eventBus.pcp.normalizedby = vm.normalizedby
			vm.eventBus.pcp.adjustTicks()
			vm.eventBus.pcp.adjustLines()
		},

		changeMode() {
			var vm = this
			if (vm.zoomMode) {
				vm.$refs.cm.switchZoom()
			} else {
				vm.$refs.cm.maskSelect()
			}
		},
		updateSelectedColumn() {
			var vm = this
			if (vm.firstLoad) {
				return
			}
			if (vm.eventBus.pcp.state) {
				vm.eventBus.pcp.state.axis.forEach(a => {
					a.disabled = !vm.columns.includes(a.name)
				});
			}
			vm.eventBus.pcp.adjustAxisPosition()
			vm.eventBus.pcp.adjustTicks()
			vm.eventBus.pcp.adjustLines()
			// let sd = vm.$moment.utc(vm.startDate)
			// let ed = vm.$moment.utc(vm.endDate)
			// if (sd > ed) {
			// 	return
			// }
			// sd = sd.format('YYYY-MM-DD') + " 00:00:00"
			// ed = ed.format('YYYY-MM-DD') + " 00:00:00"
			// vm.loadData(vm.eventBus.zoomHistory[vm.eventBus.zoomHistory.length-1].interval, sd, ed)
		},
		remove (item) {
			console.log('remove', item)
			this.columns.splice(this.columns.indexOf(item), 1)
			this.columns = [...this.columns]
		},
		fresh(){
			console.log("fresh")
		},
		showError(){
			let vm = this
			console.log("showError")
			vm.eventBus.cm.__changeColor(true)
		},
		showNormal(){
			let vm = this
			console.log("showNormal")
			vm.eventBus.cm.__changeColor(false)
		},
		selectMask(){
			let vm = this
			console.log("mask mode")
			vm.eventBus.cm.maskSelect()
		},
		// changeCalendarMode() {
		// 	var vm = this
		// 	// let mode = ['tooltip', 'box_select', 'zoom'][vm.calendar_mode]
		// 	// vm.eventBus.cal.switchMode(mode)
		// },
		onStartDatePicked() {
			var vm = this
			vm.$refs.startDateMenu.save(vm.startDate)
			vm.changeDate()
		},

		onEndDatePicked() {
			var vm = this
			vm.$refs.endDateMenu.save(vm.endDate)
			vm.changeDate()
		},

		changeDate() {
			var vm = this
			let sd = vm.$moment.utc(vm.startDate)
			let ed = vm.$moment.utc(vm.endDate)
			if (sd > ed) {
				return
			}
			sd = sd.format('YYYY-MM-DD') + " 00:00:00"
			ed = ed.format('YYYY-MM-DD') + " 00:00:00"
			vm.loadData(vm.eventBus.zoomHistory[vm.eventBus.zoomHistory.length-1].interval, [sd, ed])
		},

		allInited() {
			var vm = this
			return vm.init.cal && vm.init.cm && vm.init.me && vm.init.pcp
		},

		onCalendarLoaded() {
			var vm = this
			vm.init.cal = true
		},

		onColormapLoaded() {
			var vm = this
			vm.init.cm = true
		},

		onParallelLoaded() {
			var vm = this
			vm.init.pcp = true
		},

		onDataLoaded(response) {
			var vm = this
			vm.response = response
			window.response = response
			// console.log('success')
			vm.eventBus.mask = response.data.mask
			vm.eventBus.columns = response.data.columns
			vm.eventBus.std = response.data.std
			let date_idx = response.data.columns.indexOf('date')
			let error_idx = response.data.columns.indexOf('error')
			vm.eventBus.date_idx = date_idx

			let errors = response.data.data.map(d => {
				return d[error_idx]
			})
			
			errors = errors.sort()
			// errors = errors.slice(errors.length * 0.05, errors.length * 0.95)

			let error_extent = vm.$d3.extent(errors)
			let error_range_extent = [1, 0.2]
			let error_scale = vm.$d3.scaleLinear().domain(error_extent).range(error_range_extent)
			vm.eventBus.data = response.data.data.map((d, di) => {
				return {
					mask: vm.eventBus.mask[di][1],
					raw: d,
					datetime: vm.$moment.utc(d[date_idx]),
					alpha_u: Math.min(error_range_extent[0], Math.max(error_range_extent[1], error_scale(d[error_idx]))),
				}
			})

			let sd = vm.$moment.utc(response.data.data[0][date_idx])
			let ed = vm.$moment.utc(response.data.data[response.data.data.length-1][date_idx])
			vm.startDate = sd.format('YYYY-MM-DD')
			vm.endDate = ed.format('YYYY-MM-DD')

			if (vm.firstLoad) {
				vm.firstLoad = false
				vm.minDate = vm.startDate
				vm.maxDate = vm.endDate
			}

			vm.eventBus.startDate = vm.$moment.utc(vm.startDate)
			vm.eventBus.endDate = vm.$moment.utc(vm.endDate)


			vm.errorAlpha = 0
			vm.init.me = true
		},
		// eslint-disable-next-line
		// loadData(interval, startDate, endDate) {
		loadData(interval, date_range) {
			var vm = this

			vm.eventBus.zoomHistory.push({
				calLevel: vm.eventBus.calLevel,
				interval,
				// startDate,
				// endDate
				date_range,
			})

			vm.init.me = false
			// vm.$refs.sld.clearData()
			if (vm.init.cm) {
				vm.$refs.cm.clearData()
			}
			if (vm.init.cal) {
				vm.$refs.cal.clearData()
			}
			if (vm.init.pcp) {
				vm.$refs.pcp.clearData()
			}

			let param = {
				interval
			}

			// if (startDate) {
			// 	param.start_date = startDate
			// }

			// if (endDate) {
			// 	param.end_date = endDate
			// }

			if(date_range){
				param.date_range = date_range
			}

			// param.other_dims = vm.columns
			// vm.$axios.post(vm.$api + '/model/latent', param)

			vm.$axios.post(vm.$api + '/inference/latent', param)
			.then(vm.onDataLoaded)
			.catch(error => {
				window.error = error
				console.log(error)
			})

			vm.checkInit()
		},

		checkInit() {
			var vm = this
			if (vm.allInited()) {
				// vm.$refs.pcp.updateCols()
				vm.$refs.pcp.init()
				vm.$refs.cal.updateData()
				vm.$refs.cm.updateData()
				// vm.$refs.sld.updateData()
				vm.handleResize()
				vm.updateSelectedColumn()
			} else {
				setTimeout(vm.checkInit, 500)
			}
		},

		season() {
			// return this.seasons[val]
		},

		changeAlpha() {
			this.$refs.pcp.changeAlpha(this.lineAlpha / 100)
		},

		handleResize() {
			var vm = this
			setTimeout(function() {
				let mx_width = vm.$refs.ruler ? vm.$refs.ruler.clientWidth - 270 : 1920
				if (vm.$refs.pcp) {
					vm.$refs.pcp.maxwidth = mx_width
					vm.$refs.pcp.handleResize()
				}
				if (vm.$refs.cal) {
					vm.$refs.cal.maxwidth = mx_width
					vm.$refs.cal.handleResize()
				}
			}, 100) // wait for potential animation
		}

	},
	computed: {
		...mapGetters({
			myState: 'getMenuDrawer'
		})
	},
	mounted() {
		var vm = this;
		window.vm = vm
		vm.eventBus = EventBus
		vm.eventBus.zoomHistory = []

		EventBus.root = vm
		EventBus.cal = vm.$refs.cal
		EventBus.cm = vm.$refs.cm
		EventBus.pcp = vm.$refs.pcp
		// EventBus.sld = vm.$refs.sld
		vm.$refs.cal.eventBus = EventBus
		vm.$refs.cm.eventBus = EventBus
		vm.$refs.pcp.eventBus = EventBus
		// vm.$refs.sld.eventBus = EventBus

		let fixed_bottom_height = vm.$refs.mx_height.$el.clientHeight
		vm.$refs.cal.$el.style.height = fixed_bottom_height + 'px'
		vm.$refs.leftpanel.style.height = fixed_bottom_height + 10 + 'px'
		// init loading here
		// vm.changeCalendarMode()
		// vm.eventBus.calLevel = 'month'
		// vm.loadData('2 hour', "2017-01-01 00:00:00", "2017-12-31 00:00:00")
		vm.eventBus.calLevel = 'year'
		vm.loadData('1 day',)

		window.addEventListener('resize', vm.handleResize)
		vm.handleResize()

		this.$axios.get(this.$api + '/train/get_dimensions')
		.then(response => {
			vm.columns_all = response.data.columns_all.slice()
			vm.columns = response.data.columns.slice()
			vm.columns_train = response.data.columns.slice()
			console.log(vm.columns_train)
			vm.dataset_errors = []
		}).catch(error => {
			vm.dataset_errors = [error.response.data]
		})
	},
	beforeDestroy() {
		var vm = this
		window.removeEventListener('resize', vm.handleResize)
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.expandToolbar {
	left: 80px !important;
}
.depressed-border {
	box-shadow: none;
	border: 1px solid #ccc;
}
.left-panel {
	overflow-y: scroll;
	overflow-x: hidden;
}
#Alpha{
    transform: translate(-50px,130px)rotate(270deg);
    display: none;
}
* {
	user-select: none;
}
</style>
