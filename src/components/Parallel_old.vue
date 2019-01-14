<template>

<div class="pcp-wrapper" ref="home">
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
		changeAlpha(alpha) {
			var vm = this;
			vm.alpha_m = Math.min(1, Math.max(0.1, alpha))
			vm.updateAlpha()
		},

		updateAlpha() {
			var vm = this
			vm.eventBus.data.forEach(d => {
				if (d.cal.selected && d.pcp) {
					let line = d.pcp
					line.alpha = vm.alpha_m
					line.alpha *= 1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100)
				}
			})
		},

		highLight(){
			var vm = this;
			vm.updateAlpha()
			vm.eventBus.data.forEach(d => {
				if (d.cal.selected && d.cal.msover) {
					let line = d.pcp
					line.alpha = 0
					let thick_line = vm.thick_line
					thick_line.clear()
					thick_line.lineStyle(5, 0xFFFFFF - line.tint)
					let first = true
					vm.state.axis.forEach(a => {
						if (a.disabled) {
							return
						}
						let x = a.grp.x
						let y = a.scale(d.raw[a.dim])
						if (first) {
							first = false
							thick_line.moveTo(x, y)
						} else {
							thick_line.lineTo(x, y)
						}
					})

					thick_line.lineStyle(3, line.tint)
					first = true
					vm.state.axis.forEach(a => {
						if (a.disabled) {
							return
						}
						let x = a.grp.x
						let y = a.scale(d.raw[a.dim])
						if (first) {
							first = false
							thick_line.moveTo(x, y)
						} else {
							thick_line.lineTo(x, y)
						}
					})
				}
				else if(d.cal.selected){
					let line = d.pcp
					line.alpha *= 0.5
				}

			})
		},

		resetAlpha(){
			var vm = this;
			let thick_line = vm.thick_line
			thick_line.clear()
			// vm.eventBus.data.forEach(d => {
			// 	if(d.cal.selected){
			// 		let line = d.pcp
			// 		line.alpha = vm.line_init_alpha
			// 	}
			// })
			vm.updateAlpha()
			vm.filterLines()
		},

		handleResize() {
			var vm = this;
			let width = vm.$refs.home.clientWidth
			let height = vm.$refs.home.clientHeight
			vm.app.renderer.resize(width, height);

			if (vm.loaded) {
				vm.adjustAxisPosition()
				vm.adjustLines()
				vm.filterLines()
			}
		},

		addAxis(column, idx, dim) {
			var vm = this
			let additional = !vm.eventBus.root.columns_train.includes(column)
			let grp_axis = new vm.$PIXI.Container()
			vm.ctn_axis.addChild(grp_axis)
			
			// label
			let label = new vm.$PIXI.Text(column
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			label.x = -vm.indicator_radius * 2
			label.rotation = - Math.PI / 6
			label.y = 50
			grp_axis.addChild(label)

			label.interactive = true
			label.buttonMode = true

			grp_axis.dragging = false
			label.rightdown = function(e) {
				grp_axis.dragging = true
				grp_axis.drag_start_x = grp_axis.x
				grp_axis.drag_start_mouse_x = e.data.global.x
			}

			label.mousemove = function(e) {
				if (grp_axis.dragging && e.data.buttons) {
					grp_axis.x = e.data.global.x - grp_axis.drag_start_mouse_x + grp_axis.drag_start_x
					vm.adjustLines()
					vm.adjustAxisPosition()
				} else {
					if (grp_axis.dragging) {
						label.stop_dragging()
					}
				}
			}

			label.stop_dragging = function() {
				grp_axis.dragging = false
				vm.adjustAxisPosition()
				vm.adjustLines()
			}

			label.rightup = label.stop_dragging

			// indicator
			let indicator = new vm.$PIXI.Graphics()
			indicator.lineStyle(1, 0x0287e3)
			indicator.beginFill(0x0287e3, 0.9)
			if (additional) {
				indicator.moveTo(0, -vm.indicator_radius)
				indicator.lineTo(vm.indicator_radius, vm.indicator_radius)
				indicator.lineTo(-vm.indicator_radius, vm.indicator_radius)
				indicator.lineTo(0, -vm.indicator_radius)
			} else {
				indicator.drawCircle(0, 0, vm.indicator_radius, vm.indicator_radius)
			}
			indicator.endFill()
			indicator.y = label.y + label.height + 8
			indicator.interactive = true
			indicator.buttonMode = true
			indicator.mousedown = function() {
				vm.eventBus.root.remove(column)
				setTimeout(()=>{vm.filterLines()},100)
			}
			grp_axis.addChild(indicator)

			// line
			let line = new vm.$PIXI.Graphics()
			line.lineStyle(1, 0)
			line.moveTo(0, 0)
			line.lineTo(0, vm.plot_height)
			line.interactive = true
			line.hitArea = new vm.$PIXI.Rectangle(-vm.hit_width, 0, 2 * vm.hit_width, vm.plot_height);
			line.y = indicator.y + vm.indicator_radius + 5
			grp_axis.addChild(line)
			line.box = []
			// handle selection
			// line.boxList = []
			line.selectionStart = function(e) {
				console.log("why")
				let box = vm.initSelectionBox(line.x, line.y, grp_axis, line)
				let p = e.data.getLocalPosition(vm.wrapper)
				box.height = 0
				box.selecting = true
				box.start_y = p.y
				box.alpha = 1
				box.present = true
				line.box.push(box)
				line.current_box = box
				grp_axis.addChild(box)
			}
			
			line.selectionEnd = function() {
				let box = line.current_box
				if (box) {
					if (box.height < 10) {
						grp_axis.removeChild(box)
						line.box = line.box.slice(0, line.box.length-1)
					} else {
						if(line.current_box != undefined){
							box.selecting = false
							box.present = false
						}
					}
				}
				vm.filterLines()
			}

			line.selecting = function(e) {
				if(line.current_box != undefined){
					let box = line.current_box
					let p = e.data.getLocalPosition(vm.wrapper)
					if (!e.data.buttons) {
						if (box.selecting) {
							line.selectionEnd()
						}
					}
					if (box.selecting && box != undefined) {
						p.y = Math.min(line.y+line.height, p.y)
						p.y = Math.max(line.y, p.y)
						if (p.y < box.start_y) {
							box.y = p.y
						} else {
							box.y = box.start_y
						}
						box.height = Math.abs(box.start_y - p.y)
						vm.filterLines()
					}
				}
			}

			line.mousedown = line.selectionStart
			line.mousemove = line.selecting
			line.mouseup = line.selectionEnd

			// ticks
			let ctn_ticks = new vm.$PIXI.Container()
			grp_axis.addChild(ctn_ticks)

			// add shortcut --new
			grp_axis.child_dict = {
				label, line, ctn_ticks
			}

			vm.state.axis.push({
				idx,
				dim,
				additional,
				name: column,
				disabled: false,
				scale: null,
				extent: null,
				grp: grp_axis,
			})
		},
		
		initSelectionBox(x, y, container, line){
			let vm = this
			let box = new vm.$PIXI.Graphics()
			box.alpha = 0
			box.lineStyle(1, 0)
			box.beginFill(0xFFFFFF, 0.8)
			box.drawRect(-vm.hit_width, 0, 2 * vm.hit_width, vm.plot_height)
			box.endFill()
			box.x = x
			box.y = y
			box.selecting = false
			box.interactive = true
			// box.buttonMode = true
			box.moving = false
			box.index = line.box.length
			box.mousedown = function(){
				box.moving = true
			}
			box.mousemove = function(e){
				if(box.moving){
					let newPosition = e.data.getLocalPosition(vm.wrapper);
					box.y = newPosition.y - box.height/2
					box.y = Math.max(line.y, box.y)
					box.y = Math.min(line.y + vm.plot_height - box.height, box.y)
					vm.filterLines()
				}
			}
			box.mouseup = function(){
				box.moving = false
			}
			box.mouseover = function() {
				line.box.forEach(b => {
					b.enabled = false
				})
				box.enabled = true
				vm.filterLines()
			}
			box.mouseout = function() {
				line.box.forEach(b => {
					b.enabled = true
				})
				vm.filterLines()
			}
			box.rightdown = function(){
				line.box.splice(line.box.findIndex((a)=>{return a.index === box.index}),1)
				container.removeChild(box)
				line.box.forEach(b => {
					b.enabled = true
				})
				vm.filterLines()
			}
			box.enabled = true
			return box
		},

		maskAxis(sldmode=false) {
			var vm = this
			vm.adjustAxisPosition(sldmode)
			vm.adjustTicks()
			vm.adjustLines()
		},

		adjustTicks() {
			var vm = this
			let data = null
			if (vm.normalizedin === 'selected region') {
				data = vm.eventBus.data.filter(d => {return d.cal && d.cal.selected})
			} else {
				data = vm.eventBus.data.filter(d => {return d.cal})
			}
			let full_extent = []
			vm.state.axis.forEach(a => {
				let dim_data = data.map(d => {
					return parseFloat(d.raw[a.dim])
				})

				a.extent = vm.$d3.extent(dim_data)
				if (!a.disabled) {
					full_extent = full_extent.concat(a.extent)
				}
			})
			if (vm.normalizedby === 'all dimension') {
				vm.state.axis.forEach(a => {
					a.extent = vm.$d3.extent(full_extent)
				})
			}
			vm.state.axis.forEach(a => {
				let axis_y_start = vm.state.axis[0].grp.child_dict.line.y
				a.scale = vm.$d3.scaleLinear()
					.domain(a.extent).range([axis_y_start + vm.plot_height, axis_y_start])

				let ticks = a.scale.ticks(5)
				a.grp.child_dict.ctn_ticks.removeChildren()
				for (let t of ticks) {
					let tick = new vm.$PIXI.Graphics()
					tick.lineStyle(1, 0)
					tick.moveTo(0, 0)
					tick.lineTo(vm.tick_width, 0)
					tick.y = a.scale(t)
					tick.x = - vm.tick_width

					let tick_label = new vm.$PIXI.Text(String(t)
					, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
					
					tick_label.x = tick.x - tick_label.width
					tick_label.y = tick.y - tick_label.height / 2

					a.grp.child_dict.ctn_ticks.addChild(tick)
					a.grp.child_dict.ctn_ticks.addChild(tick_label)
				}
			})
		},

		adjustAxisPosition() {
			var vm = this
			vm.state.axis.forEach(a => {
				a.grp.alpha = 0
			})
			let axis = vm.state.axis.filter(a => {return a.disabled === false})
		
			let min_width = vm.min_axis_gap * (axis.length - 1) + vm.wrapper.x * 2
			if (vm.app.renderer.width < min_width) {
				vm.app.renderer.resize(min_width, vm.app.renderer.height)
			}
			vm.plot_width = vm.app.renderer.width  - vm.wrapper.x * 2
			let firstAxis = axis[0]
			let lastAxis = axis[axis.length - 1]

			// let labelHeight = firstAxis.grp.child_dict.label.height
			let leftPad = firstAxis.grp.child_dict.label.width / 2
			let rightPad = lastAxis.grp.child_dict.label.width / 2

			let available_width = vm.plot_width - (leftPad + rightPad)
			let axis_gap = available_width / (axis.length - 1)

			axis.forEach((a, ai) => {
				a.grp.alpha = 1
				if (!a.grp.dragging) {
					a.grp.x = leftPad + ai * axis_gap
				}
				a.idx = ai
			})
			// if( !sldmode)
			// 	vm.eventBus.sld.adjustPosition()
		},

		getAxisList() {
			var vm = this;
			let res = []
			vm.state.axis.forEach(a => {
				if (a.disabled === false) {
					res.push(a.name)
				}
			})
			return res.join(',')
		},

		filterLines() {
			var vm = this
			let no_box = vm.state.axis.every(a => {
				// return true
				return a.grp.child_dict.line.box.length === 0
			})
			vm.updateAlpha()
			vm.eventBus.data.forEach(d => {
				if (d.cal && d.cal.selected) {
					let line = d.pcp
					let boolmap = vm.state.axis.map(a =>{
						let length = a.grp.child_dict.line.box.length
						if(length>0){
							return a.grp.child_dict.line.box.map(box => {
								if (a.disabled) {
									return true
								}
								let y = a.scale(d.raw[a.dim])
								let upper = box.y
								let lower = box.y + box.height
								if ((y >= upper && y <= lower && box.enabled) || box.cancel_selection) {
									return true
								}else{
									return false
								}
							}).some(a =>{
								return a === true
							})
						}
						else{
							return true
						}
					})
					let pass = boolmap.every(a => {
						return a === true
					})
					if (line) {
						if (pass) {
							line.tint = d.color
							// line.tint_backup = line.tint
							// line.alpha *= 1
							// d.cal.alpha = 1
							if (no_box) {
								d.cal.texture = vm.eventBus.cal.cellTextureSelected
							} else {
								d.cal.texture = vm.eventBus.cal.cellFilterTexture
							}
						} else {
							// line.tint = 0xCCCCCC
							line.alpha *= 0.1
							// d.cal.alpha = 0.6
							d.cal.texture = vm.eventBus.cal.cellTextureSelected
						}
					}
				}
			})
		},

		adjustLines() {
			var vm = this
			vm.eventBus.pcp.state.axis.sort((x, y) => x.grp.x - y.grp.x)
			vm.eventBus.data.forEach(d => {
				if (d.cal && d.cal.selected && d.pcp) {
					let line = d.pcp
					line.clear()
					line.lineStyle(2, 0xFFFFFF)
					line.tint = d.color

					let first = true
					vm.state.axis.forEach(a => {
						if (a.disabled) {
							return
						}
						let x = a.grp.x
						let y = a.scale(d.raw[a.dim])
						if (first) {
							first = false
							line.moveTo(x, y)
						} else {
							line.lineTo(x, y)
						}
					})
				}
			})
			vm.updateAlpha()
		},

		replaceData(data, colors) {
			var vm = this
			vm.ctn_lines.removeChildren()
			vm.state.data = []
			data.forEach((d, di) => {
				vm.addLine(d, colors[di])
			})
		},

		updateCols() {
			var vm = this
			vm.state = {}
			let start_idx = vm.eventBus.date_idx + 1
			vm.state.columns = vm.eventBus.columns.slice(start_idx)

			// const
			vm.alpha_m = 0.4
			vm.min_axis_gap = 40
			vm.hit_width = 10
			vm.plot_height = 190
			vm.dim_font = 'Arial'
			vm.dim_font_size = 14
			vm.tick_width = 5
			// why 
			vm.app.stage.removeChildren()

			vm.wrapper = new vm.$PIXI.Container()
			vm.wrapper.x = 40
			vm.app.stage.addChild(vm.wrapper)

			vm.ctn_lines = new vm.$PIXI.Container()
			vm.wrapper.addChild(vm.ctn_lines)

			vm.ctn_axis = new vm.$PIXI.Container()
			vm.wrapper.addChild(vm.ctn_axis)

			vm.ctn_ticks = new vm.$PIXI.Container()
			vm.wrapper.addChild(vm.ctn_ticks)

			vm.thick = new vm.$PIXI.Container()
			vm.thick.name = "thick"
			vm.wrapper.addChild(vm.thick)
			vm.thick_line = new vm.$PIXI.Graphics()
			vm.thick.addChild(vm.thick_line)

			vm.state.axis = []
			vm.state.columns.forEach((c, ci) => {
				vm.addAxis(c, ci, ci + start_idx)
			})
			// why
			vm.adjustAxisPosition()
			vm.loaded = true
		},

		updateData() {
			var vm = this
			vm.eventBus.data.forEach(d => {
				if (d.cal && d.cal.selected) {
					let line = new vm.$PIXI.Graphics()
					vm.ctn_lines.addChild(line)
					d.pcp = line
				}
			})
			vm.adjustTicks()
			vm.adjustLines()
		},

		clearData() {
			var vm = this
			if (vm.ctn_lines) {
				vm.ctn_lines.removeChildren()
			}
		},

	},
	mounted() {
		var vm = this;
		vm.indicator_radius = 5
		vm.loaded = false
		vm.normalizedby = 'each dimension'
		vm.normalizedin = 'selected region'

		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		// why
		vm.app.renderer.view.style.display = 'block'
		vm.$refs.home.addEventListener('contextmenu', e => {e.preventDefault()})

		window.addEventListener('resize', vm.handleResize)
		// why
		vm.handleResize()
		vm.$refs.home.appendChild(vm.app.view)
		// loaded the pcp completely
		vm.$emit('loaded')
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

<style lang="scss" scoped>
.pcp-wrapper {
	// min-height: 315px;
	height: 300px;
	overflow-x: scroll;
}
</style>
