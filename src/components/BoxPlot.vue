
<template>
<div id="home" ref="home">

</div>
</template>

<script>

import Palette from '@/palette.js'

export default {
	props: ['title', 'apiUrl'],
	components: {},
	methods: {
		handleResize() {
			var vm = this;
			let width = vm.$refs.home.clientWidth
			let height = vm.$refs.home.clientHeight
			vm.app.renderer.resize(width, height);
			vm.app.stage.worldTransform.fromArray([
				1,  0, 0,
				0, -1, vm.app.renderer.height,
			])
		},

		drawBoxBar(width, name, max, upper_fence, q3, mean, median, q1, lower_fence, min, std) {
			max = Number(max)
			upper_fence = Number(upper_fence)
			q3 = Number(q3)
			mean = Number(mean)
			median = Number(median)
			q1 = Number(q1)
			lower_fence = Number(lower_fence)
			min = Number(min)
			std = Number(std)
			var vm = this;
			let color = Palette.randomColor()
			let ctn = new vm.$PIXI.Container()

			let box = new vm.$PIXI.Graphics()
			box.lineStyle(2, color)
			box.beginFill(color, 0.5)
			box.drawRect(0, 0, width, 100)
			box.endFill()
			box.y = 100
			ctn.addChild(box)

			let upper_fence_line = new vm.$PIXI.Graphics()
			upper_fence_line.lineStyle(2, color)
			upper_fence_line.moveTo(0, 0)
			upper_fence_line.lineTo(Math.min(width/2, 10), 0)
			upper_fence_line.x = width / 2 - upper_fence_line.width / 2
			upper_fence_line.y = box.y + box.height + 100
			ctn.addChild(upper_fence_line)

			let upper_line = new vm.$PIXI.Graphics()
			upper_line.lineStyle(2, color)
			upper_line.moveTo(0, 0)
			upper_line.lineTo(0, 100)
			upper_line.x = width / 2
			upper_line.y = box.y + box.height - 1
			ctn.addChild(upper_line)

			let mean_line = new vm.$PIXI.Graphics()
			mean_line.lineStyle(2, color)
			mean_line.moveTo(0, 0)
			mean_line.lineTo(width, 0)
			mean_line.x = 0
			mean_line.y = box.y + box.height - 50
			ctn.addChild(mean_line)

			let lower_fence_line = new vm.$PIXI.Graphics()
			lower_fence_line.lineStyle(2, color)
			lower_fence_line.moveTo(0, 0)
			lower_fence_line.lineTo(Math.min(width / 2, 10), 0)
			lower_fence_line.x = width / 2 - lower_fence_line.width / 2
			lower_fence_line.y = box.y - 80
			ctn.addChild(lower_fence_line)

			let lower_line = new vm.$PIXI.Graphics()
			lower_line.lineStyle(2, color)
			lower_line.moveTo(0, 0)
			lower_line.lineTo(0, 80)
			lower_line.x = width / 2
			lower_line.y = box.y - 80
			ctn.addChild(lower_line)

			let tooltip_ctn = new vm.$PIXI.Container()
			tooltip_ctn.alpha = 0
			tooltip_ctn.x = width + 5
			tooltip_ctn.y = 200
			ctn.addChild(tooltip_ctn)

			let text = new vm.$PIXI.Text(name + '\n95%: ' + upper_fence.toFixed(5) + '\n'
				+ '75%: ' + q3.toFixed(5) + '\n'
				+ '50%: ' + median.toFixed(5) + ' std: ' + std.toFixed(5) + '\n'
				+ '25%: ' + q1.toFixed(5) + '\n'
				+ '5%: ' + lower_fence.toFixed(5)
			, {fontFamily : 'Arial', fontSize: 14, fill : 0xFFFFFF, align : 'left'})
			text.transform.localTransform.fromArray([
				1, 0, 5,
				0, -1, 100,
			])

			let tooltip = new vm.$PIXI.Graphics()
			tooltip.lineStyle(2, 0)
			tooltip.beginFill(0, 0.9)
			tooltip.drawRect(0, 0, text.width + 10, 105)
			tooltip.endFill()
			tooltip_ctn.addChild(tooltip)
			tooltip_ctn.addChild(text)

			ctn.interactive = true
			ctn.hitArea = new vm.$PIXI.Rectangle(0, lower_fence_line.y, width, upper_fence_line.y - lower_fence_line.y);
			ctn.mouseover = function(mouseData) {
				tooltip_ctn.alpha = 1
				vm.chart.setChildIndex(ctn, vm.chart.children.length-1)
				if (mouseData.data.global.x > vm.app.renderer.width / 2) {
					tooltip_ctn.x = -tooltip_ctn.width - width / 2
				}
			}

			ctn.mouseout = function() {
				tooltip_ctn.alpha = 0
			}

			ctn.upper_fence_line = upper_fence_line
			ctn.upper_line = upper_line
			ctn.mean_line = mean_line
			ctn.lower_line = lower_line
			ctn.lower_fence_line = lower_fence_line
			ctn.tooltip_ctn = tooltip_ctn
			ctn.box = box
			ctn.color = color
			ctn.state = {}
			ctn.state.width = width
			return ctn
		},

		resizePlot(scale) {
			var vm = this;
			for(let i=0;i<vm.chart.children.length;++i) {
				vm.chart.children[i].adjust_size(scale)
			}
		},

		adjustYAxis(scale) {
			var vm = this;
			let ticks = scale.ticks(5)
			let step_size = ticks[1] - ticks[0]
			let idx = 0;
			vm.bg_text_ctn.removeChildren()
			for(let i=-20;i<20; ++i) {
				let label = parseInt(step_size * i)
				if (step_size < 1) {
					label = Number(step_size * i).toFixed(6);
				}

				let pack = vm.bg_lines[idx++];
				let bg_line = pack.line
				// let text = pack.text

				bg_line.y =  scale(step_size * i)

				let text = new vm.$PIXI.Text(String(label)
				, {fontFamily : 'Arial', fontSize: 14, fill : 0x000000, align : 'center'})
				text.transform.localTransform.fromArray([
					1, 0, -text.width - 10,
					0, -1, bg_line.y + 8,
				])
				vm.bg_text_ctn.addChild(text)
			}
		},

		load() {
			var vm = this
			let char_height = 300
			vm.char_height = char_height
			vm.$axios.get(vm.$api + vm.$props.apiUrl)
			.then((response) => {
				let Data = response.data


				let wrapper = new vm.$PIXI.Container()
				
				vm.app.stage.addChild(wrapper)
				wrapper.y = 100
				vm.padding = 100
				wrapper.x = vm.padding

				vm.bg_ctn = new vm.$PIXI.Container()
				wrapper.addChild(vm.bg_ctn)

				vm.bg_text_ctn = new vm.$PIXI.Container()
				vm.bg_ctn.addChild(vm.bg_text_ctn)

				let bg = new vm.$PIXI.Graphics()
				bg.beginFill(0x333333, 1)
				bg.drawRect(0, 0, vm.app.renderer.width - vm.padding * 2, char_height)
				bg.endFill()
				wrapper.addChild(bg)

				let bg2 = new vm.$PIXI.Graphics()
				bg2.beginFill(0x333333, 1)
				bg2.drawRect(0, 0, vm.app.renderer.width - vm.padding * 2 + 100, char_height)
				bg2.endFill()
				bg2.x = -100
				wrapper.addChild(bg2)

				let bg3 = new vm.$PIXI.Graphics()
				bg3.beginFill(0x333333, 1)
				bg3.drawRect(0, 0, vm.app.renderer.width - vm.padding * 2, char_height)
				bg3.endFill()
				bg3.y = -200
				wrapper.addChild(bg3)

				vm.bg_ctn.mask = bg2

				vm.chart_label = new vm.$PIXI.Container()
				vm.chart_label.mask = bg3
				vm.chart = new vm.$PIXI.Container()
				wrapper.addChild(vm.chart)
				vm.chart.mask = bg

				let div = (vm.app.renderer.width - vm.padding * 2 - 20) / Data['sort_idx'].length


				let mmax = Number.MIN_VALUE
				let mmin = Number.MAX_VALUE
				Data['sort_idx'].reverse()
				for(let i=0;i<Data['sort_idx'].length;++i) {
					let idx = Data['sort_idx'][i]
					let loss = Data['losses'][idx]
					let column_name = Data['column_name'][idx]
					let box = vm.drawBoxBar(div/2, column_name, loss['max'], loss['upper_fence'], loss['q3'], loss['mean'], loss['median'], loss['q1'], loss['lower_fence'], loss['min'], loss['std'])
					box.x = (div+2) * (Data['sort_idx'].length - 1 - i) + 10
					box.loss = loss
					box.adjust_size = function(scale) {
						let loss = box.loss

						let yupper_fence = scale(loss['upper_fence'])
						let yupper = scale(loss['q3'])
						let ymean = scale(loss['median'])
						let ylower = scale(loss['q1'])
						let ylower_fence = scale(loss['lower_fence'])

						box.tooltip_ctn.y = 100

						box.upper_fence_line.y = yupper_fence
						box.upper_line.y = yupper
						box.upper_line.height = yupper_fence - yupper
						box.mean_line.y = ymean
						box.lower_line.y = ylower_fence
						box.lower_line.height = ylower - ylower_fence
						box.lower_fence_line.y = ylower_fence
						box.box.y = ylower
						box.box.clear()
						box.box.lineStyle(2, box.color)
						box.box.beginFill(box.color, 0.5)
						box.box.drawRect(0, 0, box.state.width, yupper - ylower)
						box.box.endFill()
						box.hitArea = new vm.$PIXI.Rectangle(0, ylower_fence, box.state.width, yupper_fence-ylower_fence);
					}
					vm.chart.addChild(box)

					mmax = Math.max(mmax, loss['upper_fence'])
					mmin = Math.min(mmin, loss['lower_fence'])
					vm.mmax = mmax
					vm.mmin = mmin
					
					let text = new vm.$PIXI.Text(column_name
					, {fontFamily : 'Arial', fontSize: 14, fill : 0x000000, align : 'center'})
					text.transform.localTransform.fromArray([
						0, 1, box.x + box.state.width / 2 - text.height / 2,
						1, 0, -text.width - 10,
					])
					wrapper.y = Math.min(150, text.width + 50)
					vm.chart_label.addChild(text)
				}
				
				vm.scale = vm.$d3.scaleLinear().domain([mmin, mmax]).range([0, char_height])
				vm.scale_orig = vm.$d3.scaleLinear().domain([mmin, mmax]).range([0, char_height])
				vm.resizePlot(vm.scale)

				let ticks = vm.scale.ticks(5)
				let step_size = ticks[1] - ticks[0]


				vm.ui = new vm.$PIXI.Container()
				wrapper.addChild(vm.ui)

				vm.ui.addChild(vm.chart_label)

				let xaxis_line = new vm.$PIXI.Graphics()
				xaxis_line.lineStyle(1, 0x000000)
				xaxis_line.moveTo(0, 0)
				xaxis_line.lineTo(vm.app.renderer.width - vm.padding * 2, 0)
				vm.ui.addChild(xaxis_line)

				let title_text = new vm.$PIXI.Text(vm.$props.title
				, {fontFamily : 'Arial', fontSize: 18, fill : 0x000000, align : 'center'})
				title_text.transform.localTransform.fromArray([
					1, 0, (vm.app.renderer.width - vm.padding * 2 - title_text.width) / 2,
					0, -1, char_height + title_text.height,
				])
				vm.ui.addChild(title_text)

				vm.bg_lines = []
				for(let i=-20;i<20; ++i) {
					let label = parseInt(step_size * i)
					let bg_line = new vm.$PIXI.Graphics()
					if (label == 0) {
						bg_line.lineStyle(1, 0x000000)
					} else {
						bg_line.lineStyle(1, 0xCCCCCC)
					}
					bg_line.moveTo(0, 0)
					bg_line.lineTo(vm.app.renderer.width - vm.padding * 2, 0)
					bg_line.y = vm.scale(step_size * i)
					vm.bg_ctn.addChild(bg_line)

					let text = new vm.$PIXI.Text(String(label)
					, {fontFamily : 'Arial', fontSize: 14, fill : 0x000000, align : 'center'})
					text.transform.localTransform.fromArray([
						1, 0, -text.width - 10,
						0, -1, bg_line.y + 8,
					])
					vm.bg_text_ctn.addChild(text)

					vm.bg_lines.push({
						line: bg_line,
						text: text,
					})
				}



				var zoom = vm.$d3.zoom()
					.on('zoom', vm.zoomed)

				vm.zoom = zoom
				vm.$d3.select(vm.$refs.home).call(zoom);

				vm.zoom_offsets = {
					x: 0,
					y: 0,
				}
				bg.interactive = true
				bg.mousedown = function() {
					vm.chart.interactiveChildren = false
					bg.drag = true
				}

				bg.mouseup = function() {
					vm.chart.interactiveChildren = true
					bg.drag = false
				}
				bg.mousemove = function(e) {
					if (bg.drag && e.data.buttons) {
						vm.zoom_offsets.x += e.data.originalEvent.movementX
						vm.zoom_offsets.y -= e.data.originalEvent.movementY
						vm.zoom_offsets.y = Math.min(vm.zoom_offsets.y, 0)
						vm.chart.x = vm.zoom_offsets.x
						vm.chart.y = vm.zoom_offsets.y
						vm.bg_ctn.y = vm.zoom_offsets.y
						vm.chart_label.x = vm.zoom_offsets.x
					}
				}


			}).catch(error => {	
				console.log(error)
				let title_text = new vm.$PIXI.Text('Cannot load box plot: ' + error.response.data
				, {fontFamily : 'Arial', fontSize: 18, fill : 0x000000, align : 'center'})
				title_text.transform.localTransform.fromArray([
					1, 0, vm.app.renderer.width * 0.4 - title_text.width / 2,
					0, -1, char_height + title_text.height,
				])
				vm.app.stage.addChild(title_text)
			})
		},

		zoomed() {
			var vm = this;
			var transform = vm.$d3.event.transform
			vm.currrentTransform = transform
			transform.y = 0
			vm.scale.domain(transform.rescaleY(vm.scale_orig).domain())
			vm.resizePlot(vm.scale)
			vm.adjustYAxis(vm.scale)
		},

		clearData() {

		}
	},
	mounted() {
		var vm = this;

		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		vm.app.renderer.view.style.display = 'block'

		window.addEventListener('resize', vm.handleResize)
		vm.handleResize()

		vm.$refs.home.appendChild(vm.app.view)

		vm.load()
	},
	beforeDestroy() {
		var vm = this;
		window.removeEventListener('resize', vm.handleResize)
		if (vm.app !== undefined) {
			vm.app.destroy()
		}
	}
}
</script>

<style scoped>
#home {
	min-height: 500px;
}
</style>