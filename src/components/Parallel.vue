<template>
<div id="pcp-wrapper" class="pcp-wrapper" ref="home">
</div>

</template>

<script>
const FORMAT = {
	'year':[1,2,3,4,5,6,7],
	'month':[0,2,4,6,,8,10,12,14,16,18,20,22],
	'day': [0,5,10,15,20,25,30,35,40,45,50,55]
}
const UNIT = {
	'year':'weekday',
	'month':'hour',
	'day':'minut'
}
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
			vm.eventBus.pcp.state.axis.sort((x, y) => x.grp.x - y.grp.x)
			vm.eventBus.data.forEach(d => {
				if (d.cal.selected && d.cal.msover) {
					let line = d.pcp
					if(line !== undefined){
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
							// let y = (a.name === 'date')?a.scale(vm.$moment.utc(d.raw[a.dim])):a.scale(d.raw[a.dim])
							let y = (a.name === 'date')?a.scale(vm.timeValue(vm.eventBus.calLevel,d.raw[a.dim])):a.scale(d.raw[a.dim])
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
							// let y = (a.name === 'date')?a.scale(vm.$moment.utc(d.raw[a.dim])):a.scale(d.raw[a.dim])
							let y = (a.name === 'date')?a.scale(vm.timeValue(vm.eventBus.calLevel,d.raw[a.dim])):a.scale(d.raw[a.dim])
							if (first) {
								first = false
								thick_line.moveTo(x, y)
							} else {
								thick_line.lineTo(x, y)
							}
						})
					}
				}
				else if(d.cal.selected){
					let line = d.pcp
					if(line !== undefined){
						line.alpha *= 0.5
					}
				}

			})
		},
		// 清除 highlight
		clearHighLight(){
			let vm = this 
			vm.thick_line.clear()
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
            if(column !== 'date'){
				label.interactive = true
				label.buttonMode = true
			}
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
			let axis = vm.state.axis.filter(a => {
				return a.disabled === false
			})
			vm.eventBus.root.USER_SORT_AXIS = axis.map(a => {
				return a.name
			})
            vm.adjustAxisPosition()
            vm.adjustLines()
		},
        drawIndicator(additional, label, column){
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
			if(column !== 'date'){
				indicator.interactive = true
				indicator.buttonMode = true
			}
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
			line.buttonMode = true
			line.hitArea = new PIXI.Rectangle(-vm.filterbox_width * 2, 0, 3 * vm.filterbox_width, vm.plot_height);
			line.y = indicator.y + vm.indicator_radius + 5
			line.box = []	
			return line		
		},
		// 绘制背景板
		drawBackground(x,y,w,h){
			let vm = this
			let PIXI = vm.$PIXI
			let backgournd = new PIXI.Graphics()
			backgournd.beginFill(0xffffff,1);
			backgournd.drawRect(x,y,w,h);
			backgournd.endFill();
			backgournd.y = 0
			return backgournd
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
			line.box.push(box)
			line.current_box = box
			grp_axis.addChild(box)
		},
		selectingRange(e, line, grp_axis){
			let vm = this
			let p = e.data.getLocalPosition(vm.wrapper)
			let box = line.current_box
			if(line != undefined && line.current_box != undefined){
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
					// box.height = Math.abs(box.start_y - p.y)
					// console.log(box.height, box.start_y, p.y,Math.abs(box.start_y - p.y))
					if(box.height <= Math.abs(box.start_y - p.y)){
						box.height = Math.abs(box.start_y - p.y)
					}
					else{
						vm.drawFilterEnd(e,line,grp_axis,'rangeend')
					}
				}
			}
		},
		drawFilterEnd(e, line, grp_axis,content=undefined){
			let vm = this
			if(content){
				console.log(content)
			}
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
		// 添加轴线
		addAxis(column, idx, dim) {
            let vm = this
			let additional = !vm.eventBus.root.columns_train.includes(column)
			let grp_axis = new vm.$PIXI.Container()
			vm.ctn_axis.addChild(grp_axis)
			// draw label
			let label = undefined
			if(column === 'date'){
				label = vm.drawLabel(column+"("+UNIT[vm.eventBus.calLevel]+")")
				let graphics = new vm.$PIXI.Graphics()
				graphics.beginFill(0xffffff);
				graphics.lineStyle(1, 0xffffff, 1);
				graphics.moveTo(label.x, 0);
				graphics.lineTo(label.x, label.y);
				graphics.lineTo(label.y/Math.tan(Math.PI/6), 0);
				graphics.lineTo(label.x, 0);
				graphics.closePath();
				graphics.endFill();
				let backgournd = vm.drawBackground(-60,0,60,70)
				let label_background= vm.drawBackground(0,0,2*label.y/Math.tan(Math.PI/6),label.height)
				label_background.x = label.x
				label_background.y = label.y
				label_background.rotation = - Math.PI / 6
				grp_axis.addChild(graphics)
				grp_axis.addChild(backgournd)
				grp_axis.addChild(label_background)
			}
			else{
				label = vm.drawLabel(column)
			}
			// 绘制顺序问题
			grp_axis.addChild(label)
			grp_axis.dragging = false
			let indicator = vm.drawIndicator(additional, label, column)
			if(column !== 'date'){
				grp_axis.addChild(indicator)
				label.on("mousedown", (e) => vm.axisStartDrag(e,grp_axis))
				label.on("mousemove", (e) => vm.axisDragging(e,grp_axis))
				label.on("mouseup", () => vm.axisStopDrag(grp_axis))
				// 指示符操作
				indicator.on("mousedown", () => vm.hiddenLabels(column))
			}
			else{
				// 绘制时间轴背景板
				let background = vm.drawBackground(-60, indicator.y-vm.indicator_radius-5, 60, 300)
				grp_axis.addChild(background)
			}
			//  draw line
			let line = vm.drawLine(indicator)
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
 			line.on("mousedown", (e) => vm.drawFilterStart(e, line, grp_axis))
			line.on("mousemove", (e) => vm.selectingRange(e, line, grp_axis))
			line.on("mousedup", (e) => vm.drawFilterEnd(e, line, grp_axis))

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
				vm.filterLines()
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
			let cal_mask_boxes = vm.eventBus.cal.ctn_box.length
			line.box.splice(line.box.findIndex((a)=>{return a.index === box.index}),1)
			container.removeChild(box)
			line.box.forEach(b => {
				b.enabled = true
			})
			vm.updateAlpha()
			vm.filterLines()
			// 當前沒有 filter box 時執行
			if(vm.num_filter_box ===0){
				vm.eventBus.cm.highLightSelectedPoint()
			}
			// 如果當前既沒有 filter box 也沒有 ctn box，清空當前內容
			if(cal_mask_boxes===0 && vm.num_filter_box===0){
				vm.eventBus.data.forEach(d => {
					d.cal.selected = false
					d.pcp = undefined	
					d.cm.tint = d.cal.tint
					d.cm.alpha = 0.3
					d.cal.texture = vm.eventBus.cal.cellTexture
				})
				vm.ctn_lines.removeChildren()
			}
		},
		// 移除當前所有的 filter box
		removeAllFilterBox(){
			let vm = this 
			vm.eventBus.pcp.state.axis.forEach(a => {
				let boxes = a.grp.child_dict.line.box
				boxes.forEach( b => {
					a.grp.removeChild(b)
				})
				a.grp.child_dict.line.box = []				
			})
			vm.eventBus.data.forEach(d => {
				d.cal.selected = false
				if(d.pcp){
					d.pcp.alpha = 0
				}
				d.cm.texture = vm.eventBus.cm.dotTexture
				d.cm.alpha = 0.3
				d.cal.texture = vm.eventBus.cal.cellTexture
			})
		},
		initFilterBox(x, y, container, line){
			let vm = this
			let box = vm.drawFilterBox(x, y, line.box.length)
			// box.hitArea = new PIXI.Rectangle(-vm.filterbox_width * 2, 0, 4 * vm.filterbox_width, vm.plot_height);
			box.on("mousedown", () => {
				box.moving = true
			})
			box.on("mousemove", (e) => vm.filterBoxMove(e, box, line.y, container.x))
			box.on("mouseup", () => box.moving = false)
			box.on("mouseover", () => vm.filterBoxMoveOver(line, box))
			box.on("mouseout", () => vm.filterBoxOut(line))
			box.on("rightdown", () => vm.removeFilterBox(line, box, container))
			
			box.enabled = true
			return box
		},	 
		maskAxis(sldmode=false) {
			let vm = this
			vm.adjustAxisPosition(sldmode)
			vm.adjustTicks()
			vm.adjustLines()
		},
		// 设定 ticks
		adjustTicks() {
			let vm = this
			if(vm.normalizedin === 'selected region' && vm.eventBus.cal.ctn_box.length === 0){
				return
			}
			let data = null
			let date_range = undefined
			let full_extent = []
			// 当前资料范围是否需要以当前 view 下所有资料点
			if (vm.normalizedin === 'selected region') {
				data = vm.eventBus.data.filter(d => {return d.cal && d.cal.selected})
			} else {
				data = vm.eventBus.data.filter(d => {return d.cal})
			}
			//////////////////////////////////
			// 检查是否需要 date 信息
			//////////////////////////////////
			if(vm.eventBus.cal.ctn_box.length){
				date_range = vm.eventBus.data.filter(d => {return d.cal && d.cal.selected})
			}
			//////////////////////////////////
			vm.state.axis.forEach(a => {
				let dim_data = undefined
				// 判定不为时间栏位的话
				if(a.name !== 'date'){					
					dim_data = data.map(d => {
						return parseFloat(d.raw[a.dim])
					})
					a.extent = vm.$d3.extent(dim_data)
					if (!a.disabled) {
						full_extent = full_extent.concat(a.extent)
					}
				}
				else{
					a.extent = vm.$d3.extent(FORMAT[vm.eventBus.calLevel])
				}
			})
			if (vm.normalizedby === 'all dimension') {
				vm.state.axis.forEach(a => {
					if(a.name !== 'date'){
						a.extent = vm.$d3.extent(full_extent)
					}
				})
			}
			vm.state.axis.forEach(a => {
				let axis_y_start = vm.state.axis[0].grp.child_dict.line.y
				let ticks = undefined
				// 加入时间 scale 判断
				if(a.name !== 'date'){
					a.scale = vm.$d3.scaleLinear()
						.domain(a.extent).range([axis_y_start + vm.plot_height, axis_y_start])
					// 自己定義間距,計算 ticks 數值 
					let range = a.extent[1] - a.extent[0]
					let gap = range / 4
					ticks = [parseFloat(a.extent[0].toFixed(4))]
					for(let i = 1; i < 4; i++){
						ticks.push(parseFloat((ticks[0]+i*gap).toFixed(4)))
					}
					ticks.push(parseFloat(a.extent[1].toFixed(4)))
					// 確保 ticks 唯一性
					ticks = new Set(ticks)
				}
				else{
					a.scale = vm.$d3.scaleLinear().range([axis_y_start + vm.plot_height, axis_y_start]).domain(a.extent)
					ticks = new Array(...FORMAT[vm.eventBus.calLevel])
				}
				a.grp.child_dict.ctn_ticks.removeChildren()
				for (let t of ticks) {
					let tick = new vm.$PIXI.Graphics()
					tick.lineStyle(1, 0)
					tick.moveTo(0, 0)
					tick.lineTo(vm.tick_length, 0)
					tick.y = a.scale(t)
					if(a.name === 'date'){
						// t = vm.$moment.utc(t).format(FORMAT[vm.eventBus.calLevel])
						t = vm.Time_AXIS_FORMAT(t)
					}
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
		// 设定轴线的位置
		adjustAxisPosition() {
			let vm = this
			let date_index = undefined
			vm.state.axis.forEach(a => {
				a.grp.alpha = 0
			})
			let axis = vm.state.axis.filter(a => {return a.disabled === false})
			// 记录第一次预设的轴线顺序
			if(vm.eventBus.root.USER_SORT_AXIS===undefined){
				vm.eventBus.root.USER_SORT_AXIS = axis.map(a => {
					return a.name
				})
			} 
			let index = vm.eventBus.root.USER_SORT_AXIS.indexOf('date')
			/////////////////////////////////
			// 让 date 栏位永远位于第一位
			////////////////////////////////
			// 保留使用这选中的 axis 排列顺序
			axis.forEach((a,ai) => {
				if(a.name === 'date'){
					date_index = ai
				}
			})
			if(date_index !== undefined ){
				let date_axis = axis.splice(date_index,1)
				axis.unshift(date_axis[0])
				if(index === -1){
					console.log(index)
					vm.eventBus.root.USER_SORT_AXIS.unshift('date')
				}
			}
			else{
				if(index !== -1){
					vm.eventBus.root.USER_SORT_AXIS.splice(index,1)
				}
			}
			// console.log("PCP:", vm.eventBus.root.USER_SORT_AXIS,index)
			////////////////////////////////
			let min_width = vm.min_axis_gap * (axis.length - 1) + vm.wrapper.x * 2
			if (vm.app.renderer.width < min_width) {
				vm.app.renderer.resize(min_width, vm.app.renderer.height)
			}
			vm.plot_width = vm.app.renderer.width  - vm.wrapper.x * 2
			let firstAxis = axis[0]
            let lastAxis = axis[axis.length - 1]
            
			let ctn_ticks = firstAxis.grp.child_dict.ctn_ticks.children
			let leftPad =  ctn_ticks[ctn_ticks.length-1].width
			let rightPad = lastAxis.grp.child_dict.label.width / 2

			let available_width = vm.plot_width - (leftPad + rightPad)
			let axis_gap = available_width / (axis.length - 1)
			axis.forEach((a) => {
				let ctn_ticks = a.grp.child_dict.ctn_ticks.children
				let ai = vm.eventBus.root.USER_SORT_AXIS.indexOf(a.name) 
				a.grp.alpha = 1
				if (!a.grp.dragging) {
					a.grp.x = leftPad + ai * axis_gap
				}
				a.idx = ai
			})
		},
		// 将资料进行 Axis vs latentdim似度排序
		sortAxis(columns,sort=true){
			let vm = this
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
            
			// let leftPad = firstAxis.grp.child_dict.label.width / 2
			let ctn_ticks = firstAxis.grp.child_dict.ctn_ticks.children
			let leftPad =  ctn_ticks[ctn_ticks.length-1].width
			let rightPad = lastAxis.grp.child_dict.label.width / 2

			let available_width = vm.plot_width - (leftPad + rightPad)
			let axis_gap = available_width / (axis.length - 1)
			if(sort){
				axis.forEach((a) => {
					let ai = (a.name === 'date')?0:columns.indexOf(a.name) + 1
					a.grp.alpha = 1
					
					if (!a.grp.dragging) {
						a.grp.x = leftPad + ai * axis_gap
					}
					a.idx = ai
				})
			}
			else{
				axis.forEach((a) => {
					let ai = columns.indexOf(a.name)
					a.grp.alpha = 1
					
					if (!a.grp.dragging) {
						a.grp.x = leftPad + ai * axis_gap
					}
					a.idx = ai
				})				
			}
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
		// 篩選出需要繪製的線條
		filterLines() {
			let vm = this
			// 統計當前 calendar view mask box 的數量
			let cal_mask_boxes = vm.eventBus.cal.ctn_box.length
			vm.num_filter_box = 0
			// 没有 filter box 存在
			let no_box = vm.state.axis.every(a => {
				return a.grp.child_dict.line.box.length === 0
			})	
			// 忘記作用了,先註解
			// if(!cal_mask_boxes){
			// 	vm.updateAlpha()
			// }
			// 統計當前共有多少個 filter box
			vm.state.axis.forEach(e=>{
				vm.num_filter_box += e.grp.child_dict.line.box.length

			})
			// 遍歷所有資料
			vm.eventBus.data.forEach(d => {
				if ((d.cal && d.cal.selected) || (!cal_mask_boxes && vm.num_filter_box !== 0)) {
					let line = d.pcp
					let boolmap = vm.state.axis.map(a =>{
						let length = a.grp.child_dict.line.box.length
						if(length>0 && a.disabled === false){
							return a.grp.child_dict.line.box.map(box => {
								if (a.disabled) {
									return true
								}
								// let y = (a.name === 'date')?a.scale(vm.$moment.utc(d.raw[a.dim])):a.scale(d.raw[a.dim])
								let y = (a.name === 'date')?a.scale(vm.timeValue(vm.eventBus.calLevel,d.raw[a.dim])):a.scale(d.raw[a.dim])
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
					if(pass){
						if(!cal_mask_boxes && vm.num_filter_box){
							if(!line){
								d.cal.selected = true
								d.cal.texture = vm.eventBus.cal.cellFilterTexture
								if (d.cal && d.cal.selected) {
									let newline = new vm.$PIXI.Graphics()
									vm.ctn_lines.addChild(newline)
									d.pcp = newline
									newline.tint = d.color
									vm.drawSingleLine(d)
									line = d.pcp
								}								
							}
						}
						if(line){
							line.tint = d.cal.tint
							line.alpha = vm.alpha_m * 0.5
							if (no_box) {
								d.cal.texture = vm.eventBus.cal.cellTextureSelected
							} else {
								d.cal.texture = vm.eventBus.cal.cellFilterTexture
							}	
							d.cm.tint = 0xffffff
							d.cm.alpha = 1.0	
							vm.eventBus.cm.ctn_points.setChildIndex(d.cm,vm.eventBus.cm.ctn_points.children.length-1)							
						}					
					}
					else if(line){
						line.alpha = 0
						// 沒有 cal mask box 時候
						if(!cal_mask_boxes){
							d.cal.selected = false
							d.cal.texture = vm.eventBus.cal.cellTexture
						}
						else{
							d.cal.texture = vm.eventBus.cal.cellTextureSelected
						}
						d.cm.tint = d.cal.tint
						d.cm.alpha = 0.3						
					}
				}
			})
		},
		// 在调整折线绘制的时候,有重置轴线在container 的顺序
		adjustLines() {
			let vm = this
			vm.state.axis.sort((x, y) => x.grp.x - y.grp.x)
			vm.eventBus.data.forEach(d => {
				if (d.cal && d.cal.selected) {
					let line = d.pcp
					if(!line){
						line = new vm.$PIXI.Graphics()
						vm.ctn_lines.addChild(line)
						d.pcp = line
					}
					line.clear()
					line.lineStyle(2, 0xFFFFFF)
					line.tint = d.cal.tint

					let first = true
					vm.state.axis.forEach(a => {
						if (a.disabled) {
							return
						}
						let x = a.grp.x
						// let y = (a.name === 'date')?a.scale(vm.$moment.utc(d.raw[a.dim])):a.scale(d.raw[a.dim])
						let y = (a.name === 'date')?a.scale(vm.timeValue(vm.eventBus.calLevel,d.raw[a.dim])):a.scale(d.raw[a.dim])
						if (first) {
							first = false
							line.moveTo(x, y)
						} else {
							line.lineTo(x, y)
						}
					})
					line.alpha = vm.alpha_m
					line.alpha *= 1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100)
					line.initial_alpha = line.alpha
				}
			})
		},
		timeValue(level,date){
			let vm = this
			let date_time = vm.$moment.utc(date)
			let scale = {
				'year': date_time.isoWeekday(),
				'month': date_time.hour(),
				'day': date_time.minute()
			}
			return scale[level]
		},
		drawSingleLine(data){
			let vm = this
			let line = data.pcp
			vm.state.axis.sort((x,y) => x.grp.x - y.grp.x)
			line.clear()
			line.lineStyle(2,0xFFFFFF)
			line.tint = data.color
			let first = true
			vm.state.axis.forEach(a => {
				if (a.disabled) {
					return
				}
				let x = a.grp.x
				// let y = (a.name === 'date')?a.scale(vm.$moment.utc(data.raw[a.dim])):a.scale(data.raw[a.dim])
				let y = (a.name === 'date')?a.scale(vm.timeValue(vm.eventBus.calLevel,data.raw[a.dim])):a.scale(data.raw[a.dim])
				if (first) {
					first = false
					line.moveTo(x, y)
				} else {
					line.lineTo(x, y)
				}
			})
			line.alpha = vm.alpha_m
			line.alpha *= 1 - ((1-data.alpha_u) * vm.eventBus.root.errorAlpha / 100)
			line.initial_alpha = line.alpha
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
			// vm.eventBus.data.forEach(d => {
			// 	if (d.cal && d.cal.selected) {
			// 		if(d.pcp === undefined){
			// 			let line = new vm.$PIXI.Graphics()
			// 			vm.ctn_lines.addChild(line)
			// 			d.pcp = line
			// 		}
			// 		// else{
			// 		// 	d.pcp.alpha = vm.alpha_m * (1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100))
			// 		// }
			// 	}
			// 	else{
			// 		if(d.pcp){
			// 			d.pcp.alpha = 0
			// 		}
			// 	}
			// })
			vm.adjustTicks()
			vm.adjustLines()
        },      
		clearData() {
			let vm = this
			if (vm.ctn_lines) {
				vm.ctn_lines.children.forEach(line => {
					line.alpha = 0
				})
			}
		},
		removeAllLines(){
			if (vm.ctn_lines) {
				vm.ctn_lines.removeChildren()
			}
			vm.eventBus.data.forEach(d => {
				d.pcp = undefined
			})
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
			
			// sort switch button
			vm.switch_button = new vm.$PIXI.Container()
			vm.switch_button.name = 'swith button'
			vm.wrapper.addChild(vm.switch_button)

			let [roundedRect,circle,Label] = vm.drawSwitchButton('SORT')
			vm.switch_button.addChild(roundedRect)
			vm.switch_button.addChild(circle)
			vm.switch_button.addChild(Label)
			vm.switch_button.mousedown = () =>{
				circle.bool = !circle.bool
				circle.bool?roundedRect.tint = 0xb6cefe:roundedRect.tint = 0xc9c9c9
				circle.bool?circle.tint = 0x86adff:circle.tint = 0xffffff
				circle.bool?circle.x = 26:circle.x = 9
				if(circle.bool){
					if(vm.eventBus.cal.ctn_box.length !== 0){
						vm.eventBus.cal.sortAxis(vm.eventBus.cal.ctn_cells)
					}
				}
				else{
					vm.adjustTicks()
					vm.adjustAxisPosition()
					vm.adjustLines()
					vm.filterLines()
				}
				vm.switch_button.mode = circle.bool
			}
			vm.switch_button.interactive = true
			vm.switch_button.buttonMode = true

			vm.switch_button.x = -35
			vm.switch_button.y = 15
			vm.switch_button.mode = circle.bool
		},
		// 繪製 switch button
		drawSwitchButton(text){
			let vm = this
			let PIXI = vm.$PIXI
			let roundedRect = new PIXI.Graphics()
			let circle = new PIXI.Graphics()
			// 文本信息
			let Label = new PIXI.Text(text
			, {fontFamily : vm.dim_font, fontSize: 16, fill : 0x000000, align : 'center'})
			Label.x = 40
			Label.y = -2
			// 圆角矩形
			roundedRect.lineStyle(1, 0xc9c9c9, 1);
			roundedRect.beginFill(0xFFFFFF, 1);
			roundedRect.drawRoundedRect(0, 0, 35, 12, 7);
			roundedRect.endFill();
			roundedRect.tint = 0xc9c9c9
			// 圆形
			circle.lineStyle(1, 0xc9c9c9, 1);
			circle.beginFill(0xffffff, 1);
			circle.drawCircle(0, 0, 10);
			circle.x = 9
			circle.y = 6
			circle.endFill();
			circle.bool = false
			return [roundedRect,circle,Label]
		},
        init(){
			let vm = this
			let d3 = vm.$d3
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
			// 加入时间轴
			vm.addAxis('date',-1,start_idx-1)
			vm.loaded = true    
		},
		// 固定时间轴
		fixedDateDim(dom){
			let vm = this
			let time_dimension = vm.state.axis.filter(a => a.name==='date')
			time_dimension[0].grp.x = dom.scrollLeft - dom.clientLeft 
			if(time_dimension[0].grp.x===0){
				time_dimension[0].grp.x += 20	
			}
			vm.adjustLines()
		}
	},
	mounted() {
		let vm = this
		vm.loaded = false
		vm.Time_AXIS_FORMAT = vm.$d3.format("02d");
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
        document.getElementById('pcp-wrapper').onscroll = function(){
			if(vm.eventBus.cal.ctn_box.length > 0){
				console.log('onscroll')
				vm.fixedDateDim(this)
			}
		}
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