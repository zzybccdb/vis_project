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
        
		clearData() {
			var vm = this
			vm.wrapper.removeChildren()
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
			vm.trainedColunms.forEach(item => {
				let i = item.idx
				let dis = pcp_axis[i].extent[1]-pcp_axis[i].extent[0]
				let a = item1[i]/dis
				let b = item2[i]/dis
				sum.push(Math.pow(a-b,2))
			});
			sum = sum.reduce((a,b) => {return a+b})
			return Math.sqrt(sum)
		},
		        
        updateData() {
			var vm = this
            vm.drawCalendar(vm.eventBus.calLevel)
        },
        
		init() {
            let vm = this
            // PIXI attribute init
            vm.PIXIinit()  
            // config calendar view value
            vm.calendarClass = {
                'year': vm.yearChart,
                'month': vm.monthChart,
                'day': vm.dayChart,
            }
            // keyboads setting 
            vm.keyboardSetting()
            // get the training colunms            
            vm.trainedColunms = undefined
            // setting the event Listener
            vm.eventListener()
            // handling the resize event
            vm.handleResize()
            // disable chrome page right click event
            vm.$refs.home.oncontextmenu = ()=>{return false ;};
			vm.$emit('loaded')
        },
        
        PIXIinit(){
            let vm = this
            // init a PIXI Application
            vm.app = new vm.$PIXI.Application({
                autoResize: true,
                backgroundColor: 0xFFFFFF,
                antialias: true,
            })
            vm.app.renderer.resize(10, 0);
            vm.$refs.home.appendChild(vm.app.view)
            // cell style
            vm.cellSize = 15
            // selection box style
            vm.selectionBoxColor = 0xFFFFFF
            // calendar style
			vm.padding = 30
            vm.gap_size = (vm.padding + vm.cellSize * 7)
            // pixi font style
			vm.pixi_font = 'Arial'
            vm.pixi_font_size = 14
            // record the last selected cell in order to change it attribute
            vm.lastSelectedCell = undefined
            // wrapper is the main container of this calendar view 
            vm.wrapper = new vm.$PIXI.Container()
			vm.wrapper.name = 'wrapper'
            vm.app.stage.addChild(vm.wrapper)
            // ctn_tooltip is the tooltip container
            vm.ctn_tooltip = new vm.$PIXI.Container()
            vm.app.stage.addChild(vm.ctn_tooltip)
            // tooltip setting
            vm.tooltipSetting()
            // setting the texture
            vm.textureSetting()
        },
        
        textureSetting(){
            let vm = this
			vm.cellTexture = vm.initialTexture().generateCanvasTexture()
			vm.cellMaskTexture = vm.maskCellTexture().generateCanvasTexture()
			vm.cellFilterTexture = vm.filterCellTexture().generateCanvasTexture()
            vm.cellTextureSelected = vm.selectedCellTexture().generateCanvasTexture()
        },

        initialTexture(){
            let vm = this
            let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
			g.drawRect(0, 0, vm.cellSize, vm.cellSize)
            g.endFill()
            return g
        },

		maskCellTexture(){
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

		filterCellTexture() {
			let vm = this
			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0x000000)
			g.beginFill(0xFFFFFF)
			g.drawCircle(vm.cellSize/2, vm.cellSize/2, vm.cellSize/2)
			g.endFill()
			return g
        },

		selectedCellTexture(){
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
        
        tooltipSetting(){
            let vm = this
			vm.tooltip = new vm.$PIXI.Container()
			vm.tooltip.alpha = 0
			vm.ctn_tooltip.addChild(vm.tooltip)
            // setting the tooltip label and box
			vm.tooltip_label = new vm.$PIXI.Text("Test"
			, {fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : 0xFFFFFF, align : 'center'})
			vm.tooltip_box = new vm.$PIXI.Graphics()
			vm.tooltip_box.lineStyle(1, 0x0)
			vm.tooltip_box.beginFill(0x0, 0.5)
			vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
			vm.tooltip_box.endFill()
			vm.tooltip.addChild(vm.tooltip_box)
			vm.tooltip_label.x = 10
			vm.tooltip_label.y = 10
			vm.tooltip.addChild(vm.tooltip_label)
            // setting the tooltip hidden interval
			vm.tooltip.countdown = 2
			vm.tooltip_timer = setInterval(function() {
				if (vm.tooltip.countdown <= 0) {
					vm.tooltip.alpha = 0
				} else {
					vm.tooltip.countdown -= 1
				}
			}, 1000)
        },

        keyboardSetting(){
            let vm = this 
            // keyboard setting init 
			vm.keyCode = {72:'h'}
            vm.keyDown = undefined
            // control the highlight event
            vm.highLightLock = false
        },

		checkKeydown(key){
			let vm = this
			vm.keyDown = vm.keyCode[key.keyCode]
			if(vm.keyDown === 'h'){
				vm.highLightLock=!vm.highLightLock
			}
		},
		
		KeyUp(){
			let vm = this 
			vm.keyDown = undefined
        },
        
        eventListener(){
            let vm = this
            window.addEventListener('resize', vm.handleResize)
            window.addEventListener("keydown",vm.checkKeydown)
            window.addEventListener("keyup", vm.KeyUp);
        },

		handleResize() {
			let vm = this;
			let width = vm.$refs.home.clientWidth
			vm.app.renderer.resize(width, vm.app.renderer.height);
			if (vm.wrapper) {
				vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
			}
        },

		getTrainedColumns(){
			let vm = this
			let start_idx = vm.eventBus.date_idx + 1
			let colunms = vm.eventBus.columns.slice(start_idx)
            let root_colunms = vm.eventBus.root.columns_train 
            let trainedColunms = []

			colunms.forEach((item,i) => {
				if(root_colunms.includes(item)){
				    trainedColunms.push({idx:i,name:item})
				}
            })     
            return trainedColunms       
        },

        drawCalendar(calLevel){
            let vm = this
            vm.mapping = {}
            let height = undefined
            height = vm.calendarClass[calLevel]()
            // resize the graph
            if(height === undefined){
                console.error("height undefined")
            }
            vm.app.renderer.resize(vm.app.renderer.width, height + 50)
            // binding the data for the eventBus
            vm.eventBus.data.forEach(d => {
				d.cal = vm.mapping[d.datetime.format(date_format)]
				d.cal.data = d

				if (d.mask) {
					d.cal.texture = vm.cellMaskTexture
					d.cal.oldTexture = vm.cellMaskTexture
				}
			}) 
            vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
        },

        yearChart(){
            let vm = this
			let startYear = vm.eventBus.startDate.year()
            let endYear = vm.eventBus.endDate.year()
            let height = undefined
            // draw the graph annually
			for(let y=startYear;y<=endYear;++y) {
				let y_ctn = vm.addYear(y)
				y_ctn.y = (y - startYear) * vm.gap_size + vm.padding
				height = y_ctn.y + vm.gap_size
            }
            return height
        },

        addYear(year){
            let vm = this
            
        },

        monthChart(){   
            let vm = this
			let year = vm.eventBus.startDate.year()
			let startMonth = vm.eventBus.startDate.month()
            let endMonth = vm.eventBus.endDate.month()

            let gap_size = (vm.padding + vm.cellSize * 13)
            let height = undefined

            // draw the graph per month
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
            // draw back bottom for go back to the last page
            let label = String(year)
            vm.drawBackLabel(label)

            return height
        },

        addMonth(){

        },

        dayChart(){
			let vm = this
			let year = vm.eventBus.startDate.year()
			let month = vm.eventBus.startDate.month()
			let startDay = vm.eventBus.startDate.date()
            let endDay = vm.eventBus.endDate.date()
            
            let height = undefined
            // draw the graph every day
			for(let d=startDay;d<=endDay;++d) {
				let d_ctn = vm.addDay(year, month, d)
				d_ctn.y = (d - startDay) * vm.gap_size + vm.padding + 20
				height = d_ctn.y + vm.gap_size
            }            
            // draw back bottom for go back to the last page
            let label = String(vm.eventBus.startDate.format('YYYY-MM'))
            vm.drawBackLabel(label)

            return height
        },

        addDay(){

        },

        drawBackLabel(label){
            let vm = this
			let title = new vm.$PIXI.Text("Back: " + label
			, {fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : 0x000000, align : 'center'})
			vm.wrapper.addChild(title)
			title.interactive = true
			title.buttonMode = true
			title.mousedown = function() {
				vm.goLastZoom()
			}
        },


    },
	mounted() {
        let vm = this;
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
