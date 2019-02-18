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
        handleResize(){
            let vm = this
            let width = vm.$refs.main.clientWidth
            let height = vm.$refs.main.clientHeight
            //重置 pixi application 的長寬
            vm.app.renderer.resize(width,height)
            vm.adjustAxisPosition()
            vm.adjustTicks()
        },    

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
			let firstAxis = axis[0]
            let lastAxis = axis[axis.length - 1]

            let axis_gap = vm.plot_width / (axis.length - 1)
			axis.forEach((a, ai) => {
				a.grp.alpha = 1
				if (!a.grp.dragging) {
					a.grp.x = ai * axis_gap
                }
				a.idx = ai
			})
        },  
        
        adjustTicks(){
            let vm = this
            let d3 = vm.$d3
            let data = vm.eventBus.data
            console.log(vm.ctn.axis)
            vm.ctn.axis.forEach(axis => {
                let dim_data = data.map(d => {
                    return parseFloat(d[axis.index])
                })
                
                axis.extent = d3.extent(dim_data)
                console.log(axis.extent) 
            })
        },

        init(){
            let vm =this
            vm.timeslot = {
                'year':"YYYYMMDD",
                'month':"YYYYMMDDHH",
                'day':"YYYYMMDDHHmm"
            }
            // pcp 初始設定
            vm.pixiInit()
            //儲存所有圖形數據的容器
            vm.ctn = {}
            vm.ctn.axis = []
            console.log(vm.eventBus.data)
            console.log(vm.eventBus.lossdf)
            //繪製軸線
            vm.eventBus.columns.forEach((item,i) => {
                //得到原始 dimension index
                let dim_index = vm.eventBus.org_columns.indexOf(item)
                vm.addAxis(item, i, dim_index)
            })
            //調整視窗大小,座標軸分佈
            vm.handleResize()
            //對資料的日期欄位進行整理
            vm.processData()
        },

        pixiInit(){
            let vm = this
            let pixi = vm.$PIXI
            vm.init_alpha = 0.4 
            vm.min_axis_gap = 40
            vm.plot_height = 190
            vm.font = 'Arial'
            vm.font_size = 14
            vm.tick_length = 5
            vm.indicator_radius = 5
            vm.margin = 40
            vm.filterbox_width = 10
            vm.init_color = 0xff0000
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
            label.on('rightdown', e => vm.axisStartDrag(e,grp_axis))
            label.on('mousemove', e => vm.axisDragging(e,grp_axis))
            label.on('rightup', e => vm.axisStopDrag(gr_axis))
            //指示符
            let indicator = vm.drawIndicator(index,label)
            grp_axis.addChild(indicator)
            //軸線
            let axis_line = vm.drawAxisLine(indicator)
            //設定線條過濾滑塊
            axis_line.on('mouseodown', e => vm.drawFilterStart(e,axis_line,grp_axis))
            axis_line.on('mousemove', e => vm.selectingRange(e,axis_line,grp_axis))
            axis_line.on('mousemove', e => vm.drawFilterEnd(e,axis_line,grp_axis))
            grp_axis.addChild(axis_line)
            // //刻度指示符
            // let ctn_ticks = new pixi.Container()
            // grp_axis.addChild(ctn_ticks)

            grp_axis.dragging = false
			grp_axis.child_dict = {
				label,axis_line,
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

        axisStartDrag(axis, grp_axis){},
        axisDragging(axis,grp_axis){},
        axisStopDrag(grp_axis){},

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

        drawFilterStart(e,axis_line,grp_axis){},
        selectingRange(e,axis_line,grp_axis){},
        drawFilterEnd(e,axis_line,grp_axis){},

        updateData(){
            let vm = this 
            let pixi = vm.$PIXI
        },
        //調整爲可以比較的時間大小模式
        processData(){
            let vm = this
            let moment = vm.$moment
            let pixi = vm.$PIXI
            let level = vm.eventBus.calLevel
            let format = vm.timeslot[level]
            vm.eventBus.data.forEach(item => {
                item[0] = moment(item[0]).format(format)
                //添加線條
                let line = new pixi.Graphics()
                vm.ctn_lines.addChild(line)
                item.pcp = line
            })
        },
        //繪製線條
        drawDataLine(){
            let vm = this
            vm.eventBus.data.forEach(item => {
                if(item.pcp){
                    let line = item.pcp
                    //清除 canvas renderer 等信息
                    line.clear()
                    //0xffffff 表示的是白色
                    line.lineStyle(2, 0xFFFFFF)
                    line.tint = vm.init_color

                }
            })
        }
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