<template>

<div id="home" ref="home">
</div>

</template>

<script>
const date_format = 'YYYY-MM-DD HH:mm:ss'
export default {
	components: {},
	methods: {
		handleResize() {
			var vm = this;
			let width = vm.$refs.home.clientWidth
			vm.app.renderer.resize(width, vm.app.renderer.height);
			if (vm.wrapper) {
				vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
			}
		},

		collision(rect1, rect2) {
			if (rect1.x < rect2.x + rect2.width &&
				rect1.x + rect1.width > rect2.x &&
				rect1.y < rect2.y + rect2.height &&
				rect1.height + rect1.y > rect2.y) {
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
			vm.eventBus.root.loadData(param.interval, param.startDate, param.endDate)
		},

		adjustAxisOrder() {
			var vm = this
			let boxes = []
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
			vm.eventBus.sld.adjustPosition()
		},

		updateSelection(ctn_cells, ctn_box) {
			var vm = this
			ctn_cells.children.forEach(c => {
				let pass = ctn_box.children.some(box => {
					return vm.collision(c, box)
				})
				if (pass) {
					c.texture = vm.cellTextureSelected
					c.selected = true
				} else {
					c.texture = vm.cellTexture
					c.selected = false
				}
			})
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


			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)

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
				vm.eventBus.root.loadData('2 hour', sd.format(date_format), ed.format(date_format))
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
				// sp.tint = Math.random() * 0x0000FF
				vm.mapping[date.format(date_format)] = sp
				ctn_cells.addChild(sp)

				sp.interactive = true
				sp.mouseover = function(e) {
					if (vm.mode == 'tooltip') {
						let data = sp.data
						if (data) {
							vm.tooltip.alpha = 1
							vm.tooltip_label.setText(data.datetime.format(date_format))
							vm.tooltip_box.clear()
							vm.tooltip_box.lineStyle(1, 0x0)
							vm.tooltip_box.beginFill(0x0, 0.5)
							vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
							vm.tooltip_box.endFill()
						} else {
							vm.tooltip.alpha = 0
						}

						if (e.data.global.x > vm.app.renderer.width / 2) {
							vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
						} else {
							vm.tooltip.x = e.data.global.x + 30
						}
						vm.tooltip.y = e.data.global.y
						sp.oldTexture = sp.texture
						sp.texture = vm.cellTextureSelected
					}
				}
				sp.mouseout = function() {
					if (vm.mode == 'tooltip') {
						sp.texture = sp.oldTexture
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

			let ctn_box = new vm.$PIXI.Container()
			ctn_box.name = 'ctn_box'
			main_ctn.addChild(ctn_box)

			main_ctn.selectionStart = function(e) {
				if (vm.mode != 'box_select') {
					return
				}
				let p = e.data.getLocalPosition(main_ctn)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)

				box.interactive = true
				box.mousedown = function() {
					ctn_box.removeChild(box)
				}

				ctn_box.selecting = true
			}

			main_ctn.selectionEnd = function() {
				if (vm.mode != 'box_select') {
					return
				}
				let box = ctn_box.children[ctn_box.children.length-1]
				if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
					ctn_box.removeChild(box)
				}
				vm.updateSelection(ctn_cells, ctn_box)
				
				vm.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
				ctn_box.selecting = false
			}

			main_ctn.selecting = function(e) {
				if (vm.mode != 'box_select') {
					return
				}
				if (!e.data.buttons) {
					if (ctn_box.selecting) {
						main_ctn.selectionEnd()
					}
					return
				}
				if (ctn_box.selecting) {
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
					box.lineStyle(1, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.5)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.x = p_topleft.x
					box.y = p_topleft.y
					vm.updateSelection(ctn_cells, ctn_box)
				}
			}
			
			main_ctn.interactive = true
			main_ctn.mousedown = main_ctn.selectionStart
			main_ctn.mousemove = main_ctn.selecting
			main_ctn.mouseup = main_ctn.selectionEnd

			vm.wrapper.addChild(ctn_year)
			return ctn_year
		},

		init() {
			var vm = this

			vm.cellSize = 15
			vm.padding = 30
			vm.gap_size = (vm.padding + vm.cellSize * 7)
			vm.dim_font = 'Arial'
			vm.dim_font_size = 14
			vm.selectionBoxColor = 0x0287e3
			
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


			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
			g.drawRect(0, 0, vm.cellSize, vm.cellSize)
			g.endFill()
			vm.cellTexture = g.generateCanvasTexture()

			g.clear()
			g.lineStyle(1, 0x000000)
			g.beginFill(0xFFFFFF)
			g.drawRect(0, 0, vm.cellSize, vm.cellSize)
			g.endFill()
			vm.cellTextureSelected = g.generateCanvasTexture()

			vm.$emit('loaded')
		},

		drawYear() {
			var vm = this
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


			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)

			let ctn_label = new vm.$PIXI.Container()
			ctn_label.name = 'ctn_label'
			ctn_month.addChild(ctn_label)

			let label = new vm.$PIXI.Text(date.format('MMM')
			, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			label.rotation = Math.PI / 2 * 3
			label.y = vm.cellSize * 6 / 2 + label.width / 2
			
			ctn_month.addChild(label)

			// label.interactive = true
			// label.buttonMode = true
			// label.mousedown = function() {
			// 	let sd = vm.$moment.utc().year(year).month(month).date(1).hour(0).minute(0).second(0)
			// 	let ed = vm.$moment.utc().year(year).month(month+1).date(1).hour(0).minute(0).second(0).add(-1, 'second')
			// 	vm.eventBus.calLevel = 'day'
			// 	vm.eventBus.root.loadData('5 minute', sd.format(date_format), ed.format(date_format))
			// }

			// main_ctn.x = label.height
			// ctn_label.x = label.height

			// let lastDate = null
			// while(date.month() == month) {
			// 	let x = (date.date()-1) * 2 + (date.hour() >= 12)
			// 	let y = ((date.hour() / 2) % 6)

			// 	let sp = new vm.$PIXI.Sprite(vm.cellTexture)
			// 	sp.x = (vm.cellSize+1) * x
			// 	sp.y = (vm.cellSize+1) * y
			// 	// sp.tint = Math.random() * 0x0000FF
			// 	vm.mapping[date.format(date_format)] = sp
				
			// 	ctn_cells.addChild(sp)

			// 	let dayOfMonth = date.date()
			// 	if (lastDate != dayOfMonth) {
			// 		lastDate = dayOfMonth
			// 		let label = new vm.$PIXI.Text(date.format('Do')
			// 		, {fontFamily : vm.dim_font, fontSize: vm.dim_font_size, fill : 0x000000, align : 'center'})
			// 		label.x = sp.x
			// 		label.y = -label.height - 3
			// 		ctn_label.addChild(label)
			// 	}


			// 	sp.interactive = true
			// 	sp.mouseover = function(e) {
			// 		if (vm.mode == 'tooltip') {
			// 			let data = sp.data
			// 			if (data) {
			// 				vm.tooltip.alpha = 1
			// 				vm.tooltip_label.setText(data.datetime.format(date_format))
			// 				vm.tooltip_box.clear()
			// 				vm.tooltip_box.lineStyle(1, 0x0)
			// 				vm.tooltip_box.beginFill(0x0, 0.5)
			// 				vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
			// 				vm.tooltip_box.endFill()
			// 			} else {
			// 				// vm.tooltip.alpha = 0
			// 			}

			// 			if (e.data.global.x > vm.app.renderer.width / 2) {
			// 				vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
			// 			} else {
			// 				vm.tooltip.x = e.data.global.x + 30
			// 			}
			// 			vm.tooltip.y = e.data.global.y
			// 			sp.oldTexture = sp.texture
			// 			sp.texture = vm.cellTextureSelected
			// 		}
			// 	}
			// 	sp.mouseout = function() {
			// 		if (vm.mode == 'tooltip') {
			// 			sp.texture = sp.oldTexture
			// 		}
			// 	}

			// 	date.add(2, 'hour')
			// }

			// bg.beginFill(0xFFFFFF)
			// bg.drawRect(0, 0, ctn_cells.width, ctn_cells.height)
			// bg.endFill()

			// let ctn_box = new vm.$PIXI.Container()
			// ctn_box.name = 'ctn_box'
			// main_ctn.addChild(ctn_box)

			// main_ctn.selectionStart = function(e) {
			// 	if (vm.mode != 'box_select') {
			// 		return
			// 	}
			// 	let p = e.data.getLocalPosition(main_ctn)
			// 	let box = new vm.$PIXI.Graphics()
			// 	box.x = p.x
			// 	box.y = p.y
			// 	box.start_p = p
			// 	box.clear()
			// 	ctn_box.addChild(box)

			// 	box.interactive = true
			// 	box.mousedown = function() {
			// 		ctn_box.removeChild(box)
			// 	}

			// 	ctn_box.selecting = true
			// }

			// main_ctn.selectionEnd = function() {
			// 	if (vm.mode != 'box_select') {
			// 		return
			// 	}
			// 	let box = ctn_box.children[ctn_box.children.length-1]
			// 	if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
			// 		ctn_box.removeChild(box)
			// 	}
			// 	vm.updateSelection(ctn_cells, ctn_box)
				
			// 	vm.adjustAxisOrder()
			// 	vm.eventBus.pcp.clearData()
			// 	vm.eventBus.pcp.updateData()
			// 	ctn_box.selecting = false
			// }

			// main_ctn.selecting = function(e) {
			// 	if (vm.mode != 'box_select') {
			// 		return
			// 	}
			// 	if (!e.data.buttons) {
			// 		if (ctn_box.selecting) {
			// 			main_ctn.selectionEnd()
			// 		}
			// 		return
			// 	}
			// 	if (ctn_box.selecting) {
			// 		let box = ctn_box.children[ctn_box.children.length-1]
			// 		let p = e.data.getLocalPosition(main_ctn)
			// 		let p_topleft = {
			// 			x: Math.min(p.x, box.start_p.x),
			// 			y: Math.min(p.y, box.start_p.y),
			// 		}
			// 		let p_bottomright = {
			// 			x: Math.max(p.x, box.start_p.x),
			// 			y: Math.max(p.y, box.start_p.y),
			// 		}

			// 		box.clear()
			// 		box.lineStyle(1, vm.selectionBoxColor)
			// 		box.beginFill(vm.selectionBoxColor, 0.5)
			// 		box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
			// 		box.endFill()
			// 		box.x = p_topleft.x
			// 		box.y = p_topleft.y
			// 		vm.updateSelection(ctn_cells, ctn_box)
			// 	}
			// }
			
			// main_ctn.interactive = true
			// main_ctn.mousedown = main_ctn.selectionStart
			// main_ctn.mousemove = main_ctn.selecting
			// main_ctn.mouseup = main_ctn.selectionEnd


			vm.wrapper.addChild(ctn_month)
			return ctn_month
		},

		drawMonth() {
			var vm = this
			let year = vm.eventBus.startDate.year()
			let startMonth = vm.eventBus.startDate.month()
			let endMonth = vm.eventBus.endDate.month()

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
				m_ctn.y = (m - startMonth) * vm.gap_size + vm.padding + 20
				height = m_ctn.y + vm.gap_size
			}
			vm.app.renderer.resize(vm.app.renderer.width, height + 50)

			vm.eventBus.data.forEach(d => {
				d.cal = vm.mapping[d.datetime.format(date_format)]
				if (d.cal) {
					d.cal.data = d
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


			let ctn_cells = new vm.$PIXI.Container()
			ctn_cells.name = 'ctn_cells'
			main_ctn.addChild(ctn_cells)

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
				sp.mouseover = function(e) {
					if (vm.mode == 'tooltip') {
						let data = sp.data
						if (data) {
							vm.tooltip.alpha = 1
							vm.tooltip_label.setText(data.datetime.format(date_format))
							vm.tooltip_box.clear()
							vm.tooltip_box.lineStyle(1, 0x0)
							vm.tooltip_box.beginFill(0x0, 0.5)
							vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
							vm.tooltip_box.endFill()
						} else {
							vm.tooltip.alpha = 0
						}

						if (e.data.global.x > vm.app.renderer.width / 2) {
							vm.tooltip.x = e.data.global.x - 30 - vm.tooltip.width
						} else {
							vm.tooltip.x = e.data.global.x + 30
						}
						vm.tooltip.y = e.data.global.y
						sp.oldTexture = sp.texture
						sp.texture = vm.cellTextureSelected
					}
				}
				sp.mouseout = function() {
					if (vm.mode == 'tooltip') {
						sp.texture = sp.oldTexture
					}
				}

				date.add(5, 'minute')
			}

			bg.beginFill(0xFFFFFF)
			bg.drawRect(0, 0, ctn_cells.width, ctn_cells.height)
			bg.endFill()

			let ctn_box = new vm.$PIXI.Container()
			ctn_box.name = 'ctn_box'
			main_ctn.addChild(ctn_box)

			main_ctn.selectionStart = function(e) {
				if (vm.mode != 'box_select') {
					return
				}
				let p = e.data.getLocalPosition(main_ctn)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)

				box.interactive = true
				box.mousedown = function() {
					ctn_box.removeChild(box)
				}

				ctn_box.selecting = true
			}

			main_ctn.selectionEnd = function() {
				if (vm.mode != 'box_select') {
					return
				}
				let box = ctn_box.children[ctn_box.children.length-1]
				if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 4) {
					ctn_box.removeChild(box)
				}
				vm.updateSelection(ctn_cells, ctn_box)
				
				vm.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
				ctn_box.selecting = false
			}

			main_ctn.selecting = function(e) {
				if (vm.mode != 'box_select') {
					return
				}
				if (!e.data.buttons) {
					if (ctn_box.selecting) {
						main_ctn.selectionEnd()
					}
					return
				}
				if (ctn_box.selecting) {
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
					box.lineStyle(1, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.5)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.x = p_topleft.x
					box.y = p_topleft.y
					vm.updateSelection(ctn_cells, ctn_box)
				}
			}
			
			main_ctn.interactive = true
			main_ctn.mousedown = main_ctn.selectionStart
			main_ctn.mousemove = main_ctn.selecting
			main_ctn.mouseup = main_ctn.selectionEnd


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
			})
		},

		updateData() {
			var vm = this
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
		}
	},
	mounted() {
		var vm = this;
		vm.mode = 'box_select'
		vm.app = new vm.$PIXI.Application({
			autoResize: true,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		vm.app.renderer.view.style.display = 'block'

		window.addEventListener('resize', vm.handleResize)
		vm.handleResize()
		vm.$refs.home.appendChild(vm.app.view)

		vm.init()
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
	width: 100%;
	min-height: 200px;
	/* border: 1px black solid; */
	overflow: hidden;
}
</style>
