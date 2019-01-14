<template>

<div class="sld-wrapper" ref="home">
</div>

</template>

<script>

export default {
	components: {},
	data() {
		return {
		}
	},
	methods: {
		handleResize() {
			var vm = this;
			let width = vm.$refs.home.clientWidth
			let height = vm.$refs.home.clientHeight
			vm.app.renderer.resize(width, height);

			if (vm.loaded && vm.ctn_dim) {
				vm.adjustPosition()
			}
		},

		adjustPosition() {
			var vm = this
			if (!vm.loaded) {
				return
			}
			// vm.ctm_dim save the dim sequence
			let lastDim = vm.ctn_dim.children[vm.ctn_dim.children.length-1]
			let max_width = vm.app.renderer.width - 2 * vm.padding - lastDim.width
			let bar = vm.bar
			bar.clear()
			bar.lineStyle(1, vm.barColor)
			bar.beginFill(vm.barColor, 1)
			bar.drawRect(0, 0, max_width, vm.barHeight)
			bar.endFill()
			let last = (vm.ctn_dim.children.length - 1)
			let gap = (max_width - vm.circleSize) / last
			vm.ctn_dim.children.sort((x, y) => {
				return x.axis.idx - y.axis.idx 
			})		
			vm.ctn_dim.children.forEach((d, di) => {
				d.x = gap * di
				d.y = bar.y + vm.circleSize / 2 - vm.barHeight / 2
			})
		},

		addDim(name, idx) {
			var vm = this
			let ctn = new vm.$PIXI.Container()
			let g = new vm.$PIXI.Graphics()
			g.interactive = true
			g.buttonMode = true
			ctn.axis = vm.eventBus.pcp.state.axis[idx]
			ctn.toggle = function() {
				g.enabled = !g.enabled
				ctn.change_state(g.enabled)
				ctn.axis.disabled = !g.enabled
				vm.eventBus.pcp.maskAxis(true)
			}
			ctn.change_state = function(enabled) {
				let color = enabled ? vm.enableColor : vm.disableColor
				g.clear()
				g.lineStyle(1, color)
				g.beginFill(color, 1)
				g.drawCircle(0, 0, vm.circleSize)
				g.endFill()
			}
			g.enabled = true
			ctn.change_state(true)
			g.mousedown = ctn.toggle
			ctn.addChild(g)

			let label = new vm.$PIXI.Text(name
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			label.x -= vm.circleSize
			label.y -= vm.circleSize * 2 + 10
			label.rotation = -Math.PI / 6
			ctn.addChild(label)
			return ctn
		},

		updateData() {
			var vm = this
			vm.loaded = false
			vm.wrapper = new vm.$PIXI.Container()
			vm.wrapper.x = vm.padding
			vm.app.stage.addChild(vm.wrapper)

			let bg = new vm.$PIXI.Container()
			bg.name = 'bg'
			vm.wrapper.addChild(bg)
			vm.ctn_dim = new vm.$PIXI.Container()
			vm.ctn_dim.name = 'ctn_dim'
			vm.wrapper.addChild(vm.ctn_dim)

			let bar = new vm.$PIXI.Graphics()
			bar.y = (vm.app.renderer.height - bar.height - vm.circleSize * 2)
			bg.addChild(bar)
			vm.bar = bar

			let columns = vm.eventBus.columns.slice(vm.eventBus.columns.indexOf('date') + 1)
			columns.forEach((c, ci) => {
				vm.ctn_dim.addChild(vm.addDim(c, ci))
			})

			vm.adjustPosition()
			vm.loaded = true
		},

		clearData() {
			var vm = this
			vm.loaded = false
			vm.app.stage.removeChildren()
		},

	},
	mounted() {
		var vm = this;
		vm.loaded = false
		vm.circleSize = 6
		vm.barHeight = 2
		vm.padding = 10
		vm.barColor = 0x0287e3
		vm.enableColor = 0x0287e3
		vm.disableColor = 0xCCCCCC
		vm.dim_font = 'Arial'
		vm.dim_font_size = 12

		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		vm.app.renderer.view.style.display = 'block'

		window.addEventListener('resize', vm.handleResize)
		vm.handleResize()
		vm.$refs.home.appendChild(vm.app.view)

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
.sld-wrapper {
	width: 100%;
	height: 60px;

	overflow: hidden;
}
</style>
