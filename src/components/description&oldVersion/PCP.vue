<template>
    <div class="pcp-wrapper" ref="main">
    </div>
</template>

<script>
export default{
    //需要使用到的组件
    components:{
    },
    //全局监听的变量
    data:()=>{
        return{
        }
    },
    //
    created(){
    },
    //所有需要呼叫的function放在这里
    methods:{
        //調整視窗大小
        handleResize(listener=true){
            let vm = this
            let width = vm.$refs.main.clientWidth
            let height = vm.$refs.main.clientHeight
            //重置 pixi application 的長寬
            vm.app.renderer.resize(width,height)
            console.log(listener)
            if(listener){
                vm.drawPCP()
                console.log("Resize the window")
            }
        },   
        //畫出整張圖像.
        drawPCP(start_time=undefined,end_time=undefined){
            let vm = this
            if(vm.data === undefined){
                console.error("PCP missing data")
                return
            }
            let data = vm.data
            if(start_time === undefined || end_time === undefined){
                console.error("Can not draw the title. Missing the time range")
            }else{
                vm.drawChartTitle(start_time,end_time)
            }
            vm.adjustAxisPosition()
            vm.adjustTicks(data)
            vm.drawPCPLines(data)
        },

        //調整每個軸線的位置
		adjustAxisPosition() {
            let vm = this            
            let axis = vm.ctn.axis
            //計算最小的寬度
			let min_width = vm.min_axis_gap * (axis.length - 1) + vm.wrapper.x * 2
            //調整 application 的 renderer
            if (vm.app.renderer.width < min_width) {
				vm.app.renderer.resize(min_width, vm.app.renderer.height)
            }
            //獲取圖形的寬度
			vm.plot_width = vm.app.renderer.width  - vm.wrapper.x * 2
            let axis_gap = vm.plot_width / (axis.length - 1)
			axis.forEach((a, ai) => {
				a.grp.alpha = 1
				if (!a.grp.dragging) {
					a.grp.x = ai * axis_gap
                }
				a.idx = ai
			})
        },  
        //給圖表上標題
        drawChartTitle(start_time=undefined,end_time=undefined){
            if(start_time === undefined || end_time === undefined){
                console.error("Time range error")
                return
            }
            let vm = this
            let pixi = vm.$PIXI
            let moment = vm.$moment
            let level = vm.eventBus.calLevel
            let title_format = vm.title_format[level]
            
            start_time = moment(start_time).format(title_format)
            end_time = moment(end_time).format(title_format)

            let title = new pixi.Text(start_time+' ~ '+end_time, 
            {fontFamily : vm.font, fontSize: 15, fill : 0x000000, align : 'center'})
            title.x = 0, title.y = 10
            title.interactive = true
            title.buttonMode = true
            title.on('mousedown',() => {
                vm.$router.push({name: 'colormap'})
            })
            vm.wrapper.addChild(title)
        },

        HighlightByTime(data=undefined,query=undefined){
            if(data === undefined || query === undefined){
                console.error("Data or Query Missing")
                return
            }
            let vm = this
            let moment = vm.$moment
            let level = vm.eventBus.calLevel
            let format = vm.timeformat[level]

            query = moment(query).format(format)
            data.forEach(d => {
                let date = moment(d[0]).format(format)
                if(query === date){
                    let line = vm.thick_line
                    line.clear()
                    line.lineStyle(5,0xffffff)
                    vm.connectionLine(d,line)
                    line.lineStyle(3,0x000000)
                    vm.connectionLine(d,line)
                }
            })
        },

        adjustTicks(data=undefined){
            if(data === undefined){
                console.error("Ticks error:Data is undefined")
                return 
            }
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            //PCP 圖標的高度和圖表的起始位置獲取
            let height = vm.plot_height
            let plot_start = vm.ctn.axis[0].grp.child_dict.axis_line.y
            //利用 d3.extent() 得到每個座標軸的區間.
            vm.ctn.axis.forEach(axis => {   
                let dim_data = undefined
                let ticks = undefined
                axis.grp.child_dict.ctn_ticks.removeChildren()
                
                if( axis.name === 'Time'){
                    dim_data = data.map( d => {return moment(d[0])})
                    axis.extent = d3.extent(dim_data)
                    //通過設定 d3.scale() 來得到 ticks 的位置與內容 
                    axis.scale = d3.scaleTime()
                                .domain(axis.extent)
                                .range([plot_start + height, plot_start])
                    //利用 d3.scale().ticks() 幫助獲取座標軸中的刻度值,貌似當前狀態下ticks的最小值都是5
                    ticks = axis.scale.ticks(vm.time_axis_ticks_nums)
                    vm.drawTimeTicks(ticks,axis)
                }else{
                    dim_data = data.map(d => {
                        return parseFloat(d[axis.index])
                    })
                    axis.extent = d3.extent(dim_data)
                    //通過設定 d3.scale() 來得到 ticks 的位置與內容 
                    axis.scale = d3.scaleLinear()
                                .domain(axis.extent)
                                .range([plot_start + height, plot_start])
                    //利用 d3.scale().ticks() 幫助獲取座標軸中的刻度值,貌似當前狀態下ticks的最小值都是5
                    ticks = axis.scale.ticks(5)        
                    vm.drawNumTicks(ticks,axis)  
                }
            })
        },
        //繪製線條
        drawPCPLines(data=undefined){
            if(data === undefined){
                console.error("Draw PCP line error:Data is undefined")
                return
            }
            let vm = this
            let pixi = vm.$PIXI
            vm.ctn_lines.removeChildren()
            //對每一筆資料繪製 PCP 線條
            data.forEach(d => {
                let line = new pixi.Graphics()
                line.clear()
                line.lineStyle(2,0xFFFFFF,0.5)
                vm.connectionLine(d,line)
                //設定line的顏色
                line.tint = 0xC5DBE7
                line.alpha = 0.3
                d.pcp = line
                vm.ctn_lines.addChild(line)
            })
        },
        //負責處理將每個座標軸的點連接起來
        connectionLine(data,line){
            let vm = this
            let moment = vm.$moment
            let first = true
            data.forEach((dim,i) => {
                let axis = vm.ctn.axis[i]
                let x = axis.grp.x
                let y = undefined
                //d3 在 timescale 的時候需要注意必須爲時間格式
                if(axis.name === 'Time'){
                    y = axis.scale(moment(dim)) + axis.grp.y
                }else{
                    y = axis.scale(dim) + axis.grp.y
                }
                if(first){
                    line.moveTo(x,y)
                }else{
                    line.lineTo(x,y)
                }
                first = false 
            })
        },  

        drawTimeTicks(ticks,axis){
            let vm = this 
            let moment = vm.$moment
            let pixi = vm.$PIXI

            let level = vm.eventBus.calLevel
            let format = vm.timeslot[level]    

            let ticks_format = ticks.map(item => {
                return moment(item).format(format)
            })
            ticks.forEach((item,i) => {
                let tick = new pixi.Graphics()
                tick.lineStyle(1,0)
                tick.moveTo(0,0)
                tick.lineTo(vm.tick_length,0)
                tick.y = axis.scale(item)
                tick.x = -vm.tick_length

                let tick_label = new pixi.Text(ticks_format[i],
                {fontFamily : vm.font, fontSize: 12, fill : 0x000000, align : 'center'})

                tick_label.x = tick.x - tick_label.width
                tick_label.y = tick.y - tick_label.height / 2
                axis.grp.child_dict.ctn_ticks.addChild(tick)
                axis.grp.child_dict.ctn_ticks.addChild(tick_label)
            })                
        },

        drawNumTicks(ticks,axis){
            let vm = this
            let pixi = vm.$PIXI
            ticks.forEach( item => {
                let tick = new pixi.Graphics()
                tick.lineStyle(1,0)
                tick.moveTo(0,0)
                tick.lineTo(vm.tick_length,0)
                tick.y = axis.scale(item)
                tick.x = -vm.tick_length

                let tick_label = new pixi.Text(String(item),
                {fontFamily : vm.font, fontSize: vm.font_size, fill : 0x000000, align : 'center'})

                tick_label.x = tick.x - tick_label.width
                tick_label.y = tick.y - tick_label.height / 2
                axis.grp.child_dict.ctn_ticks.addChild(tick)
                axis.grp.child_dict.ctn_ticks.addChild(tick_label)
            })      
        },

        drawFilterbox(){},

        init(data){
            let vm =this
            vm.data = data
            vm.timeslot = {
                'year':"MM.DD",
                'month':"DD.HH",
                'day':"HH:mm"
            }
            vm.title_format = {
                'year':"YYYY.MM.DD",
                "month":"YY.MM.DD.HH",
                "day":"YY.MM.DD.HH:mm"
            }
            vm.timeformat = {
                'year':"YYYY-MM-DD",
                'month':"YYYY-MM-DD HH-00",
                'day':"YYYY-MM-DD HH:mm"               
            }
            // pcp 初始設定
            vm.pixiInit()
            //儲存所有圖形數據的容器
            vm.ctn = {}
            vm.ctn.axis = []
            //繪製軸線
            vm.eventBus.columns.forEach((item,i) => {
                //得到原始 dimension index
                let dim_index = vm.eventBus.org_columns.indexOf(item)
                vm.addAxis(item, i, dim_index)
            })
        },

        pixiInit(){
            let vm = this
            let pixi = vm.$PIXI
            //圖像基礎參數設定
            vm.init_alpha = 0.4 
            vm.min_axis_gap = 40
            vm.plot_height = 190
            vm.font = 'Arial'
            vm.font_size = 14
            vm.tick_length = 5
            vm.indicator_radius = 5
            vm.margin = 60
            vm.filterbox_width = 10
            vm.init_color = 0xff0000
            vm.time_axis_ticks_nums = 10
            //移除 pixi-application 下的 children
            vm.app.stage.removeChildren()
            //最外層的包裝紙
            vm.wrapper = new pixi.Container()
            vm.wrapper.x = vm.margin
            vm.app.stage.addChild(vm.wrapper)
            //pcp 線條的容器
            vm.ctn_lines = new pixi.Container()
            vm.wrapper.addChild(vm.ctn_lines)
            //pcp 軸的容器
            vm.ctn_axis = new pixi.Container()
            vm.wrapper.addChild(vm.ctn_axis)
            //highlight 線條的容器
            vm.thick = new pixi.Container()
            vm.thick.name = "thick"
            vm.wrapper.addChild(vm.thick)
            vm.thick_line = new pixi.Graphics()
            vm.thick.addChild(vm.thick_line)
        },

        addAxis(axis_name,index,dim_index){
            let vm = this
            let pixi = vm.$PIXI 
            //檢查維度是否自定義的重要維度,第一個維度是時間維度
            let grp_axis = new pixi.Container()
            vm.ctn_axis.addChild(grp_axis)
            //軸線包括:labal,indicator,axis_line,tick
            //維度名
            let label = vm.drawLabel(axis_name)
            grp_axis.addChild(label)
            //軸線拖動設定
            // label.on('rightdown', e => vm.axisStartDrag(e,grp_axis))
            // label.on('mousemove', e => vm.axisDragging(e,grp_axis))
            // label.on('rightup', e => vm.axisStopDrag(gr_axis))
            //指示符
            let indicator = vm.drawIndicator(index,label)
            grp_axis.addChild(indicator)
            //軸線
            let axis_line = vm.drawAxisLine(indicator)
            //設定線條過濾滑塊
            // axis_line.on('mouseodown', e => vm.drawFilterStart(e,axis_line,grp_axis))
            // axis_line.on('mousemove', e => vm.selectingRange(e,axis_line,grp_axis))
            // axis_line.on('mousemove', e => vm.drawFilterEnd(e,axis_line,grp_axis))
            grp_axis.addChild(axis_line)
            //刻度指示符
            let ctn_ticks = new pixi.Container()
            grp_axis.addChild(ctn_ticks)

            grp_axis.dragging = false
			grp_axis.child_dict = {
				label,axis_line,ctn_ticks
            }
			vm.ctn.axis.push({
				index,
				dim_index,
                name: axis_name,
                //控制該軸線是否需要影藏
				// disabled: false,
				scale: null,
				extent: null,
				grp: grp_axis,
			})
        },

        drawLabel(column){
            let vm = this
            let pixi = vm.$PIXI
			let label = new pixi.Text(column
			, {fontFamily : vm.font, fontSize: vm.font_size, fill : 0x000000, align : 'center'})
			label.x = -vm.indicator_radius * 2
			label.rotation = - Math.PI / 6
            label.y = 50
            
			label.interactive = true
            label.buttonMode = true
            
            return label
        },    
        // axisStartDrag(axis, grp_axis){},
        // axisDragging(axis,grp_axis){},
        // axisStopDrag(grp_axis){},
        drawIndicator(index,label){
            let vm = this
            let pixi = vm.$PIXI 
            let indicator = new pixi.Graphics()
            //pixi lineStyle接受參數(widht,color,alpha,alignment,native)
            indicator.lineStyle(1, 0x0287e3)
            indicator.beginFill(0x0287e3, 0.9)
            if(index === 0){
				indicator.moveTo(0, -vm.indicator_radius)
				indicator.lineTo(vm.indicator_radius, vm.indicator_radius)
				indicator.lineTo(-vm.indicator_radius, vm.indicator_radius)
				indicator.lineTo(0, -vm.indicator_radius)            
            }
            else{
                indicator.drawCircle(0,0,vm.indicator_radius,vm.indicator_radius)
            }
            indicator.endFill()
            indicator.y = label.y + label.height + 8
            indicator.interactive = true
            indicator.buttonMode = true
            return indicator
        },
        
        drawAxisLine(indicator){
            let vm = this 
            let pixi = vm.$PIXI
            let axis_line = new pixi.Graphics()
            axis_line.lineStyle(1,0)
            axis_line.moveTo(0,0)
            axis_line.lineTo(0,vm.plot_height)
            axis_line.interactive = true
            axis_line.hitArea = new pixi.Rectangle(-vm.filterbox_width * 1, 0, 2 * vm.filterbox_width, vm.plot_height);
            axis_line.y = indicator.y + vm.indicator_radius + 5
            axis_line.box = []
            return axis_line
        },
        // drawFilterStart(e,axis_line,grp_axis){},
        // selectingRange(e,axis_line,grp_axis){},
        // drawFilterEnd(e,axis_line,grp_axis){},
    },
    //启动呼叫
    mounted(){
        let vm = this
        let pixi = vm.$PIXI
        //如果出現黑色的背景板,檢查 Application 設定是否正確
        vm.app = new pixi.Application({
            autoResize:true,
            backgroundColor:0xFFFFFF,
            antialias:true,
        })
        // 向 main 中加入 pixi application view(canvas)
        vm.$refs.main.appendChild(vm.app.view)
        // change the app renderer view display style block
        vm.app.renderer.view.style.display = 'block'
        // disable  the chrome default right click
        vm.$refs.main.addEventListener("contextmenu", e => {e.preventDefault()})
        window.addEventListener('resize', vm.handleResize)
        //配置信息加載完畢,向上呼叫完成
        window.pcp = vm
        vm.data = undefined
        vm.$emit('loaded')
    },
    //离开时执行的内容
    beforeDestroy(){
        let vm = this
        window.removeEventListener('resize',vm.handleResize)
        if(vm.app != undefined){
            vm.app.destroy()
        }
    }
}
</script>

<style lang="scss" scoped>
.pcp-wrapper {
	// min-height: 315px;
	height: 300px;
	// overflow-x: scroll;
}
</style>