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
			let vm = this;
			vm.alpha_m = Math.min(1, Math.max(0.1, alpha))
			vm.updateAlpha()
		},  
		updateAlpha() {
			let vm = this
			vm.eventBus.data.forEach(d => {
				if (d.cal.selected && d.pcp) {
					let line = d.pcp
					line.alpha = vm.alpha_m
					line.alpha *= 1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100)
					line.initial_alpha = line.alpha
				}
			})
		},
		highLight(){
			let vm = this;
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
			let vm = this;
			let thick_line = vm.thick_line
			thick_line.clear()
			vm.updateAlpha()
			vm.filterLines()
		},     
        handleResize(){
            let vm = this;
            let width = vm.$refs.home.clientWidth;
            let height = vm.$refs.home.clientHeight;
            vm.app.renderer.resize(width, height);
			if (vm.loaded) {
				vm.adjustAxisPosition()
				vm.adjustLines()
				vm.filterLines()
			}
        }, 
        drawLabel(column){
            let vm = this
            let PIXI = vm.$PIXI
			let label = new PIXI.Text(column
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			label.x = -vm.indicator_radius * 2
			label.rotation = - Math.PI / 6
            label.y = 50
            
			label.interactive = true
            label.buttonMode = true
            
            return label
        },
        axisStartDrag(e,grp_axis){
            grp_axis.dragging = true
            grp_axis.drag_start_x = grp_axis.x
            grp_axis.drag_start_mouse_x = e.data.global.x
        },
        axisDragging(e,grp_axis){
            let vm = this
            if (grp_axis.dragging && e.data.buttons) {
                grp_axis.x = e.data.global.x - grp_axis.drag_start_mouse_x + grp_axis.drag_start_x
                vm.adjustLines()
                vm.adjustAxisPosition()
            } else {
                if (grp_axis.dragging) {
                    vm.axisStopDrag(grp_axis)
                }
            }
        },
        axisStopDrag(grp_axis){
            let vm = this
            grp_axis.dragging = false
            vm.adjustAxisPosition()
            vm.adjustLines()
		},
        drawIndicator(additional, label){
            let vm = this
            let PIXI = vm.$PIXI
            let indicator = new PIXI.Graphics()
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
            return indicator
        },
        hiddenLabels(column){
            let vm = this
            vm.eventBus.root.remove(column)
			setTimeout(()=>{vm.filterLines()},100)            
        },
		drawLine(indicator){
			let vm = this 
			let PIXI = vm.$PIXI
			let line = new PIXI.Graphics()
			line.lineStyle(1, 0)
			line.moveTo(0, 0)
			line.lineTo(0, vm.plot_height)
			line.interactive = true
			line.hitArea = new PIXI.Rectangle(-vm.filterbox_width * 1, 0, 2 * vm.filterbox_width, vm.plot_height);
			line.y = indicator.y + vm.indicator_radius + 5
			line.box = []	
			return line		
		},
		drawFilterStart(e, line, grp_axis){
			let vm = this
			if(grp_axis.axis.disabled){
				return vm.drawFilterEnd(e,line,grp_axis)
			}
			let box = vm.initFilterBox(line.x, line.y, grp_axis, line)
			let p = e.data.getLocalPosition(vm.wrapper)
			box.height = 0
			box.selecting = true
			box.start_y = p.y
			box.alpha = 1
			// box.present = true
			line.box.push(box)
			line.current_box = box
			grp_axis.addChild(box)
		},
		selectingRange(e, line, grp_axis){
			let vm = this
			if(line != undefined && line.current_box != undefined){
				let box = line.current_box
				let p = e.data.getLocalPosition(vm.wrapper)
				if (!e.data.buttons) {
					if (box.selecting) {
						vm.drawFilterEnd(e,line,grp_axis)
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
					if(box.height < Math.abs(box.start_y - p.y)){
						box.height = Math.abs(box.start_y - p.y)
						// vm.filterLines()
					}
					else{
						vm.drawFilterEnd(e,line,grp_axis)
					}
				}
			}
		},
		drawFilterEnd(e, line, grp_axis){
			let vm = this
			if(line != undefined && line.current_box != undefined){
				let box = line.current_box 
				if (box && line.box.length!= 0) {
					if (box.height < 10) {
						grp_axis.removeChild(box)
						if(line.box[line.box.length-1].height < 10)
							line.box.splice(-1,1)
					} else {
						if(line.current_box != undefined){
							box.selecting = false
						}
					}
				}
				vm.filterLines()
			}
		},
		addAxis(column, idx, dim) {
            let vm = this
			let additional = !vm.eventBus.root.columns_train.includes(column)
			let grp_axis = new vm.$PIXI.Container()
			vm.ctn_axis.addChild(grp_axis)
			
			// draw label
            let label = vm.drawLabel(column)
            grp_axis.addChild(label)
			grp_axis.dragging = false
            label.on("rightdown", (e) => vm.axisStartDrag(e,grp_axis))
            label.on("mousemove", (e) => vm.axisDragging(e,grp_axis))
            label.on("rightup", () => vm.axisStopDrag(grp_axis) )
			// draw indicator
			let indicator = vm.drawIndicator(additional, label)
            indicator.on("mousedown", () => vm.hiddenLabels(column))
			grp_axis.addChild(indicator)
			//  draw line
			let line = vm.drawLine(indicator, grp_axis)
			grp_axis.addChild(line)
			//  draw ticks
			let ctn_ticks = new vm.$PIXI.Container()
			grp_axis.addChild(ctn_ticks)
			// add shortcut --new
			grp_axis.child_dict = {
				label, line, ctn_ticks
			}
			grp_axis.axis = {
				idx,
				dim,
				additional,
				name: column,
				disabled: false,
				scale: null,
				extent: null,
				grp: grp_axis,
			}
			vm.state.axis.push(grp_axis.axis)

			line.on("rightdown", (e) => vm.drawFilterStart(e, line, grp_axis))
			line.on("mousemove", (e) => vm.selectingRange(e, line, grp_axis))
			line.on("rightup", (e) => vm.drawFilterEnd(e, line, grp_axis))
        }, 
		drawFilterBox(x, y, length){
			let vm = this 
			let PIXI = vm.$PIXI
			let box = new PIXI.Graphics()
			box.alpha = 0
			box.lineStyle(1, 0)
			box.beginFill(0xFFFFFF, 0.8)
			box.drawRect(-vm.filterbox_width, 0, 2 * vm.filterbox_width, vm.plot_height)
			box.endFill()
			box.x = x
			box.y = y
			box.selecting = false
			box.interactive = true
			box.moving = false
			box.index = length
			return box
		},		 
		filterBoxMove(e, box, line_y, line_x){
			let vm = this
			if(box.moving){
				let newPosition = e.data.getLocalPosition(vm.wrapper);
				if(newPosition.y <= 280 && newPosition.y >= 84 && newPosition.x >= line_x - box.width - 5 && newPosition.x <= line_x + box.width + 5){
					box.y = newPosition.y - box.height/2
					box.y = Math.max(line_y, box.y)
					box.y = Math.min(line_y + vm.plot_height - box.height, box.y)
				}
				else{
					box.moving = false
				}
				// vm.filterLines()
			}			
		},
		// 将需要highlight的filter line 标注
		filterBoxMoveOver(line, box){
			let vm = this
			line.box.forEach(b => {
				b.enabled = false
			})
			box.enabled = true
			vm.filterLines()
		},
		filterBoxOut(line){
			let vm = this
			line.box.forEach(b => {
				b.enabled = true
			})
			vm.filterLines()
		},
		// 移除當前的 filter box
		removeFilterBox(line, box, container){
			let vm = this
			let num_ctn_box = vm.eventBus.cal.ctn_box.length
			line.box.splice(line.box.findIndex((a)=>{return a.index === box.index}),1)
			container.removeChild(box)
			line.box.forEach(b => {
				b.enabled = true
			})
			vm.filterLines()
			// 如果當前既沒有 filter box 也沒有 ctn box，清空當前內容
			if(num_ctn_box===0 && vm.num_filter_box===0){
				vm.eventBus.data.forEach(d => {
					d.cal.selected = false
					d.pcp = undefined
					d.cm.texture = vm.eventBus.cm.dotTexture
					d.cm.alpha = 0.3
					d.cal.texture = vm.eventBus.cal.cellTexture
				})
				vm.clearData()
			}
		},
		initFilterBox(x, y, container, line){
			let vm = this
			let PIXI = vm.$PIXI
			let box = vm.drawFilterBox(x, y, line.box.length)
			// box.hitArea = new PIXI.Rectangle(-vm.filterbox_width * 2, 0, 4 * vm.filterbox_width, vm.plot_height);
			box.on("mousedown", () => {
				let num_ctn_box = vm.eventBus.cal.ctn_box.length
				// 在没有 ctn box 下禁止拖动的行为
				if(num_ctn_box > 0){
					box.moving = true 
				}
			})
			box.on("mousemove", (e) => vm.filterBoxMove(e, box, line.y, container.x))
			box.on("mouseup", () => box.moving = false)
			box.on("mouseover", () => vm.filterBoxMoveOver(line, box))
			box.on("mouseout", () => vm.filterBoxOut(line))
			// box.on("rightdown", () => vm.removeFilterBox(line, box, container))
			box.on("mousedown", () => vm.removeFilterBox(line, box, container))
			box.enabled = true
			return box
		},	 
		maskAxis(sldmode=false) {
			let vm = this
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
				// 自己定義間距,計算 ticks 數值 
				let range = a.extent[1] - a.extent[0]
				let gap = range / 4
				let ticks = [parseFloat(a.extent[0].toFixed(4))]
				for(let i = 1; i < 4; i++){
					ticks.push(parseFloat((ticks[0]+i*gap).toFixed(4)))
				}
				ticks.push(parseFloat(a.extent[1].toFixed(4)))
				// 確保 ticks 唯一性
				ticks = new Set(ticks)
				// 使用 d3 取得其 ticks 數值
				// let ticks = a.scale.ticks(5)
				a.grp.child_dict.ctn_ticks.removeChildren()
				for (let t of ticks) {
					let tick = new vm.$PIXI.Graphics()
					tick.lineStyle(1, 0)
					tick.moveTo(0, 0)
					tick.lineTo(vm.tick_length, 0)
					tick.y = a.scale(t)
					tick.x = - vm.tick_length

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
			let vm = this
			let num_ctn_box = vm.eventBus.cal.ctn_box.length
			vm.num_filter_box = 0
			// 没有 filter box 存在
			let no_box = vm.state.axis.every(a => {
				return a.grp.child_dict.line.box.length === 0
			})	
			if(!num_ctn_box){
				vm.updateAlpha()
			}
			// 統計當前共有多少個 filter box
			vm.state.axis.forEach(e=>{
				vm.num_filter_box += e.grp.child_dict.line.box.length

			})
			// 遍歷所有資料
			vm.eventBus.data.forEach(d => {
				if ((d.cal && d.cal.selected) || (!num_ctn_box && vm.num_filter_box !== 0)) {
					let line = d.pcp
					let boolmap = vm.state.axis.map(a =>{
						let length = a.grp.child_dict.line.box.length
						if(length>0 && a.disabled === false){
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
					/////////////////////////////////////////
					// 允許使用者在沒有對 calendar view 進行選擇的時候，直接對 pcp 進行選取
					// 由於當前沒有繪製出 line, 需要重新绘制
					// 判断条件是当前没有 filter box，也没有 calender view 的 ctn_box
					// 这个情况下就绘制
					////////////////////////////////////////
					if(pass && !num_ctn_box && vm.num_filter_box){
						if(!line){
							d.cal.selected = true
							d.cal.texture = vm.eventBus.cal.cellFilterTexture
							d.cm.texture = vm.eventBus.cm.selectedTexture
							d.cm.alpha = 0.3
							if (d.cal && d.cal.selected) {
								let newline = new vm.$PIXI.Graphics()
								vm.ctn_lines.addChild(newline)
								d.pcp = newline
								newline.tint = d.color
								vm.adjustLines()
							}
						}
					}
					////////////////////////////////////////
					if (line) {
						if (pass) {
							line.tint = d.color
							line.alpha = line.initial_alpha
							if (no_box) {
								d.cal.texture = vm.eventBus.cal.cellTextureSelected
							} else {
								d.cal.texture = vm.eventBus.cal.cellFilterTexture
							}
						} else {
							line.alpha = 0.05
							d.cal.texture = vm.eventBus.cal.cellTextureSelected
						}
					}
				}
			})
			// if(num_ctn_box===0 && vm.num_filter_box !== 0){
			// 	vm.updateData()
			// }
		},
		adjustLines() {
			let vm = this
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
		updateData() {
			let vm = this
			vm.eventBus.data.forEach(d => {
				if (d.cal && d.cal.selected) {
					let line = new vm.$PIXI.Graphics()
					vm.ctn_lines.addChild(line)
					d.pcp = line
				}
				else{
					d.pcp = undefined
				}
			})
			vm.adjustTicks()
			vm.adjustLines()
        },      
		clearData() {
			let vm = this
			if (vm.ctn_lines) {
				vm.ctn_lines.removeChildren()
			}
        },
        pcpInit(){
            let vm = this
			// constant 
			vm.alpha_m = 0.4
            vm.min_axis_gap = 120
            vm.filterbox_width = 10
            vm.plot_height = 190
			vm.dim_font = 'Arial'
			vm.dim_font_size = 14
            vm.tick_length = 5
            vm.indicator_radius = 5 
			
			vm.normalizedby = 'each dimension'
            vm.normalizedin = 'view region'

			vm.app.stage.removeChildren()

			vm.wrapper = new vm.$PIXI.Container()
			vm.wrapper.x = 40
			vm.app.stage.addChild(vm.wrapper)

			vm.ctn_lines = new vm.$PIXI.Container()
			vm.wrapper.addChild(vm.ctn_lines)

			vm.ctn_axis = new vm.$PIXI.Container()
			vm.wrapper.addChild(vm.ctn_axis)
			
            // highlight thick line 
			vm.thick = new vm.$PIXI.Container()
			vm.thick.name = "thick"
            vm.wrapper.addChild(vm.thick)
            
			vm.thick_line = new vm.$PIXI.Graphics()
            vm.thick.addChild(vm.thick_line)
        },
        init(){
			let vm = this
			vm.state = {}
            vm.pcpInit()
            // get axis start index 
			let start_idx = vm.eventBus.date_idx + 1
			vm.state.columns = vm.eventBus.columns.slice(start_idx)
			vm.eventBus.cal.trainedColunms = vm.eventBus.cal.getTrainedColumns()
            vm.state.axis = []
			vm.state.columns.forEach((c, ci) => {
				vm.addAxis(c, ci, ci + start_idx)
            })    
			vm.loaded = true    
		},
	},
	mounted() {
		let vm = this
		vm.loaded = false
		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
        })
        vm.$refs.home.appendChild(vm.app.view)
        // change the app renderer view display style block
        vm.app.renderer.view.style.display = 'block'
        // disable the chrome default right click
        vm.$refs.home.addEventListener('contextmenu', e => {e.preventDefault()})
		window.addEventListener('resize', vm.handleResize)
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