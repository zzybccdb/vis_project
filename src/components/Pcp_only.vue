<template>
    <div class="pcp-wrapper" style="width:100%;height:315px;overflow-x:scroll;" ref="home"></div>
</template>

<script>
let vm = undefined
let d3 = undefined
let PIXI = undefined
export default {
	components: {},
	data() {
		return {
			
		}
    },
    created(){

    },
	methods: {  
        // pixi 初始化设定
        pixiInit(){
            vm.line_alpha = 0.4
            vm.min_axis_gap = 120
            vm.filterbox_width = 10
            vm.plot_height = 190
            vm.font = 'Arial'
            vm.font_size = 14
            vm.tick_length = 5
            vm.indicator_radius = 5
            vm.dim_slot = 120
            // 初始长宽设定
            let width = vm.$refs.home.clientWidth
            let height = vm.$refs.home.clientHeight 
            vm.app = new PIXI.Application({
                autoResize:true,
                backgroundColor:0xffffff,
                antialias:true,
                transparent: false,
                resolution:1,         
            })
            vm.app.layout = {
                'width': width,
                'height': height,
                'margin':{
                    'left':60,
                    'right':40
                }
            }
            PIXI.settings.PRECISION_FRAGMENT= 'highp'
            vm.app.renderer.roundPixels = true
            vm.app.renderer.view.style.display = 'block'            
            vm.app.renderer.resize(width,height)
            vm.$refs.home.appendChild(vm.app.view)
            // 外包装设定
            vm.wrapper = new PIXI.Container()
            vm.wrapper.name = 'PCP'
            vm.wrapper.x = 0
            vm.wrapper.y = 0
            vm.app.stage.addChild(vm.wrapper)
            // 资料折线设定
            vm.ctn_lines = new PIXI.Container()
            vm.ctn_lines.name = 'ctn_lines'
            vm.wrapper.addChild(vm.ctn_lines)
            // 轴线设定
            vm.ctn_axis = new PIXI.Container()
            vm.ctn_axis.name = 'ctn_axis'
            vm.wrapper.addChild(vm.ctn_axis)
            // 记录 filter box
            vm.filter_box = []
        },
        // 维度设定
        setDimensions(columns,data,extent){ 
            vm.columns = columns
            let length = vm.columns.length
            let margin = vm.app.layout.margin
            let latent_scatter = vm.eventBus.latent_scatter
            // 重新計算圖表長寬，軸線間距最小爲120px
            let slot = (vm.app.layout.width - margin.left - margin.right)/(length-1)
            vm.dim_slot = (slot<vm.min_axis_gap)?vm.min_axis_gap:slot
            let width = margin.left + margin.right + (vm.columns.length-1) * vm.dim_slot
            let height = vm.app.layout.height
            vm.app.layout.width = width
            vm.app.renderer.resize(width,height)
            // 去除资料中原始包含的日期和latent信息
            vm.data = data.map(d => {
            //    return d.slice(1,-2)
                return latent_scatter.filterSelectedDimData(d)
            })
            vm.extent = extent
            vm.d3ScaleSetting(extent)
            vm.drawAxis()
            // vm.drawAllDataLine()
        },
        // 處理維度的 scale 
        d3ScaleSetting(extent){
            vm.scale = {}
            for(let column in extent){
                vm.scale[column] = {}
                let domain = extent[column]
                let range = domain[1] - domain[0]
                let gap = range / 4
                vm.scale[column]['scale'] = d3.scaleLinear().domain(domain).range([190,0])
                let ticks = [parseFloat(domain[0]).toFixed(4)]
                for(let i = 1; i < 4; i++){
                    ticks.push(parseFloat(domain[0]+i*gap).toFixed(4))
                }
                ticks.push(parseFloat(domain[1]).toFixed(4))
                ticks = new Set(ticks)
                vm.scale[column]['ticks'] = ticks
            }
        },
        // 軸線繪製內容
        drawAxis(){
            let margin = vm.app.layout.margin
            vm.columns.forEach((c,i) => {
                vm.axis[c] = {}
                // 軸線主體
                let axis = new PIXI.Container()
                // 欄位名稱顯示
                let label = vm.drawLabel(c,axis)
                // 軸線繪製主體
                let axisLine = vm.drawAxisLine(c,axis)
                // ticks 繪製
                let axisTicks = vm.drawAxisTicks(c,axis)

                axis.x = i * vm.dim_slot + margin.left
                
                // vm.axis[c] = axis
                vm.axis[c].ctn = axis
                axis.addChild(label)
                axis.addChild(axisLine)
                axis.addChild(axisTicks)
                vm.ctn_axis.addChild(axis)
            })
        },
        // 繪製軸線
        drawAxisLine(c,axis){
            // 单一 ctn_axisLine 包含两个 axisLine 以及 hitArea
            let ctn_axisLine = new PIXI.Container()
            let axisLine = new PIXI.Graphics()
            // let hitArea = new PIXI.Graphics()
            // lineStyle 控制圖形線條的（粗細，顏色，透明度）
            axisLine.lineStyle(1,0x000000,1)
            axisLine.begin
            axisLine.moveTo(0,0)
            axisLine.lineTo(0,vm.plot_height)
            axisLine.interactive = true
            axisLine.buttonmode = true

            axisLine.rightdown = vm.drawFilterStart
            axisLine.mousemove = vm.filterResize
            axisLine.rightup = vm.drawFilterEnd
            axisLine.mouseout = vm.drawMouseOut
            axisLine.mousedown = vm.removeFilterBox

            axisLine.hitArea = new PIXI.Rectangle(axisLine.x-10, axisLine.y,20,190)
            axisLine.y = axis.label.y + axis.label.height + 5
            axisLine.label = c
            let filter_box = new PIXI.Container()
            axisLine.filter_box = filter_box
            // 繪製 hitArea
            // hitArea.lineStyle(1,0x000000,1)
            // hitArea.beginFill(0xffffff)
            // hitArea.drawRect(axisLine.x-10, axisLine.y,20,190)
            // hitArea.endFill()
            // ctn_axisLine.addChild(hitArea)

            // 儲存當前的 axisLine
            vm.axis[c].axisLine = axisLine
            vm.axis[c].filter_box = filter_box  

            ctn_axisLine.addChild(axisLine)
            ctn_axisLine.addChild(filter_box)
            return ctn_axisLine
        },
        // 繪製 Dimension 名稱
        drawLabel(column, axis){
			let label = new PIXI.Text(column
			, {fontFamily : vm.font, fontSize: vm.font_size, fill : 0x000000, align : 'center'})
			label.x = -vm.indicator_radius * 2
			label.rotation = - Math.PI / 6
            label.y = 50
            axis.label = label
            return label
        },
        // 繪製 ticks
        drawAxisTicks(column, axis){
            let scale = vm.scale[column].scale
            let ticks = vm.scale[column].ticks
            let axisTicks = new PIXI.Container()
            let format1 = d3.format('.4s')
            let format2 = d3.format('.2f')
            ticks.forEach(tick => {
                let text = format2(tick)
                // if(tick > 1)
                //     text = format1(tick)
                // else
                //     text = format2(tick)
                let tick_label = new PIXI.Text(
                    text,
                    {
                        fontFamily : vm.font, 
                        fontSize: 12, 
                        fill : 0x000000, 
                        align : 'center'
                    }                       
                )
                tick_label.x = axis.label.x - tick_label.width - 10
                tick_label.y = vm.axis[column].axisLine.y + scale(tick) - tick_label.height/2

                let tick_line = new PIXI.Graphics()
                tick_line.lineStyle(1,0x000000,1)
                tick_line.moveTo(0,0)
                tick_line.lineTo(5,0)
                tick_line.x = vm.axis[column].axisLine.x - 5
                tick_line.y = tick_label.y + tick_label.height/2

                axisTicks.addChild(tick_label)
                axisTicks.addChild(tick_line)
            })
            axis.axisTicks = axisTicks
            return axisTicks
        },
        // 繪製選中資料點
        drawMaskDataLine(mask_pts, color_cb=undefined){
            let latent_scatter = vm.eventBus.latent_scatter
            mask_pts.forEach(pt => {
                let data = latent_scatter.filterSelectedDimData(pt.data)
                let line = new PIXI.Graphics()
                line.lineStyle(1, 0xffffff, 1)

                data.forEach((d,i) => {
                    let c = vm.columns[i]
                    let scale = vm.scale[c].scale
                    let x = vm.axis[c].ctn.x
                    let y = vm.axis[c].axisLine.y + scale(d)
                    if( i === 0 ){
                        line.moveTo(x,y)
                    }
                    else{
                        line.lineTo(x,y)
                    }
                    line.tint = (color_cb)?color_cb(pt.x,pt.y):0x000000
                    line.alpha = 0.4
                })
                vm.ctn_lines.addChild(line)               
            })
        },
        // 移除當前的 data line
        removeLines(){
            vm.ctn_lines.removeChildren()
        },
        // 刪除 filter box 
        removeFilterBox(e){
            let axisLine = e.currentTarget
            let label = axisLine.label
            let py = e.data.global.y - axisLine.y
            let box = axisLine.filter_box.children.filter(box => {
                let [min,max] = box.extent.map(y => {
                    return vm.scale[label].scale(y)
                })
                return max >= py && min <= py
            })[0]
            if(box !== undefined){
                axisLine.filter_box.removeChild(box)
                vm.removeLines()
                let [mask_pts,cb] = vm.eventBus.latent_scatter.pcpFilter(vm.columns,vm.axis)
                vm.drawMaskDataLine(mask_pts,cb)
            }
        },
        // 基本的 filter box 元件繪製
        initFilterBox(axis,box,x1,y1,width,height){
            box.clear()
            box.lineStyle(1,0x000000,1)
            box.beginFill(0xffffff)
            box.drawRect(x1,y1,width,height)
            box.endFill()
        },
        // 開始繪製 filter box
        drawFilterStart(e){
            vm.filter_start = true
            // filter start point
            vm.filter_sp = [e.data.global.x, e.data.global.y]
            let axis = e.currentTarget
            let box = new PIXI.Graphics()
            vm.initFilterBox(axis,box,0,0,0,0)
            axis.filter_box.addChild(box)
            e.axis = axis
        },
        // 改變 filter box 長度
        filterResize(e){
            if(vm.filter_start){
                let axis_y = - e.currentTarget.y
                let y1 = vm.filter_sp[1]
                let y2 = e.data.global.y
                let axis = e.axis
                let current_box = axis.filter_box.children.slice(-1)[0]
                if( 0 > (y2-y1) ){
                    vm.initFilterBox(axis,current_box,axis.x-10,y2,20,y1-y2)
                    // 直接負數值繪製時，在開啓交互模式時會錯誤
                }
                else{
                    vm.initFilterBox(axis,current_box,axis.x-10,y1,20,y2-y1)
                }
                current_box.extent = [y1-axis.y,y2-axis.y]
            }
        },
        // 結束繪製
        drawFilterEnd(e){
            if(vm.filter_start){
                let axis = e.axis
                let current_box = axis.filter_box.children.slice(-1)[0]
                let label = axis.label
                if(current_box){
                    let scale = vm.scale[label].scale
                    let x1 = scale.invert(current_box.extent[0])
                    let x2 = scale.invert(current_box.extent[1])
                    current_box.extent = [Math.max.apply(null,[x1,x2]),Math.min.apply(null,[x1,x2])]
                }
                // filter box start position
                vm.filter_sp = undefined
                vm.filter_start = false
                vm.removeLines()
                let [mask_pts,cb] = vm.eventBus.latent_scatter.pcpFilter(vm.columns,vm.axis)
                vm.drawMaskDataLine(mask_pts,cb)
            }
        },
        // mouseout
        drawMouseOut(e){
            vm.drawFilterEnd(e)
        }

	},
	mounted() {
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI

        vm.axis = {}

        vm.pixiInit()
        vm.$refs.home.addEventListener('contextmenu', e => {e.preventDefault()})
	},
	beforeDestroy() {
		if (vm.app !== undefined) {
			vm.app.destroy()
		}
	}
}
</script>