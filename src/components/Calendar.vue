<template>

<div class="cal-wrapper" ref="home">
	<v-alert ref="alert" :value="alert" :color="color" outline>
	{{message}}
	</v-alert>
</div>

</template>

<script>
const date_format = 'YYYY-MM-DD HH:mm:ss'
export default {
	components: {},
	data(){
		return{
			alert:true,
			message:"aaaa",
			color:"white"
		}
	},
	methods: {
		handleResize() {
			var vm = this;
			let width = vm.$refs.home.clientWidth
			vm.app.renderer.resize(width, vm.app.renderer.height);
			if (vm.wrapper) {
				vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
			}
		},

		updateAlpha() {
			var vm = this
			vm.eventBus.data.forEach(d => {
				if (d.cal) {
					d.cal.alpha =  1
					d.cal.alpha *= 1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100)
				}
			})
		},

		collision(rect1, rect2) {
			if (rect1.x <= rect2.x + rect2.width &&
				rect1.x + rect1.width >= rect2.x &&
				rect1.y <= rect2.y + rect2.height &&
				rect1.height + rect1.y >= rect2.y) {
				rect1.singSelected = false
				rect1.neibor = false
				return true
			}
			return false
		},

		distance(p1, p2) {
			let x = p1[0] - p2[0]
			let y = p1[1] - p2[1]
			return Math.sqrt(x * x + y * y)
		},

		goLastZoom() {
			var vm = this
			vm.eventBus.zoomHistory.pop()
			let param = vm.eventBus.zoomHistory.pop()
			vm.eventBus.calLevel = param.calLevel
			// vm.eventBus.root.loadData(param.interval, param.startDate, param.endDate)
			vm.eventBus.root.loadData(param.interval, param.date_range)
		},

		adjustAxisOrder() {
			var vm = this
			let boxes = []
			let disableSort = true
			if (disableSort) {
				return
			}
			vm.wrapper.children.forEach(c => {
				let main_ctn = c.getChildByName('main_ctn')
				if (main_ctn) {
					c.getChildByName('main_ctn').getChildByName('ctn_box').children.forEach(b => {
						b.group = []
						boxes.push(b)
					})
				}
			})
			if (boxes.length <= 1) {
				vm.eventBus.pcp.state.axis.sort((x, y) => x.dim - y.dim)
				vm.eventBus.pcp.adjustAxisPosition()
				return
			}
			boxes.forEach(b => {
				vm.eventBus.data.forEach(d => {
					if (vm.collision(d.cal, b)) {
						b.group.push(d)
					}
					d.in_group = false
				})
				b.group.forEach(g => {
					vm.eventBus.data.forEach(n => {
						if (vm.distance(g.cm.npos, n.cm.npos) < 0.1) {
							n.in_group = true
						}
					})
				})
				let group = vm.eventBus.data.filter(d => {return d.in_group})

				b.means = []
				vm.eventBus.pcp.state.axis.forEach(a => {
					let mean = 0
					group.forEach(g => {
						mean += g.raw[a.dim]
					})
					b.means.push(mean / group.length)
				})
			})
			vm.eventBus.pcp.state.axis.forEach((a, ai) => {
				let max = boxes[0].means[ai]
				let min = boxes[0].means[ai]
				boxes.forEach(b => {
					max = Math.max(max, b.means[ai])
					min = Math.min(min, b.means[ai])
				})
				a.ranking = (max - min) / vm.eventBus.std[a.dim]
			})

			vm.eventBus.pcp.state.axis.sort((x, y) => y.ranking - x.ranking)
			vm.eventBus.pcp.adjustAxisPosition()
			// vm.eventBus.sld.adjustPosition()
		},

		updateSelection(ctn_cells, ctn_box) {
			let vm = this
			ctn_cells.children.forEach(c => {
				let pass = ctn_box.children.some(box => {
					return vm.collision(c, box)
				})
				if( c.data != undefined ){
					if ((pass && !c.data.mask && c.tint != 0xCCCCCC) || (c.singSelected || c.neibor)) {
						c.texture = vm.cellTextureSelected
						c.selected = true
					} else {
						c.texture = vm.cellTexture
						c.selected = false
					}
				}

			})
		},

		setBox(ctn_cells, ctn_box){
			var vm = this
			ctn_cells.children.forEach(c => {
				ctn_box.children.some(box => {
					if(vm.collision(c, box))
						c.box = box
				})
			})
		},

		init() {
			var vm = this

			vm.cellSize = 15
			vm.padding = 30
			vm.gap_size = (vm.padding + vm.cellSize * 7)
			vm.dim_font = 'Arial'
			vm.dim_font_size = 14
			// vm.selectionBoxColor = 0x0287e3
			vm.selectionBoxColor = 0xFFFFFF
			
			vm.keyCode = {
				67:'c', 
				76:'l', 
				68:'d',
				72:'h',
			}
			vm.keyDown = undefined
			vm.highLightBlock = false
			vm.notice = {
				c: "Color Similarity",
				d: "Dimension Similar",
				l: "Latent Space Similar",
			}
			vm.root_colunms = []
			vm.lastCell = undefined

			vm.wrapper = new vm.$PIXI.Container()
			vm.wrapper.name = 'wrapper'
			vm.app.stage.addChild(vm.wrapper)

			vm.ctn_tooltip = new vm.$PIXI.Container()
			vm.app.stage.addChild(vm.ctn_tooltip)

			vm.tooltip = new vm.$PIXI.Container()
			vm.tooltip.alpha = 0
			vm.ctn_tooltip.addChild(vm.tooltip)

			vm.tooltip_label = new vm.$PIXI.Text("Test"
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0xFFFFFF, align : 'center'})
			vm.tooltip_box = new vm.$PIXI.Graphics()
			vm.tooltip_box.lineStyle(1, 0x0)
			vm.tooltip_box.beginFill(0x0, 0.5)
			vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
			vm.tooltip_box.endFill()
			vm.tooltip.addChild(vm.tooltip_box)
			vm.tooltip_label.x = 10
			vm.tooltip_label.y = 10
			vm.tooltip.addChild(vm.tooltip_label)

			vm.tooltip.countdown = 2
			vm.tooltip_timer = setInterval(function() {
				if (vm.tooltip.countdown <= 0) {
					vm.tooltip.alpha = 0
				} else {
					vm.tooltip.countdown -= 1
				}
			}, 1000)

			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
			g.drawRect(0, 0, vm.cellSize, vm.cellSize)
			g.endFill()
			vm.cellTexture = g.generateCanvasTexture()
			vm.cellMaskTexture = vm.maskBox().generateCanvasTexture()
			vm.cellFilterTexture = vm.filterBox().generateCanvasTexture()
			vm.cellTextureSelected = vm.selectedBox().generateCanvasTexture()

			vm.$emit('loaded')
		},

		maskBox(){
			let vm = this
			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
			g.moveTo(0,0)
			g.lineTo(0,15)
			g.lineTo(15,15)
			g.lineTo(15,0)
			g.lineTo(0,0)
			g.lineStyle(1, 0x000000)
			g.moveTo(15,0)
			g.lineTo(0,15)
			g.moveTo(7.5,0)
			g.lineTo(0,7.5)
			g.moveTo(7.5,15)
			g.lineTo(15,7.5)
			g.endFill()
			return g
		},

		selectedBox(){
			let vm = this
			let PIXI = vm.$PIXI
			let g = new PIXI.Graphics()
			g.lineStyle(1,0x000000)
			g.beginFill(0x000000)
			g.moveTo(0,0)
			g.lineTo(0,7.5)
			g.lineTo(7.5,0)
			g.lineTo(0,0)
			g.endFill()
			g.beginFill(0xFFFFFF)
			g.moveTo(0,15)
			g.lineTo(15,15)
			g.lineTo(15,0)
			g.lineTo(7.5,0)
			g.lineTo(0,7.5)
			g.lineTo(0,15)
			g.endFill()
			return g
		},

		filterBox() {
			let vm = this
			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0x000000)
			g.beginFill(0xFFFFFF)
			g.drawCircle(vm.cellSize/2, vm.cellSize/2, vm.cellSize/2)
			
			g.endFill()
			return g
		},

		addYear(year) {
			var vm = this
			let ctn_year = new vm.$PIXI.Container()
			ctn_year.name = 'ctn_year'
			let main_ctn = new vm.$PIXI.Container()
			main_ctn.name = 'main_ctn'
			ctn_year.addChild(main_ctn)
			let bg = new vm.$PIXI.Graphics()
			main_ctn.addChild(bg)
			main_ctn.mask = bg

			let ctn_box = new vm.$PIXI.Container()

			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)

			ctn_cells.interactive = true
			ctn_cells.buttonMode = true
			ctn_cells.mouseout = function(){
				if(!vm.highLightBlock){
					vm.eventBus.pcp.resetAlpha();
				}
			}

			let ctn_border = new vm.$PIXI.Container()
			ctn_border.name = 'ctn_border'
			main_ctn.addChild(ctn_border)

			let label = new vm.$PIXI.Text(String(year)
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			label.rotation = Math.PI / 2 * 3
			label.y = vm.cellSize * 7 / 2 + label.width / 2

			label.interactive = true
			label.buttonMode = true
			label.mousedown = function() {
				let sd = vm.$moment.utc().year(year).dayOfYear(1).hour(0).minute(0).second(0)
				let ed = vm.$moment.utc().year(year+1).dayOfYear(1).hour(0).minute(0).second(0).add(-1, 'second')
				vm.eventBus.calLevel = 'month'
				vm.eventBus.root.loadData('2 hour', [sd.format(date_format), ed.format(date_format)])
			}

			ctn_year.addChild(label)
			main_ctn.x = label.height

			let date = vm.$moment(String(year) + '-01-01')
			let week = 0
			let days_in_month = [[]]
			let week_of_month = 0
			let month = 0
			while(date.year() == year) {
				let x = week
				let y = date.day()

				let sp = new vm.$PIXI.Sprite(vm.cellTexture)
				sp.x = (vm.cellSize+1) * x
				sp.y = (vm.cellSize+1) * y

				vm.mapping[date.format(date_format)] = sp
				ctn_cells.addChild(sp)

				sp.selected = false
				sp.msover = false
				sp.singSelected = false
				sp.neibor = false
				sp.oldTexture = sp.texture

				sp.interactive = true
				sp.mouseover = function(e) {
					let data = sp.data
					if(!vm.highLightBlock){
						sp.msover = true
						sp.texture = vm.cellFilterTexture
						if(vm.lastCell != undefined){
							if(vm.lastCell.selected){
								vm.lastCell.texture = vm.cellTextureSelected
							}
							else{
								vm.lastCell.texture = vm.cellTexture
							}
							vm.lastCell = sp 
						}else{
							vm.lastCell = sp 
						}	
					}
					if (data && sp.tint != 0xFFFFFF) {
						sp.buttonMode = true
						vm.tooltip.alpha = 1
						vm.tooltip_label.setText(data.datetime.format(date_format))
						vm.tooltip_box.clear()
						vm.tooltip_box.lineStyle(1, 0x0)
						vm.tooltip_box.beginFill(0x0, 0.5)
						vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
						vm.tooltip_box.endFill()
						vm.tooltip.countdown = 2
					} else {
						vm.tooltip.alpha = 0
					}

					if (e.data.global.x > vm.app.renderer.width / 2) {
						vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
					} else {
						vm.tooltip.x = e.data.global.x + 30
					}
					vm.tooltip.y = e.data.global.y

					if( sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							sp.msover = true
							sp.texture = vm.cellFilterTexture
							vm.eventBus.pcp.highLight();						
						}
					}
					if(!sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							vm.eventBus.pcp.resetAlpha();
						}
					}
				}
 
				sp.mouseout = function(){
					if(!vm.highLightBlock){
						sp.msover = false;
						sp.texture = vm.cellTexture
					}
					if (sp.selected && !ctn_box.selecting) {
						if(!vm.highLightBlock){
							sp.texture = vm.cellTextureSelected
							vm.eventBus.pcp.highLight();
						}
					}
				}

				sp.mousedown = function(){
					if( sp.selected ){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})				
						ctn_box.removeChild(sp.box)
						sp.box = null
						vm.updateSelection(ctn_cells, ctn_box)
						// vm.adjustAxisOrder()
						vm.eventBus.pcp.clearData()
						vm.eventBus.pcp.updateData()
						vm.eventBus.cm.clearHighlight()
					}
				}

				sp.rightdown = function(){
					// // vm.$router.push('/TestView')	
					// vm.$router.push('/TestView')
					if(vm.keyDown != undefined && !sp.data.mask && sp.tint != 0xCCCCCC){
						vm.message = vm.notice[vm.keyDown]
						vm.color = "black"
						setTimeout(() => {
							vm.color = "white"
						}, 1500);
						sp.singSelected = true
						if(!vm.highLightBlock){
							sp.msover = true
							sp.texture = vm.cellFilterTexture
						}
						sp.selected = true
						vm.Similar(sp)
					}
					else{
						console.error("Key Invalid")
					}
				}

				days_in_month[week_of_month].push({
					x: sp.x,
					y: sp.y
				})

				if (date.day() == 6) {
					week += 1
					week_of_month += 1
					days_in_month.push([])
				}

				date.add(1, 'day')
				if (date.month() != month) {
					month = date.month()
					week_of_month = 0


					if (days_in_month[days_in_month.length-1].length == 0) {
						days_in_month = days_in_month.slice(0, days_in_month.length-1)
					}

					let x1, x2, y1, y2;
					let border = new vm.$PIXI.Graphics()
					border.lineStyle(1, 0)
					let p = days_in_month[0][0]
					border.moveTo(p.x, p.y)
					p = days_in_month[0]
					p = p[p.length-1]
					border.lineTo(p.x, p.y+vm.cellSize)

					p = days_in_month[days_in_month.length-2]
					p = p[p.length-1]
					x1 = p.x+vm.cellSize
					y1 = p.y+vm.cellSize
					p = days_in_month[days_in_month.length-1]
					p = p[p.length-1]
					x2 = p.x
					y2 = p.y+vm.cellSize
					if (y1 != y2) {
						border.lineTo(x1+1, y1+1)
						border.lineTo(x2+1, y2+1)
					}
					border.lineTo(x2 + vm.cellSize+1, y2)

					p = days_in_month[days_in_month.length-1]
					p = p[0]
					if (p.y != y2) {
						border.lineTo(p.x+vm.cellSize, p.y)
					}
					p = days_in_month[1][0]
					x1 = p.x
					y1 = p.y
					p = days_in_month[0][0]
					x2 = p.x + vm.cellSize
					y2 = p.y
					if (y1 != y2) {
						border.lineTo(x1, y1)
						border.lineTo(x2+1, y2)
					}
					border.lineTo(x2 - vm.cellSize, y2)
					ctn_border.addChild(border)

					days_in_month = [[]]
				}
			}
			bg.beginFill(0xFFFFFF)
			bg.drawRect(0, 0, ctn_cells.width, ctn_cells.height)
			bg.endFill()


			ctn_box.name = 'ctn_box'
			main_ctn.addChild(ctn_box)

			main_ctn.selectionStart = function(e) {
				let p = e.data.getLocalPosition(main_ctn)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)
				ctn_box.selecting = true
			}

			main_ctn.selectionEnd = function() {
				let box = ctn_box.children[ctn_box.children.length-1]
				if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
					ctn_box.removeChild(box)
				}
				vm.updateSelection(ctn_cells, ctn_box)
				vm.setBox(ctn_cells, ctn_box)
				vm.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
				if(!vm.highLightBlock){
					vm.eventBus.pcp.highLight();
				}
				vm.eventBus.cm.highLightSelectedPoint()
				ctn_box.selecting = false
			}	

			main_ctn.selecting = function(e) {
				if (!e.data.buttons) {
					if (ctn_box.selecting) {
						main_ctn.selectionEnd()
					}
					return
				}
				if (ctn_box.selecting) {
					if(vm.keyDown != undefined){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})
					}
					let box = ctn_box.children[ctn_box.children.length-1]
					let p = e.data.getLocalPosition(main_ctn)
					let p_topleft = {
						x: Math.min(p.x, box.start_p.x),
						y: Math.min(p.y, box.start_p.y),
					}
					let p_bottomright = {
						x: Math.max(p.x, box.start_p.x),
						y: Math.max(p.y, box.start_p.y),
					}

					box.clear()
					box.lineStyle(0.0, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.01)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.x = p_topleft.x
					box.y = p_topleft.y
					vm.updateSelection(ctn_cells, ctn_box)
				}
			}

			main_ctn.interactive = true
			main_ctn.rightdown = main_ctn.selectionStart
			main_ctn.mousemove = main_ctn.selecting
			main_ctn.rightup = main_ctn.selectionEnd

			vm.wrapper.addChild(ctn_year)
			return ctn_year
		},

		drawYear() {
			let vm = this
			let startYear = vm.eventBus.startDate.year()
			let endYear = vm.eventBus.endDate.year()

			let height = null
			for(let y=startYear;y<=endYear;++y) {
				let y_ctn = vm.addYear(y)
				y_ctn.y = (y - startYear) * vm.gap_size + vm.padding
				height = y_ctn.y + vm.gap_size
			}
			vm.app.renderer.resize(vm.app.renderer.width, height + 50)

			vm.eventBus.data.forEach(d => {
				d.cal = vm.mapping[d.datetime.format(date_format)]
				d.cal.data = d

				if (d.mask) {
					d.cal.texture = vm.cellMaskTexture
					d.cal.oldTexture = vm.cellMaskTexture
				}
			})
		},

		addMonth(year, month) {
			var vm = this
			let date = vm.eventBus.startDate.clone().month(month).date(1)

			let ctn_month = new vm.$PIXI.Container()
			ctn_month.name = 'ctn_month'
			let main_ctn = new vm.$PIXI.Container()
			main_ctn.name = 'main_ctn'
			ctn_month.addChild(main_ctn)
			let bg = new vm.$PIXI.Graphics()
			main_ctn.addChild(bg)
			main_ctn.mask = bg

			let ctn_box = new vm.$PIXI.Container()

			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)

			let ctn_label = new vm.$PIXI.Container()
			ctn_label.name = 'ctn_label'
			ctn_month.addChild(ctn_label)
			ctn_cells.interactive = true
			ctn_cells.buttonMode = true
			ctn_cells.mouseout = function(){
				if(!vm.highLightBlock){
					vm.eventBus.pcp.resetAlpha();
				}
			}

			let label = new vm.$PIXI.Text(date.format('MMM')
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})

			label.rotation = Math.PI / 2 * 3;

			label.y = vm.cellSize * 12 / 2 + label.width / 2
			ctn_month.addChild(label)
			label.interactive = true
			label.buttonMode = true
			label.mousedown = function() {
				let sd = vm.$moment.utc().year(year).month(month).date(1).hour(0).minute(0).second(0)
				let ed = vm.$moment.utc().year(year).month(month+1).date(1).hour(0).minute(0).second(0).add(-1, 'second')
				vm.eventBus.calLevel = 'day'
				vm.eventBus.root.loadData('5 minute', [sd.format(date_format), ed.format(date_format)])
			}

			main_ctn.x = label.height
			ctn_label.x = label.height

			let lastDate = null
			while(date.month() == month) {
				let x = (date.date()-1)
				let y = date.hour()/2
				let sp = new vm.$PIXI.Sprite(vm.cellTexture)
				sp.x = (vm.cellSize+1) * x
				sp.y = (vm.cellSize+1) * y
				// sp.tint = Math.random() * 0x0000FF
				vm.mapping[date.format(date_format)] = sp

				ctn_cells.addChild(sp)

				let dayOfMonth = date.date()
				if (lastDate != dayOfMonth) {
					lastDate = dayOfMonth
					let color = (date.day() === 6|| date.day() === 0)?0xff0000:0x000000
					let label = new vm.$PIXI.Text(date.format('Do')
					, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : color, align : 'center'})
					label.x = sp.x
					label.y = - 13
					label.rotation = - Math.PI / 4;
					ctn_label.addChild(label)
				}
				
				sp.interactive = true
				sp.selected = false
				sp.msover = false
				sp.singSelected = false
				sp.neibor = false
				sp.selectedTexture = vm.selectedTexture
				sp.oldTexture = sp.texture

				sp.mouseover = function(e) {
					if(!vm.highLightBlock){
						sp.msover = true
						sp.texture = vm.cellFilterTexture
						if(vm.lastCell != undefined){
							if(vm.lastCell.selected){
								vm.lastCell.texture = vm.cellTextureSelected
							}
							else{
								vm.lastCell.texture = vm.cellTexture
							}
							vm.lastCell = sp 
						}else{
							vm.lastCell = sp 
						}	
					}
					let data = sp.data
					if (data && sp.tint != 0xFFFFFF) {
						sp.buttonMode = true
						vm.tooltip.alpha = 1
						vm.tooltip_label.setText(data.datetime.format(date_format))
						vm.tooltip_box.clear()
						vm.tooltip_box.lineStyle(1, 0x0)
						vm.tooltip_box.beginFill(0x0, 0.5)
						vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
						vm.tooltip_box.endFill()
						vm.tooltip.countdown = 2
					} else {
						vm.tooltip.alpha = 0
					}

					if (e.data.global.x > vm.app.renderer.width / 2) {
						vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
					} else {
						vm.tooltip.x = e.data.global.x + 30
					}
					vm.tooltip.y = e.data.global.y
					if( sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							sp.msover = true
							sp.texture = vm.cellFilterTexture
							vm.eventBus.pcp.highLight();
						}
					}
					if(!sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							vm.eventBus.pcp.resetAlpha();
						}
					}
				}

				sp.mouseout = function(){
					if(!vm.highLightBlock){
						sp.msover = false;
						sp.texture = vm.cellTexture
					}
					if (sp.selected && !ctn_box.selecting) {
						if(!vm.highLightBlock){
							sp.texture = vm.cellTextureSelected
							vm.eventBus.pcp.highLight();
						}
					}
				}

				sp.mousedown = function(){
					if( sp.selected ){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})
						ctn_box.removeChild(sp.box)
						sp.box = null
						vm.updateSelection(ctn_cells, ctn_box)
						vm.adjustAxisOrder()
						vm.eventBus.pcp.clearData()
						vm.eventBus.pcp.updateData()
						vm.eventBus.cm.clearHighlight()
					}
				}
				
				sp.rightdown = function(){
					if(vm.keyDown != undefined && !sp.data.mask && sp.tint != 0xCCCCCC){
						vm.message = vm.notice[vm.keyDown]
						vm.color = "black"
						setTimeout(() => {
							vm.color = "white"
						}, 1500);
						sp.singSelected = true
						sp.msover = true
						sp.texture = vm.cellFilterTexture
						sp.selected = true
						vm.Similar(sp)
					}
					else{
						console.error("No Key press")
					}
				}
				date.add(2, 'hour')
			}
			bg.beginFill(0xFFFFFF)
			bg.drawRect(0, 0, ctn_cells.width, ctn_cells.height)
			bg.endFill()

			ctn_box.name = 'ctn_box'
			main_ctn.addChild(ctn_box)

			main_ctn.selectionStart = function(e) {
				let p = e.data.getLocalPosition(main_ctn)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)
				ctn_box.selecting = true
			}

			main_ctn.selectionEnd = function() {
				let box = ctn_box.children[ctn_box.children.length-1]
				if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
					ctn_box.removeChild(box)
				}
				vm.updateSelection(ctn_cells, ctn_box)
				vm.setBox(ctn_cells, ctn_box)
				vm.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
				if(!vm.highLightBlock){
					vm.eventBus.pcp.highLight();
				}
				vm.eventBus.cm.highLightSelectedPoint()
				ctn_box.selecting = false
			}

			main_ctn.selecting = function(e) {
				if (!e.data.buttons) {
					if (ctn_box.selecting) {
						main_ctn.selectionEnd()
					}
					return
				}
				if (ctn_box.selecting) {
					if(vm.keyDown != undefined){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})
					}
					let box = ctn_box.children[ctn_box.children.length-1]
					let p = e.data.getLocalPosition(main_ctn)
					let p_topleft = {
						x: Math.min(p.x, box.start_p.x),
						y: Math.min(p.y, box.start_p.y),
					}
					let p_bottomright = {
						x: Math.max(p.x, box.start_p.x),
						y: Math.max(p.y, box.start_p.y),
					}

					box.clear()
					box.lineStyle(0.0, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.01)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.x = p_topleft.x
					box.y = p_topleft.y
					vm.updateSelection(ctn_cells, ctn_box)
				}
			}

			main_ctn.interactive = true
			main_ctn.rightdown = main_ctn.selectionStart
			main_ctn.mousemove = main_ctn.selecting
			main_ctn.rightup = main_ctn.selectionEnd


			vm.wrapper.addChild(ctn_month)
			return ctn_month
		},

		drawMonth() {
			var vm = this
			let year = vm.eventBus.startDate.year()
			let startMonth = vm.eventBus.startDate.month()
			let endMonth = vm.eventBus.endDate.month()

			let gap_size = (vm.padding + vm.cellSize * 13)

			let title = new vm.$PIXI.Text("Back: " + String(year)
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			vm.wrapper.addChild(title)
			title.interactive = true
			title.buttonMode = true
			title.mousedown = function() {
				vm.goLastZoom()
			}

			let height = null
			for(let m=startMonth;m<=endMonth;++m) {
				let m_ctn = vm.addMonth(year, m)

				if(m%2 === 1){
					m_ctn.y = (m - startMonth -1)/2 * gap_size  + vm.padding + 20
					m_ctn.x = 31 * vm.cellSize + 60
				}
				else{
					m_ctn.y = (m - startMonth)/2 * gap_size  + vm.padding + 20
				}
				height = m_ctn.y + gap_size
			}
			vm.app.renderer.resize(vm.app.renderer.width, height + 50)

			vm.eventBus.data.forEach(d => {
				d.cal = vm.mapping[d.datetime.format(date_format)]
				if (d.cal) {
					d.cal.data = d
				}
				if (d.mask) {
					d.cal.texture = vm.cellMaskTexture
					d.cal.oldTexture = vm.cellMaskTexture
				}
			})
		},

		addDay(year, month, day) {
			var vm = this
			let date = vm.eventBus.startDate.clone().date(day)

			let ctn_day = new vm.$PIXI.Container()
			ctn_day.name = 'ctn_day'
			let main_ctn = new vm.$PIXI.Container()
			main_ctn.name = 'main_ctn'
			ctn_day.addChild(main_ctn)
			let bg = new vm.$PIXI.Graphics()
			main_ctn.addChild(bg)
			main_ctn.mask = bg

			let ctn_box = new vm.$PIXI.Container()

			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)
			ctn_cells.interactive = true
			ctn_cells.buttonMode = true
			ctn_cells.mouseout = function(){
				if(!vm.highLightBlock){
					vm.eventBus.pcp.resetAlpha();
				}
			}

			let ctn_label = new vm.$PIXI.Container()
			ctn_label.name = 'ctn_label'
			ctn_day.addChild(ctn_label)

			let color = (date.day() === 6|| date.day() === 0)?0xff0000:0x000000
			let label = new vm.$PIXI.Text(date.format('MMM-Do-ddd')
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : color, align : 'center'})
			label.rotation = Math.PI / 2 * 3
			label.y = vm.cellSize * 6 / 2 + label.width / 2
			ctn_day.addChild(label)
			main_ctn.x = label.height
			ctn_label.x = label.height

			let lastHour = null
			while(date.date() == day) {
				let x = (date.hour()) * 2 + (date.minute() >= 30)
				let y = ((date.minute()/5) % 6)

				let sp = new vm.$PIXI.Sprite(vm.cellTexture)
				sp.x = (vm.cellSize+1) * x
				sp.y = (vm.cellSize+1) * y
				// sp.tint = Math.random() * 0x0000FF
				vm.mapping[date.format(date_format)] = sp
				ctn_cells.addChild(sp)

				let hourOfDay = date.hour()
				if (lastHour != hourOfDay) {
					lastHour = hourOfDay
					let label = new vm.$PIXI.Text(date.format('HH')
					, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
					label.x = sp.x
					label.y = -label.height - 3
					ctn_label.addChild(label)
				}


				sp.interactive = true
				sp.selected = false
				sp.msover = false
				sp.singSelected = false
				sp.neibor = false
				sp.oldTexture = sp.texture

				sp.mouseover = function(e) {
					if(!vm.highLightBlock){
						sp.msover = true
						sp.texture = vm.cellFilterTexture
						if(vm.lastCell != undefined){
							if(vm.lastCell.selected){
								vm.lastCell.texture = vm.cellTextureSelected
							}
							else{
								vm.lastCell.texture = vm.cellTexture
							}
							vm.lastCell = sp 
						}else{
							vm.lastCell = sp 
						}	
					}
					let data = sp.data
					if (data) {
						vm.tooltip.alpha = 1
						vm.tooltip_label.setText(data.datetime.format(date_format))
						vm.tooltip_box.clear()
						vm.tooltip_box.lineStyle(1, 0x0)
						vm.tooltip_box.beginFill(0x0, 0.5)
						vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
						vm.tooltip_box.endFill()
						vm.tooltip.countdown = 2
					} else {
						vm.tooltip.alpha = 0
					}

					if (e.data.global.x > vm.app.renderer.width / 2) {
						vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
					} else {
						vm.tooltip.x = e.data.global.x + 30
					}
					vm.tooltip.y = e.data.global.y
					if( sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							sp.msover = true
							sp.texture = vm.cellFilterTexture
							vm.eventBus.pcp.highLight();
						}
					}
					if(!sp.selected && !ctn_box.selecting){
						if(!vm.highLightBlock){
							vm.eventBus.pcp.resetAlpha();
						}
					}
				}

				sp.mouseout = function(){
					if(!vm.highLightBlock){
						sp.msover = false;
						sp.texture = vm.cellTexture
					}
					if (sp.selected && !ctn_box.selecting) {
						if(!vm.highLightBlock){
							sp.texture = vm.cellTextureSelected
							vm.eventBus.pcp.highLight();
						}
					}
				}

				sp.mousedown = function(){
					if( sp.selected ){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})	
						ctn_box.removeChild(sp.box)
						sp.box = null
						vm.updateSelection(ctn_cells, ctn_box)
						vm.adjustAxisOrder()
						vm.eventBus.pcp.clearData()
						vm.eventBus.pcp.updateData()
						vm.eventBus.cm.clearHighlight()
					}
				}

				sp.rightdown = function(){
					if(vm.keyDown != undefined && !sp.data.mask && sp.tint != 0xCCCCCC){
						vm.message = vm.notice[vm.keyDown]
						vm.color = "black"
						setTimeout(() => {
							vm.color = "white"
						}, 1500);
						sp.singSelected = true
						if(!vm.highLightBlock){
							sp.msover = true
							sp.texture = vm.cellFilterTexture
						}
						sp.selected = true
						vm.Similar(sp)
					}
					else{
						console.error("Key Invalid")
					}
				}

				date.add(5, 'minute')
			}

			bg.beginFill(0xFFFFFF)
			bg.drawRect(0, 0, ctn_cells.width, ctn_cells.height)
			bg.endFill()

			// let ctn_box = new vm.$PIXI.Container()
			ctn_box.name = 'ctn_box'
			main_ctn.addChild(ctn_box)

			main_ctn.selectionStart = function(e) {
				let p = e.data.getLocalPosition(main_ctn)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)
				ctn_box.selecting = true
			}

			main_ctn.selectionEnd = function() {
				let box = ctn_box.children[ctn_box.children.length-1]
				if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
					ctn_box.removeChild(box)
				}
				vm.updateSelection(ctn_cells, ctn_box)
				vm.setBox(ctn_cells, ctn_box)
				vm.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
				if(!vm.highLightBlock){
					vm.eventBus.pcp.highLight();
				}
				vm.eventBus.cm.highLightSelectedPoint()
				ctn_box.selecting = false
			}

			main_ctn.selecting = function(e) {
				if (!e.data.buttons) {
					if (ctn_box.selecting) {
						main_ctn.selectionEnd()
					}
					return
				}
				if (ctn_box.selecting) {
					if(vm.keyDown != undefined){
						vm.eventBus.data.forEach( d => {
							d.cal.singSelected = false
							d.cal.neibor = false	
							d.cal.texture = vm.cellTexture
							d.cal.selected = false
						})
					}
					let box = ctn_box.children[ctn_box.children.length-1]
					let p = e.data.getLocalPosition(main_ctn)
					let p_topleft = {
						x: Math.min(p.x, box.start_p.x),
						y: Math.min(p.y, box.start_p.y),
					}
					let p_bottomright = {
						x: Math.max(p.x, box.start_p.x),
						y: Math.max(p.y, box.start_p.y),
					}

					box.clear()
					box.lineStyle(0.0, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.01)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.x = p_topleft.x
					box.y = p_topleft.y
					vm.updateSelection(ctn_cells, ctn_box)
				}
			}

			main_ctn.interactive = true
			main_ctn.rightdown = main_ctn.selectionStart
			main_ctn.mousemove = main_ctn.selecting
			main_ctn.rightup = main_ctn.selectionEnd


			vm.wrapper.addChild(ctn_day)
			return ctn_day
		},

		drawDay() {
			var vm = this
			let year = vm.eventBus.startDate.year()
			let month = vm.eventBus.startDate.month()
			let startDay = vm.eventBus.startDate.date()
			let endDay = vm.eventBus.endDate.date()

			let title = new vm.$PIXI.Text("Back: " + vm.eventBus.startDate.format('YYYY-MM')
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			vm.wrapper.addChild(title)
			title.interactive = true
			title.buttonMode = true
			title.mousedown = function() {
				vm.goLastZoom()
			}

			let height = null
			for(let d=startDay;d<=endDay;++d) {
				let d_ctn = vm.addDay(year, month, d)
				d_ctn.y = (d - startDay) * vm.gap_size + vm.padding + 20
				height = d_ctn.y + vm.gap_size
			}
			vm.app.renderer.resize(vm.app.renderer.width, height + 50)

			vm.eventBus.data.forEach(d => {
				d.cal = vm.mapping[d.datetime.format(date_format)]
				d.cal.data = d

				if (d.mask) {
					d.cal.texture = vm.cellMaskTexture
					d.cal.oldTexture = vm.cellMaskTexture
				}
			})
		},

		updateData() {
			let vm = this
			vm.mapping = {}
			if (vm.eventBus.calLevel == 'year') {
				vm.drawYear()
			} else if (vm.eventBus.calLevel == 'month') {
				vm.drawMonth()
			} else if (vm.eventBus.calLevel == 'day') {
				vm.drawDay()
			}

			vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
		},

		clearData() {
			var vm = this
			vm.wrapper.removeChildren()
		},

		switchMode(mode) {
			var vm = this
			if (vm.mode == 'tooltip') {
				vm.tooltip.alpha = 0
			}
			vm.mode = mode
		},

		hexToRgb(hex){
			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/.exec(hex)
			return result? {   
				r:parseInt(result[1], 16),
				g:parseInt(result[2], 16),
				b:parseInt(result[3], 16),
			}:undefined;
		},

		zeroPadding(hex){
			hex = "000000"+hex 
			return hex.substring(hex.length-6,hex.length); 
		},

		Similar(selectedCell){
			let vm = this
			let cellDistance = []
			let item1 = vm.similarProcess(selectedCell)
			let distanceMethod = {
				c:vm.colorDis,
				d:vm.dimensionDis,
				l:vm.colorPointDis
			}
			vm.eventBus.data.forEach(d => {
				let item2 = vm.similarProcess(d,false)
				cellDistance.push({dis:distanceMethod[vm.keyDown](item1,item2),cell:d.cal})
			})
			cellDistance.sort((a,b) => {
				return a.dis - b.dis
			})
			cellDistance = cellDistance.slice(0,30)	
			cellDistance.forEach( item => {
				item.cell.texture = vm.cellTextureSelected
				item.cell.selected = true
				item.cell.neibor = true
			})
		},

		similarProcess(item,single=true){
			let vm = this
			let process = {
				c:single?vm.hexToRgb(vm.zeroPadding(item.tint.toString(16))):vm.hexToRgb(vm.zeroPadding(item.cal.tint.toString(16))),
				d:single?item.data.raw.slice(4):item.raw.slice(4),
				l:single?item.data.raw.slice(0,2):item.raw.slice(0,2),
			}
			return process[vm.keyDown]
		},

		colorDis(rgb1, rgb2){
			let r = rgb1.r - rgb2.r
			let g = rgb1.g - rgb2.g
			let b = rgb1.b - rgb2.b
			return Math.sqrt(r*r+g*g+b*b)
		},

		dimensionDis(item1, item2){
			let sum = []
			let vm = this
			let pcp_axis = vm.eventBus.pcp.state.axis
			vm.root_colunms.forEach(item => {
				let i = item.idx
				let dis = pcp_axis[i].extent[1]-pcp_axis[i].extent[0]
				let a = item1[i]/dis
				let b = item2[i]/dis
				sum.push(Math.pow(a-b,2))
			});
			// item1.forEach((dim, i) => {
			// 	if(vm.eventBus.pcp.state.axis[i].disabled === false){
			// 		sum.push(Math.pow(dim-item2[i],2))
			// 	}
			// })
			sum = sum.reduce((a,b) => {return a+b})
			return Math.sqrt(sum)
		},
		
		colorPointDis(item1, item2){
			let a = Math.pow((item1[0]-item2[0]),2)
			let b = Math.pow((item1[1]-item2[1]),2)
			return Math.sqrt(a+b)
		},

		checkKeydown(key){
			let vm = this
			vm.keyDown = vm.keyCode[key.keyCode]
			if(vm.keyDown === 'h'){
				vm.highLightBlock=!vm.highLightBlock
			}
		},
		
		KeyUp(){
			let vm = this 
			vm.keyDown = undefined
		},

		getTrainedColumns(){
			let vm = this
			let start_idx = vm.eventBus.date_idx + 1
			let colunms = vm.eventBus.columns.slice(start_idx)
			let root_colunms = vm.eventBus.root.columns_train 

			colunms.forEach((item,i) => {
				if(root_colunms.includes(item)){
					vm.root_colunms.push({idx:i,name:item})
				}
			})
		}
	},
	mounted() {
		var vm = this;
		this.$refs.home.oncontextmenu = ()=>{return false ;};
		// vm.mode = 'tooltip'
		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		vm.app.renderer.resize(10, 0);

		window.addEventListener('resize', vm.handleResize)
		window.addEventListener("keydown",vm.checkKeydown)
		window.addEventListener("keyup", vm.KeyUp);
		vm.handleResize()
		vm.$refs.home.appendChild(vm.app.view)

		vm.init()
	},
	beforeDestroy() {
		var vm = this;
		window.removeEventListener('resize', vm.handleResize)
		window.removeEventListener("keydown",vm.checkKeydown)
		window.removeEventListener("keyup", vm.KeyUp);
		if (vm.app !== undefined) {
			vm.app.destroy()
		}
		if (vm.tooltip_timer) {
			clearInterval(vm.tooltip_timer)
		}
	}
}
</script>

<style scoped>
.cal-wrapper {
	width: 100%;
	/* height:500px; */
	min-height: 200px;
	/* border: 1px black solid; */
	overflow-y: scroll;
}
</style>
