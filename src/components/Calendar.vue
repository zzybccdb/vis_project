<template>
<div class="cal-wrapper" ref="home">
	<v-alert ref="alert" :value="alert" :color="color" outline>
	{{message}}
	</v-alert>
</div>

</template>

<script>
// 最底層的時間格式,資料最多接收到 5分鐘一筆
const date_format = 'YYYY-MM-DD HH:mm:ss'
let vm = undefined
let PIXI = undefined
export default {
	components: {},
	data(){
		return{
			alert:true,
			message:"aaaa",
			color:"white"
		}
    },
    created(){
        let vm = this
        vm.selected_raw_data = []
        vm.selceted_latent = []
    },
	methods: {
        // 修改 calender view cell 的透明度.
		updateAlpha() {
			vm.eventBus.data.forEach(d => {
				if (d.cal) {
					d.cal.alpha =  1
					d.cal.alpha *= 1 - ((1-d.alpha_u) * vm.eventBus.root.errorAlpha / 100)
				}
			})
        },
        // 判定兩個 rect 是否發生碰撞
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
        // 返回歷史記錄中的上一 level 的結果(有待確認)
		goLastZoom() {
			vm.eventBus.zoomHistory.pop()
			let param = vm.eventBus.zoomHistory.pop()
			vm.eventBus.calLevel = param.calLevel
			vm.eventBus.root.loadData(param.interval, param.date_range)
		},
        // 更新右鍵選框
		updateSelection(ctn_cells, ctn_box, end=false) {
            // 修正當前 box 的 index, 防止重疊選中後, cell 無法關聯到正確的 box 
            ctn_box.forEach((box,i) => {
                box.index = i
            })
			ctn_cells.children.forEach(c => {
				let pass = ctn_box.some(box => {
                    // 判定當前 box 與 cell 是否歸屬於同一個 main ctn 之下
                    if(box.class === c.class){
                        let bool = vm.collision(c,box)
                        if(bool){
                            c.box = box
                        }
                        return bool
                    }
                    else{
                        return false
                    }
                })
                
				if( c.data != undefined ){
                    if ((pass && c.tint != 0xCCCCCC)){
						c.texture = (c.data.mask) ? vm.cellLabeledAndSelectedTexture : vm.cellTextureSelected
                        c.selected = true
					} else {
                        c.selected = false
                        c.box = undefined
                    }
				}
            })
		},
        // 判定 cell 是否歸屬有被 selection box 選中
		setBox(ctn_cells, ctn_box){
			ctn_cells.children.forEach(c => {
				ctn_box.children.some(box => {
					if(vm.collision(c, box))
						c.box = box
				})
			})
		},
        // 清除當前繪製內容
		clearData() {
            vm.wrapper.removeChildren()
            vm.ctn_box = []
		},
        // 將 hex 的資料轉爲 rgb object
		hexToRgb(hex){
			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/.exec(hex)
			return result? {   
				r:parseInt(result[1], 16),
				g:parseInt(result[2], 16),
				b:parseInt(result[3], 16),
			}:undefined;
		},
        // 爲 hex str 補上 0
		zeroPadding(hex){
			hex = "000000"+hex 
			return hex.substring(hex.length-6,hex.length); 
		},
        // 相似度判定
		Similar(selectedCell){
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
        // 用 mse 的方式計算 Latent space 下兩點之間的距離
		distance(p1, p2) {
			let x = p1[0] - p2[0]
			let y = p1[1] - p2[1]
			return Math.sqrt(x * x + y * y)
        },
        // 判定點與點之間的顏色差距
		colorDis(rgb1, rgb2){
			let r = rgb1.r - rgb2.r
			let g = rgb1.g - rgb2.g
			let b = rgb1.b - rgb2.b
			return Math.sqrt(r*r+g*g+b*b)
        },
        // 判定點與點之間考慮所有維度下的 mse 距離
		dimensionDis(item1, item2){
			let sum = []
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
        // (有待回顧)
		similarProcess(item,single=true){
			let process = {
				c:single ? vm.hexToRgb(vm.zeroPadding(item.tint.toString(16))) : vm.hexToRgb(vm.zeroPadding(item.cal.tint.toString(16))),
				d:single ? item.data.raw.slice(4) : item.raw.slice(4),
				l:single ? item.data.raw.slice(0,2) : item.raw.slice(0,2),
			}
			return process[vm.keyDown]
        },
        // 繪製 calender view 
        updateData() {
            vm.drawCalendar(vm.eventBus.calLevel)
        },
        // 初始化設定:
        // - PIXI 相關參數設定
        // - 鍵盤按鍵設定
        // - 配置不同資料 level 的繪製方法
        // - 事件監聽設定
        // - 網頁 resize 方法設定
		init() {
            // PIXI 相關參數設定
            vm.PIXIinit()  
            // 不同資料 level 方法綁定
            vm.calendarClass = {
                'year': vm.yearChart,
                'month': vm.monthChart,
                'day': vm.dayChart,
            }
            // 鍵盤參數設定
            vm.keyboardSetting()
            // 記錄參與 training 的欄位名稱            
            vm.trainedColunms = undefined
            // 記錄使用者選擇的最近的 level
            vm.lastSelectedCell = undefined
            // 監聽方法初始化
            vm.eventListener()
            // 處理網頁 resize 方法
            vm.handleResize()
            // 取消網頁右鍵設定
            vm.$refs.home.oncontextmenu = ()=>{return false ;};
            vm.$emit('loaded')
        },
        // PIXI 初始化參數設定
        PIXIinit(){
            // 參數初始化
            vm.dim_font = 'Arial'
            vm.dim_font_size = 14
            
            // PIXI物件宣告
            vm.app = new PIXI.Application({
                autoResize: true,
                // 白色背景板
                backgroundColor: 0xFFFFFF,
                // 高渲染模式
                antialias: true,
            })
            vm.app.renderer.resize(10, 0);
            vm.$refs.home.appendChild(vm.app.view)
            // 設定 calendar view cell 的寬度
            vm.cellSize = 15
            // 初始化 selection box 的顏色白色
            vm.selectionBoxColor = 0xFFFFFF
            // calendar view 樣式,
			vm.padding = 30
            vm.gap_size = (vm.padding + vm.cellSize * 7)
            // pixi 字形, 大小
			vm.pixi_font = 'Arial'
            vm.pixi_font_size = 14
            // wrapper 是 calendar view 的封裝容器
            vm.wrapper = new PIXI.Container()
			vm.wrapper.name = 'wrapper'
            vm.app.stage.addChild(vm.wrapper)
            // 提示內容容器
            vm.ctn_tooltip = new PIXI.Container()
            vm.app.stage.addChild(vm.ctn_tooltip)
            // 選擇框設定
            vm.ctn_box = []
            // 提示設定
            vm.tooltipSetting()
            // 貼圖設定
            vm.textureSetting()
        },
        // 提示內容設定
        tooltipSetting(){
			vm.tooltip = new PIXI.Container()
			vm.tooltip.alpha = 0
			vm.ctn_tooltip.addChild(vm.tooltip)
            // setting the tooltip label and box
			vm.tooltip_label = new PIXI.Text("Test", {
                fontFamily : vm.pixi_font, 
                fontSize: vm.pixi_font_size, 
                fill : 0xFFFFFF, 
                align : 'center'
            })
			vm.tooltip_box = new PIXI.Graphics()
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
        // 貼圖設定
        textureSetting(){
            // 有備標注 label 的 cell 貼圖
            vm.cellLabeledTexture = vm.labeledCellTexture().generateCanvasTexture()
            // 有備標注 label 且被選取的 cell 貼圖
            vm.cellLabeledAndSelectedTexture = vm.labeledAndSelectedCellTexture().generateCanvasTexture()
            // 同時被 pcp and cal 選取的貼圖
            vm.cellFilterAndSelectedTexture = vm.filterAndSelectedCellTesture().generateCanvasTexture()
            // 基礎正方形 cell 貼圖
            vm.cellTexture = vm.initialTexture().generateCanvasTexture()
            // 基礎 mask cell 貼圖
            vm.cellMaskTexture = vm.maskCellTexture().generateCanvasTexture()
            // pcp 選中的貼圖
            vm.cellFilterTexture = vm.filterCellTexture().generateCanvasTexture()
            // 左鍵圈選的貼圖
            vm.cellTextureSelected = vm.selectedCellTexture().generateCanvasTexture()
        },
        // 基礎的正方形 texture
        initialTexture(){
            let g = new PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
            g.drawRect(0, 0, vm.cellSize, vm.cellSize)
            g.endFill()
            return g
        },
        // 基礎 mask cell 貼圖
		maskCellTexture(){
			let g = new PIXI.Graphics()
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
        // 有標注 label 的 cell 貼圖
        labeledCellTexture() {
            let g = new PIXI.Graphics()
			g.lineStyle(1,0xCCCCCC)
			g.beginFill(0x000000)
			g.moveTo(0,0)
            g.lineTo(0, 11)
            g.lineTo(11, 0)
            g.lineTo(0, 0)
            g.endFill()
            
			g.beginFill(0xFFFFFF)
			g.moveTo(0,15)
            g.lineTo(15,15)
            g.lineTo(15, 0)
            g.lineTo(11, 0)
            g.lineTo(0, 11)
            g.lineTo(0, 15)
            g.endFill()

            return g
        },
        // 有標注 label  且被選取的 cell 貼圖
        labeledAndSelectedCellTexture() {
            let g = new PIXI.Graphics()
			g.lineStyle(1,0x000000)
			g.beginFill(0x000000)
			g.moveTo(0,0)
            g.lineTo(0, 15)
            g.lineTo(15, 0)
            g.lineTo(0, 0)
            g.endFill()
            
			g.beginFill(0xFFFFFF)
			g.moveTo(0,15)
            g.lineTo(15,15)
            g.lineTo(15, 0)
            g.lineTo(11, 0)
            g.lineTo(0, 11)
            g.lineTo(0, 15)
            g.endFill()

            return g
        },
        // 同時被 pcp and calendar view 選中的時候
        filterAndSelectedCellTesture() {
            let g = new PIXI.Graphics()
                        
            g.lineStyle(1,0x000000)
			g.beginFill(0x000000)
			g.moveTo(0,0)
			g.lineTo(0, 7)
			g.lineTo(7, 0)
			g.lineTo(0,0)
			g.endFill()
            g.beginFill(0xFFFFFF)
			g.moveTo(0,15)
			g.lineTo(15,15)
            g.lineTo(15,0)
            g.lineTo(7, 0)
            g.lineTo(0, 7)
			g.lineTo(0,15)
            g.endFill()
            
            return g
        },
        // pcp 選中時的貼圖 (正方形左上角會有黑色三角形的記號)
		filterCellTexture() {
			let g = new PIXI.Graphics()
			g.lineStyle(1,0xcccccc)
			g.beginFill(0x000000)
			g.moveTo(0,0)
			g.lineTo(0, 7)
			g.lineTo(7, 0)
			g.lineTo(0,0)
			g.endFill()
			g.beginFill(0xFFFFFF)
			g.moveTo(0,15)
			g.lineTo(15,15)
			g.lineTo(15,0)
			g.lineTo(7, 0)
			g.lineTo(0, 7)
			g.lineTo(0,15)
			g.endFill()
            return g
        },
        // 左鍵圈選的貼圖（邊框變成黑匡）
		selectedCellTexture(){
			let g = new PIXI.Graphics()
			g.lineStyle(1, 0x000000)
			g.beginFill(0xFFFFFF)
            g.drawRect(0, 0, vm.cellSize, vm.cellSize)
            g.endFill()
            return g
        },
        // 按鍵設定
        keyboardSetting(){
            // keyboard setting init 
			vm.keyCode = {72:'h'}
            vm.keyDown = undefined
            // control the highlight event
            vm.highLightLock = false
        },

		checkKeydown(key){
			vm.keyDown = vm.keyCode[key.keyCode]
			if(vm.keyDown === 'h'){
				vm.highLightLock=!vm.highLightLock
			}
		},
		
		KeyUp(){
			vm.keyDown = undefined
        },
        
        eventListener(){
            window.addEventListener('resize', vm.handleResize)
            window.addEventListener("keydown",vm.checkKeydown)
            window.addEventListener("keyup", vm.KeyUp);
        },

		handleResize() {
			let width = vm.$refs.home.clientWidth
            vm.app.renderer.resize(width, vm.app.renderer.height);
            
			// if (vm.wrapper) {
			// 	vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
            // }
            
        },

		getTrainedColumns(){
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
                    // Corn: 將 mask 的貼圖改成紅框框起來
					// d.cal.texture = vm.cellMaskTexture
                    // d.cal.oldTexture = vm.cellMaskTexture
                    d.cal.texture = vm.cellLabeledTexture
					d.cal.oldTexture = vm.cellLabeledTexture
                }
            }) 

            vm.wrapper.x = (vm.app.renderer.width - vm.wrapper.width) / 2
        },
        // level 年 calendar view, 每一格顯示一天的內容，呼叫 addYear()繪製
        yearChart(){
			let startYear = vm.eventBus.startDate.year()
            let endYear = vm.eventBus.endDate.year()
            let height = undefined
            // 依照年份依次繪製
			for(let y=startYear;y<=endYear;++y) {
				let y_ctn = vm.addYear(y)
				y_ctn.y = (y - startYear) * vm.gap_size + vm.padding
				height = y_ctn.y + vm.gap_size
            }
            return height
        },
        // level year 實際繪製代碼
        addYear(year){
            let [ctn_year,main_ctn,ctn_box,ctn_cells,ctn_border] = vm.containerInitial('ctn_year')
            // 标签容器宣告,y 表示一組 main_ctn 的 row 的個數
            let y = 7
            let label = vm.drawLabel(String(year),year,y)
            // 將  main ctn 的名字獨立
            main_ctn.name = String(year)
            // cells 主体向左移动 labels 的高度个单位 pixel
            main_ctn.x = label.height
            ctn_year.addChild(label)	

            // 設定年的起始日期 20xx-01-01
            let date = vm.$moment(String(year) + '-01-01')
			let week = 0, week_of_month = 0, month = 0
			let days_in_month = [[]]
			while(date.year() == year) {
                // 記錄以 week 爲 x， day 爲 y
				let x = week
				let y = date.day()
                // 單個 cell 初始化
                let sp = new PIXI.Sprite(vm.cellTexture)
                // 將 sp 歸類到當前的 main ctn 下
                sp.class = main_ctn.name
                vm.spInitial(sp,x,y)
                // 鼠標操作設定
                // e 指向當前鼠標移動的這個事件的一些參數,包括現在的全局位置等等
                // sp 指向當前這個 cell
                sp.mouseover = (e) => {vm.spMouseOver(e,sp,ctn_box)}
                sp.mouseout = () => {vm.spMouseOut(sp,ctn_box)}
                sp.rightdown = () => {vm.spMouseDown(sp,ctn_box,ctn_cells)}
                // sp.rightdown = () => {vm.spRightDown(sp)}
                // 建立 {date：sp} 的 object
                vm.mapping[date.format(date_format)] = sp

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
                // 每繪製完一個月就執行繪製邊緣描邊
				if (date.month() != month) {
					month = date.month()
                    week_of_month = 0
                    // 月份邊緣繪製
                    vm.yearChartStroke(month,days_in_month,ctn_border)
					days_in_month = [[]]
                }
                // 將 sp 加入畫布容器中
                ctn_cells.addChild(sp)
            }   
			main_ctn.mousedown = (e) => {vm.SelectionBoxStart(e,ctn_box,main_ctn)}
            main_ctn.mousemove = (e) => {vm.SelectionBoxSelecting(e,ctn_box,ctn_cells,main_ctn)}
            main_ctn.mouseup = () => {vm.SelectionBoxEnd(ctn_box,ctn_cells)} 
            main_ctn.mouseout = () => {vm.eventBus.pcp.resetAlpha()}
			return ctn_year
        },
        // level 月 calendar view,每一格顯示2小時資料
        monthChart(){   
            // 獲取資料的年份,起始和結束月份
			let year = vm.eventBus.startDate.year()
			let startMonth = vm.eventBus.startDate.month()
            let endMonth = vm.eventBus.endDate.month()
            // 每個月之間間距設定
            let gap_size = (vm.padding + vm.cellSize * 13)
            let height = undefined
            // 繪製 back button,回到上一個 level 的結果
            let str = String(year)
            vm.drawBackLabel(str)

            // 以每個月爲一個 main_ctn 
			for(let m=startMonth;m<=endMonth;++m) {
                let m_ctn = vm.addMonth(year, m)

				if(m%2 === 1){
                    if(startMonth%2 === 0){
                        m_ctn.y = (m - startMonth -1)/2 * gap_size  + vm.padding + 20
					    m_ctn.x = 31 * vm.cellSize + 60
                    }
                    else if(startMonth%2 === 1){
                        m_ctn.y = (m - startMonth)/2 * gap_size  + vm.padding + 20
                        m_ctn.x = 31 * vm.cellSize + 60
                    }
				}
				else{
                    if(startMonth%2 === 0){
                        m_ctn.y = (m - startMonth)/2 * gap_size  + vm.padding + 20
                    }
                    else if(startMonth%2 === 1){
                        m_ctn.y = (m - startMonth+1)/2 * gap_size  + vm.padding + 20
                    }
				}
				height = m_ctn.y + gap_size
            }

            return height
        },
        // level month 實際繪製代碼
        addMonth(year, month){
            let date = vm.eventBus.startDate.clone().month(month).date(1)
            let [ctn_month,main_ctn,ctn_box,ctn_cells] = vm.containerInitial("ctn_month")
            // 標籤容器宣告,繪製側邊月份信息
            let y = 12
            let label = vm.drawLabel(date.format('MMM'),year,y,month)
            main_ctn.name = date.format('MMM')
            main_ctn.x = label.height
            ctn_month.addChild(label)
            // 日 容器標籤
            let ctn_label = new PIXI.Container()
            ctn_label.name = 'ctn_label'
            ctn_label.x =  label.height
			ctn_month.addChild(ctn_label)
            // 判別日期使用
            let lastDate = undefined
			while(date.month() === month) {
				let x = (date.date()-1)
				let y = date.hour()/2
                let sp = new PIXI.Sprite(vm.cellTexture)
                vm.spInitial(sp,x,y)
                sp.class = main_ctn.name
                // cell 鼠標操作
                sp.mouseover = (e) => {vm.spMouseOver(e, sp, ctn_box)}
                sp.mouseout = () => {vm.spMouseOut(sp, ctn_box)}
                sp.rightdown = () => {vm.spMouseDown(sp, ctn_box, ctn_cells)}
                // sp.rightdown = () => {vm.spRightDown(sp)}                
				vm.mapping[date.format(date_format)] = sp

				let dayOfMonth = date.date()
				if (lastDate != dayOfMonth) {
					lastDate = dayOfMonth
					let color = (date.day() === 6|| date.day() === 0)?0xff0000:0x000000
                    // 繪製上方日期信息
                    let day_label = new PIXI.Text(date.format('Do')
					, {fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : color, align : 'center'})
					day_label.x = sp.x
					day_label.y = - 13
					day_label.rotation = - Math.PI / 4;
					ctn_label.addChild(day_label)
				}

                date.add(2, 'hour')
                ctn_cells.addChild(sp)
            }
			main_ctn.mousedown = (e) => {vm.SelectionBoxStart(e,ctn_box,main_ctn)}
            main_ctn.mousemove = (e) => {vm.SelectionBoxSelecting(e,ctn_box,ctn_cells,main_ctn)}
            main_ctn.mouseup = () => {vm.SelectionBoxEnd(ctn_box,ctn_cells)} 
            main_ctn.mouseout = () => {vm.eventBus.pcp.resetAlpha()}          
            return ctn_month
        },
        // level 日 calendar view, 每一格顯示5分鐘資料
        dayChart(){
			let year = vm.eventBus.startDate.year()
			let month = vm.eventBus.startDate.month()
			let startDay = vm.eventBus.startDate.date()
            let endDay = vm.eventBus.endDate.date()
            // 唯一存成
            let gap_size = (vm.padding + vm.cellSize * 7)
            let height = undefined
            // 繪製 back button,回到上一個 level 的結果
            let str = vm.eventBus.startDate.format('YYYY-MM')
            vm.drawBackLabel(str)

            // 繪製 level day 的具體 calender view
			for(let d=startDay;d<=endDay;++d) {
				let d_ctn = vm.addDay(year, month, d)
				d_ctn.y = (d - startDay) * gap_size + vm.padding + 20
				height = d_ctn.y + gap_size
            }            

            return height
        },
        // level day 實際繪製代碼
        addDay(year,month,day){
			let date = vm.eventBus.startDate.clone().date(day)
            let [ctn_day,main_ctn,ctn_box,ctn_cells,] = vm.containerInitial("ctn_day")
            // day information 容器
            let color = (date.day() === 6|| date.day() === 0)?0xff0000:0x000000
            let y = 6
            let label = vm.drawLabel(date.format('MMM-Do-ddd'),year,y,undefined,color)
            main_ctn.name = date.format('MMM-Do-ddd')
            main_ctn.x = label.height
            ctn_day.addChild(label)
            // hour 標籤容器
			let ctn_label = new vm.$PIXI.Container()
			ctn_label.name = 'ctn_label'
			ctn_label.x = label.height
			ctn_day.addChild(ctn_label)
            // 判別時間使用
			let lastHour = undefined
			while(date.date() == day) {
				let x = (date.hour()) * 2 + (date.minute() >= 30)
				let y = ((date.minute()/5) % 6)
                let sp = new vm.$PIXI.Sprite(vm.cellTexture)
                sp.class = main_ctn.name
                vm.spInitial(sp,x,y)
                // cell 鼠標操作
                sp.mouseover = (e) => {vm.spMouseOver(e,sp,ctn_box)}
                sp.mouseout = () => {vm.spMouseOut(sp,ctn_box)}
                sp.rightdown = () => {vm.spMouseDown(sp,ctn_box,ctn_cells)}
                // sp.rightdown = () => {vm.spRightDown(sp)}                 
				vm.mapping[date.format(date_format)] = sp

				let hourOfDay = date.hour()
				if (lastHour != hourOfDay) {
                    lastHour = hourOfDay
					let label = new vm.$PIXI.Text(date.format('HH')
					, {fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : 0x000000, align : 'center'})
					label.x = sp.x
					label.y = -label.height - 3
					ctn_label.addChild(label)
				}

				date.add(5, 'minute')
				ctn_cells.addChild(sp)
            }
			main_ctn.mousedown = (e) => {vm.SelectionBoxStart(e,ctn_box,main_ctn)}
            main_ctn.mousemove = (e) => {vm.SelectionBoxSelecting(e,ctn_box,ctn_cells,main_ctn)}
			main_ctn.mouseup = () => {vm.SelectionBoxEnd(ctn_box,ctn_cells)} 
            main_ctn.mouseout = () => {vm.eventBus.pcp.resetAlpha()}
            return ctn_day
        },
        // ****** cell 單獨操作
        // cell sp 初始化設定
        spInitial(sp,x,y){
            // 設定 cell 的繪製位置，1 爲 margin 的大小 
            sp.x = (vm.cellSize+1) * x 
            sp.y = (vm.cellSize+1) * y
            sp.interactive = true
            sp.buttonMode = true
            sp.msover = false
            sp.selected = false
        },
        // 鼠標移動到 cell 觸發
        spMouseOver(e, sp, ctn_box){
            let data = sp.data
            if(!vm.highLightBlock){
                sp.msover = true
                // sp.texture = vm.cellFilterTexture
            }
            // 繪製 tooltip
            if (data && sp.tint != 0xFFFFFF) {
                vm.changeTooltip(data.datetime.format(date_format))
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
                    vm.eventBus.pcp.highLight();						
                }
            }
            if(!sp.selected && !ctn_box.selecting){
                if(!vm.highLightBlock){
                    vm.eventBus.pcp.resetAlpha();
                }
            }            
        },
        // 鼠標移出 cell 觸發
        spMouseOut(sp,ctn_box){
            if(!vm.highLightBlock){
                sp.msover = false;
                // sp.texture = vm.cellTexture
            }
            if (sp.selected && !ctn_box.selecting) {
                if(!vm.highLightBlock){
                    // sp.texture = vm.cellTextureSelected
                    vm.eventBus.pcp.highLight();
                }
            }
        },
        // 鼠標右鍵點擊
        spMouseDown(sp,ctn_box,ctn_cells){
            if( sp.selected && sp.box ){
                ctn_cells.children.forEach( c => {
                    c.singSelected = false
                    c.texture = (c.data && c.data.mask) ? vm.cellLabeledAndSelectedTexture : vm.cellTexture
                    c.selected = false
                    // 檢測當前 cell 是否爲空，如果是空白就跳過
                    if(c.tint === 0xCCCCCC)
                        c.data.pcp = undefined
                })		
                ctn_box.removeChild(sp.box)
                vm.ctn_box.splice(sp.box.index,1)
                sp.box = null
                vm.updateSelection(ctn_cells, vm.ctn_box)
                vm.eventBus.pcp.clearData()
                vm.eventBus.cm.clearHighlight()
                if(vm.ctn_box.length === 0){
                    vm.eventBus.pcp.removeAllFilterBox()
                    vm.eventBus.pcp.clearHighLight()
                    let date_axis = vm.eventBus.pcp.state.axis.filter(axis => axis.name==='date')
                    if(!date_axis[0].disabled){
                        date_axis[0].disabled = true
                        vm.eventBus.pcp.adjustAxisPosition()
                        vm.eventBus.pcp.removeAllLines()
                    }
                } else {
                    if (vm.eventBus.pcp.switch_button.mode){
                        vm.selectedCellData()
                        vm.sortAxis()
                    } else {
                        vm.eventBus.pcp.adjustTicks()
                        vm.eventBus.pcp.adjustLines()  
                        vm.eventBus.pcp.filterLines()                  
                    }
                }
            }            
        },
        // 鼠標右鍵點擊 cell 觸發
        spRightDown(sp) {
            if(vm.keyDown != undefined/* && !sp.data.mask */&& sp.tint != 0xCCCCCC) {
                vm.message = vm.notice[vm.keyDown]
                vm.color = "black"
                setTimeout(() => {
                    vm.color = "white"
                }, 1500);
                sp.singSelected = true
                if( !vm.highLightBlock ){
                    sp.msover = true
                    sp.texture = vm.cellFilterTexture
                }
                sp.selected = true
                vm.Similar(sp)
            } else{
                if(vm.keyDown != undefined)
                    console.error("Key Invalid")
            }            
        },
        // ****** cell 單獨操作
        // ****** 右鍵選擇框操作
        // 右鍵選擇框設定
        SelectionBoxStart(e,ctn_box,main_ctn){
            console.warn(`圈選`)
            // 记录当前 mask box 的数量
            let cal_mask_boxes = vm.ctn_box.length
            // 當前鼠標的位置
            let p = e.data.getLocalPosition(main_ctn)
            // 判断是否存在 pcp filter box
            let pcp_filter_boxes = vm.eventBus.pcp.state.axis.some(a => a.grp.child_dict.line.box.length !== 0 )
            // 满足条件此時 pcp 上存有 filter box, 沒有 mask box, 禁止繪製
            // 检查当前点是否已经被 mask box 圈选，选中禁止绘制
            if((cal_mask_boxes !== 0 || !pcp_filter_boxes)){
                let box = new PIXI.Graphics()
                // 將 box 也綁定到當前的 main ctn 下
                box.class = main_ctn.name
                box.x = p.x  
                box.y = p.y
                box.index = vm.ctn_box.length
                box.start_p = p
                box.clear()
                ctn_box.addChild(box)
                vm.ctn_box.push(box)
                ctn_box.selecting = true
            } else {
                ctn_box.selecting = false
            }
        },
        SelectionBoxSelecting(e, ctn_box,ctn_cells, main_ctn){
            // e.data.buttons 判定鼠標左右鍵
            // 0 表示沒有按下鼠標，1 鼠標左鍵， 2 鼠標右鍵
            if (e.data.buttons != 1) {
                if (ctn_box.selecting) {
                    vm.SelectionBoxEnd(ctn_box,ctn_cells)
                }
                return
            }
            if (ctn_box.selecting) {
                if(vm.keyDown != undefined) {
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
                vm.updateSelection(ctn_cells, vm.ctn_box)
            }            
        },
        SelectionBoxEnd(ctn_box,ctn_cells){
            if (ctn_box.selecting) {
                let vm = this 
                vm.ctn_cells = ctn_cells
                let index = ctn_box.children.length-1
                let box = ctn_box.children[index]
                // 當繪製的選擇框太小就清除它
                if (box && box.height * box.width < (vm.cellSize * vm.cellSize) / 8) {
                    ctn_box.removeChild(box)
                    vm.ctn_box.splice(box.index,1)
                }
                vm.updateSelection(ctn_cells, vm.ctn_box)
                vm.setBox(ctn_cells, ctn_box)
                // 獲取rawdata, Latent, 爲傳遞後端準備
                vm.selectedCellData()
                vm.eventBus.cm.highLightSelectedPoint()
                vm.eventBus.pcp.clearData()
                ctn_box.selecting = false   
                let date_axis = vm.eventBus.pcp.state.axis.filter(axis => axis.name==='date')
                if(date_axis[0].disabled){
                    date_axis[0].disabled = false
                    vm.eventBus.pcp.adjustAxisPosition()
                }
                if(vm.eventBus.pcp.switch_button.mode){
                    vm.sortAxis()
                }
                else{
                    vm.adjustAxisOrder()
                    if(!vm.highLightBlock){
                        vm.eventBus.pcp.highLight();
                    }
                    vm.eventBus.pcp.adjustTicks()
                    vm.eventBus.pcp.adjustLines()
                    vm.eventBus.pcp.filterLines()
                }

            }
        },
        // 檢查是否子已經在mask box內部
        checkCellMasked(ctn_box,position){
            return ctn_box.children.some(box => {
                if(position.x >= box.x && position.x <= box.x+box.width && position.y >= box.y && position.y <= box.y+box.height){
                    return true
                } else {
                    return false
                }
            })
        },
        sortAxis(){
            let vm = this
            vm.$axios.post(vm.$api + '/inference/get_sort_axis', {
                'rawdata':vm.selected_raw_data,
                'latent':vm.selceted_latent,
                'columns':vm.eventBus.columns.slice(4)
            })
            .then((response) => {
                let sort_columns = response.data.sort
                
                sort_columns = sort_columns.filter(c => {
                    return vm.eventBus.root.columns.indexOf(c) !== -1
                })

                vm.eventBus.pcp.sortAxis(sort_columns)
                vm.eventBus.pcp.adjustTicks()
                vm.eventBus.pcp.adjustLines()
                vm.eventBus.pcp.filterLines()
            })
            .catch(error => {
                window.error = error
                console.error(error)
            })
        },
        // 储存被mask cell的data
        selectedCellData(){
            let vm = this
            // 清空当前储存的 raw data， latent
            vm.selected_raw_data = []
            vm.selceted_latent = []
            vm.eventBus.data.forEach(d => {
                if(d.cal.selected){
                    vm.selected_raw_data.push(d.cal.data.raw.slice(4))
                    vm.selceted_latent.push(d.cal.data.raw.slice(0,2))         
                }
            })
        },
        // ****** 右鍵選擇框操作
        // 繪製 tooltip 上的內容
        changeTooltip(str){
            vm.tooltip.alpha = 1
            vm.tooltip_label.text = str
            // 清除原本 tooltip 畫布上的內容
            vm.tooltip_box.clear()
            vm.tooltip_box.lineStyle(1, 0x0)
            vm.tooltip_box.beginFill(0x0, 0.5)
            vm.tooltip_box.drawRect(0, 0, vm.tooltip_label.width + 20, vm.tooltip_label.height + 20)
            vm.tooltip_box.endFill()
            vm.tooltip.countdown = 2
        },
        // 給 level 年的資料描邊
        yearChartStroke(month,days_in_month,ctn_border){
            if (days_in_month[days_in_month.length-1].length == 0) {
                days_in_month = days_in_month.slice(0, days_in_month.length-1)
            }

            let x1, x2, y1, y2;
            let border = new PIXI.Graphics()
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
        },
        // ctn 画布内容器宣告
        containerInitial(str){
            // 宣告該 level 的绘制容器
			let ctn_ = new PIXI.Container()
            ctn_.name = str
            // 主体容器
			let main_ctn = new PIXI.Container()
            main_ctn.interactive = true
            // selection box 容器
            let ctn_box = new PIXI.Container()
            ctn_box.name = 'ctn_box'
            ctn_box.selecting = false
            // 具体 cell 的容器, 包含于 main_ctn之下
            let ctn_cells = new PIXI.Container()
            ctn_cells.name = 'ctn_cells'
            // 交互行为宣告,鼠标移开,重置 pcp alpha
            ctn_cells.interactive = true
            ctn_cells.buttonMode = true
            // ctn_cells.mouseout = vm.cellMouseout
            // year level 的邊緣繪製
            let ctn_border = new PIXI.Container()
            ctn_border.name = 'ctn_border'
            // 将内容物绑定到 cell 的主体容器下
            main_ctn.addChild(ctn_cells)
            main_ctn.addChild(ctn_border)
            // 将内容物绑定到 现在的内容物下
            ctn_.addChild(main_ctn)
            vm.wrapper.addChild(ctn_)
            return [ctn_,main_ctn,ctn_box,ctn_cells,ctn_border]
        },
        // //鼠标从 cell 上移开后, 重置 pcp alpha
        cellMouseout(){
            if(!vm.highLightBlock){
                vm.eventBus.pcp.resetAlpha();
            }
        },
        // 绘制标签,输入一个 string
        drawLabel(str,year,y,month=undefined,color=0x000000){
            let label = new PIXI.Text(str,{fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : color, align : 'center'})
            label.name = 'label'
            label.rotation = Math.PI / 2 * 3
            label.y = vm.cellSize * y / 2 + label.width / 2
			label.interactive = true
            label.buttonMode = true
            // 标签点击事件宣告
            label.mousedown = ()=>{
                if(month === undefined){
                    console.log("load month data")
                    let sd = vm.$moment.utc().year(year).dayOfYear(1).hour(0).minute(0).second(0)
                    let ed = vm.$moment.utc().year(year+1).dayOfYear(1).hour(0).minute(0).second(0).add(-1, 'second')
                    vm.eventBus.calLevel = 'month'
                    vm.eventBus.root.loadData('2 hour', [sd.format(date_format), ed.format(date_format)])         
                }
                else{
                    let sd = vm.$moment.utc().year(year).month(month).date(1).hour(0).minute(0).second(0)
                    let ed = vm.$moment.utc().year(year).month(month+1).date(1).hour(0).minute(0).second(0).add(-1, 'second')
                    vm.eventBus.calLevel = 'day'
                    vm.eventBus.root.loadData('5 minute', [sd.format(date_format), ed.format(date_format)])                    
                }
            }
            return label
        },
        // 返回按鍵設置
        drawBackLabel(str){
			let back_button = new PIXI.Text("Back: " + str
			, {fontFamily : vm.pixi_font, fontSize: vm.pixi_font_size, fill : 0x000000, align : 'center'})
			vm.wrapper.addChild(back_button)
			back_button.interactive = true
			back_button.buttonMode = true
			back_button.mousedown = function() {
				vm.goLastZoom()
			}
        },
		adjustAxisOrder() {
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
		},

    },
    // 加載頁面執行
	mounted() {
        vm = this;
        PIXI = vm.$PIXI
        vm.init()
    },
    // 離開頁面前執行, 取消 window 全局監聽內容.
    // 包括 resize, keydown, keyup 等.
	beforeDestroy() {
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
