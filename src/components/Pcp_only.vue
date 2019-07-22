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
            // 轴线设定
            vm.ctn_axis = new PIXI.Container()
            vm.ctn_axis.name = 'ctn_axis'
            vm.wrapper.addChild(vm.ctn_axis)
            // 资料折线设定
            vm.ctn_lines = new PIXI.Container()
            vm.ctn_lines.name = 'ctn_lines'
            vm.wrapper.addChild(vm.ctn_lines)
        },
        // 维度设定
        setDimensions(columns,data,extent){ 
            vm.columns = columns
            let length = vm.columns.length
            let margin = vm.app.layout.margin
            // 重新計算圖表長寬，軸線間距最小爲120px
            let slot = (vm.app.layout.width - margin.left - margin.right)/(length-1)
            vm.dim_slot = (slot<vm.min_axis_gap)?vm.min_axis_gap:slot
            let width = margin.left + margin.right + (vm.columns.length-1) * vm.dim_slot
            let height = vm.app.layout.height
            vm.app.layout.width = width
            vm.app.renderer.resize(width,height)
            // 去除资料中原始包含的日期和latent信息
            vm.data = data.map(d => {
                return d.slice(1,-2)
            })
            vm.extent = extent
            vm.d3ScaleSetting(extent)
            vm.drawAxis()
        },
        // 處理維度的 scale 
        d3ScaleSetting(extent){
            vm.scale = {}
            for(let column in extent){
                vm.scale[column] = {}
                let domain = extent[column]
                console.log(domain)
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
                // 軸線主體
                let axis = new PIXI.Container()
                // 欄位名稱顯示
                let label = vm.drawLabel(c,axis)
                // 軸線繪製主體
                let axisLine = vm.drawAxisLine(axis)
                // ticks 繪製
                let axisTicks = vm.drawAxisTicks(c,axis)

                axis.x = i * vm.dim_slot + margin.left
                
                vm.axis[c] = axis
                axis.addChild(label)
                axis.addChild(axisLine)
                axis.addChild(axisTicks)
                vm.ctn_axis.addChild(axis)
            })
        },
        // 繪製軸線
        drawAxisLine(axis){
            let axisLine = new PIXI.Graphics()
            // lineStyle 控制圖形線條的（粗細，顏色，透明度）
            axisLine.lineStyle(1,0x000000,1)
            axisLine.begin
            axisLine.moveTo(0,0)
            axisLine.lineTo(0,vm.plot_height)
            axisLine.interactive = true
            axisLine.y = axis.label.y + axis.label.height + 5
            axis.axisLine = axisLine
            return axisLine
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
                tick_label.y = axis.axisLine.y + scale(tick) - tick_label.height/2

                let tick_line = new PIXI.Graphics()
                tick_line.lineStyle(1,0x000000,1)
                tick_line.moveTo(0,0)
                tick_line.lineTo(5,0)
                tick_line.x = axis.axisLine.x - 5
                tick_line.y = tick_label.y + tick_label.height/2

                axisTicks.addChild(tick_label)
                axisTicks.addChild(tick_line)
            })
            axis.axisTicks = axisTicks
            return axisTicks
        },
        // 繪製所有資料點
        drawAllDataLine(data,color_cb){
            let ctn_lines = vm.ctn_lines

            data.forEach(data => {
                data = data.slice(1,-2)
                let latent = data.slice(-2) 
                let line = new PIXI.Graphics()
                line.lineStyle(1, 0x000000, 0)
                data.forEach((d,i) => {
                    let c = vm.columns[i]
                    let scale = vm.scale[c].scale
                    let x = vm.axis[c].x
                    let y = vm.axis[c].axisLine.y + scale(d)
                    if( i === 0 ){
                        line.moveTo(x,y)
                    }
                    else{
                        line.lineTo(x,y)
                    }
                })
                ctn_lines.addChild(line)
            })
        }
	},
	mounted() {
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI

        vm.axis = {}

        vm.pixiInit()
	},
	beforeDestroy() {
		if (vm.app !== undefined) {
			vm.app.destroy()
		}
	}
}
</script>