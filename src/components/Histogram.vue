<template>
    <!-- <v-layout ref='layout'> -->
        <div style="width:100%;" ref='histogram'></div>
    <!-- </v-layout> -->
</template>
<script>
let vm = undefined
let PIXI = undefined
let d3 = undefined

export default {
    components: {
    },
    data: () => {
        return {
        };
    },
    created(){
        let vm = this
        vm.app = undefined
    },
    methods:{
        // 加载资料
        // response data 包含 hist（纵轴）， bin_edges（横轴）
        loadData(){
            vm.root = vm.eventBus.root
            vm.$axios.get(vm.$api+'/inference/get_histogram')
            .then((response)=>{
                console.log(response.data)
                vm.data = response.data.data
                vm.columns = response.data.columns
                vm.count = vm.columns.length
                vm.appWidth = vm.$refs.histogram.clientWidth
                vm.pixiInit()
                vm.d3Init(vm.data)
                vm.drawGraph()
            })
            .catch(error => {
                window.error = error
                console.log(error)
            }) 
        },
        // PIXI初始化设定,视窗绑定
        pixiInit(){
            vm.layout = {
                margin:{
                    l:20,
                    r:20,
                    b:20,
                    t:20,
                },
                height: 300,
            }
            // Math.ceil(number) 向上取整
            vm.appHeight = vm.layout.height * Math.ceil(vm.count/2)
            vm.root.$refs.histWrapper.style.height = vm.appHeight
            // 初始化绘图内容
            vm.app = new PIXI.Application({
                autoResize:true,
                backgroundColor: 0xffffff, //白色背景畫布
                antialias:false,
                transparent: false,
                resolution:1,
            })
            vm.app.renderer.roundPixels = true
            vm.app.renderer.view.style.display = 'block'
            vm.app.renderer.resize(vm.appWidth,vm.appHeight)
            PIXI.settings.PRECISION_FRAGMENT = window.devicePixelRatio
            // 將圖表加入 DOM tree
            vm.$refs.histogram.appendChild(vm.app.view)
            // 圖表整體外包裝
            vm.wrapper = new PIXI.Container()
            vm.wrapper.name = 'histogram_wrapper'
            vm.wrapper.x = 0
            vm.wrapper.y = 0 
            // 將包裝紙加入畫布
            vm.app.stage.addChild(vm.wrapper)
            // 主體容器 
            vm.ctn  = new PIXI.Container()
            vm.ctn.name = 'main.ctn'
            vm.wrapper.addChild(vm.ctn)
        },      
        // d3初始化设定,绑定资料和 scale
        d3Init(data){
            vm.dimensions = {}
            let width = vm.appWidth / 2 
            let height = vm.layout.height
            for(let d in data){
                let temp = {}
                if(!data[d].error){
                    temp.hist_extent = d3.extent(data[d].hist)
                    temp.bin_edges_extent = d3.extent(data[d].bin_edges)
                    // console.log(d,temp.bin_edges_extent)
                    temp.hist_scale = d3.scaleLinear()
                                        .domain(temp.hist_extent)
                                        .range([vm.layout.margin.t,height-vm.layout.margin.b-vm.layout.margin.t])
                    console.log([vm.layout.margin.t,height-vm.layout.margin.b-vm.layout.margin.t])
                    temp.bin_edges_scale = d3.scaleLinear()
                                        .domain(temp.bin_edges_extent)
                                        .range([2*vm.layout.margin.l,width-vm.layout.margin.r-20])
                    temp.ctn = new PIXI.Container()
                    temp.ctn.name = d
                    temp.error = false
                    vm.ctn.addChild(temp.ctn)
                }
                else{
                    temp.error = true
                }
                vm.dimensions[d] = temp
            }
        },
        // 開始繪製
        drawGraph(){
            vm.drawAxis()
            vm.drawHist()
        },
        // 绘制轴线
        drawAxis(){
            vm.columns.forEach((label,i) => {
                let temp = vm.dimensions[label]
                // 起始坐标
                let orgx = vm.layout.margin.l*2
                let orgy = vm.layout.margin.t
                //  单张 histogram 的长宽
                let graphWidth = vm.appWidth/2-vm.layout.margin.l
                let graphHeight = vm.layout.height-vm.layout.margin.t-vm.layout.margin.b
                // 每张图表的位移位置
                let x = vm.layout.margin.t + (0===i%2?0:vm.appWidth/2)
                let y = vm.layout.margin.l + parseInt(i/2) * vm.layout.height
                if(!temp.error){
                    let text = vm.Text(temp.ctn.name,12)
                    // Label 居中
                    text.x = vm.appWidth/4-text.width/2
                    let yAxis = vm.drawSolidLine(orgx,orgy,orgx,graphHeight)
                    let xAxis = vm.drawSolidLine(orgx,graphHeight,graphWidth,graphHeight)
                    console.log(orgy,graphHeight)
                    // 绘制刻度
                    let xTicks = vm.drawxTicks(label,0,graphHeight,orgx)
                    let yTicks = vm.drawyTicks(label,0,graphHeight+vm.layout.margin.t,orgx)

                    temp.ctn.addChild(text)
                    temp.ctn.addChild(xAxis)
                    temp.ctn.addChild(yAxis)
                    temp.ctn.addChild(xTicks)
                    temp.ctn.addChild(yTicks)
                } 
                else{
                    let text = vm.Text('DATA ERROR',40)
                    text.x = vm.appWidth/4-text.width/2
                    text.y = vm.layout.height/2-text.height/2
                    temp.ctn.addChild(text)
                }
                temp.ctn.x = x 
                temp.ctn.y = y
            });
        },
        // 繪製Hist
        drawHist(){

        },
        // 绘制刻度
        drawxTicks(label,x,y,orgx){
            let ticks_ctn = new PIXI.Container()
            let scale = vm.dimensions[label].bin_edges_scale
            let ticks = scale.ticks(5)
            
            ticks.forEach(tick =>{
                let text = vm.Text(tick,10)
                text.y = y+10
                text.x = x + scale(tick) 
                let line = vm.drawSolidLine(text.x,y,text.x,y+5)
                text.x -= text.width/2
                ticks_ctn.addChild(text)
                ticks_ctn.addChild(line)
            })

            return ticks_ctn
        },
        drawyTicks(label,x,y,orgx){
            let ticks_ctn = new PIXI.Container()
            let scale = vm.dimensions[label].hist_scale
            let ticks = scale.ticks(5)

            ticks.forEach(tick =>{
                let text = vm.Text(tick,10)
                text.y = y - scale(tick)
                text.x = x
                let line = vm.drawSolidLine(orgx,text.y,orgx-5,text.y)
                text.y -= text.height/2
                ticks_ctn.addChild(text)
                ticks_ctn.addChild(line)
            })

            return ticks_ctn
        },
        // 绘制實線
        drawSolidLine(x1,y1,x2,y2,color,name=undefined){
            // 绘制轴线
            let axis = new PIXI.Graphics()
            axis.name = name
            // 线宽 1 跟 2 其实是一样的,但是因为渲染的问题,奇数单位的线宽会变得比较模糊不清楚
            axis.lineStyle(2, color, 1)
            axis.moveTo(x1, y1)
            axis.lineTo(x2, y2)
            return axis
        },
        // 绘制文本
        Text(content='no text',fontSize=15,fill='0x000000'){
            let text = new PIXI.Text(content,{
                fontFamily:'Arial',
                fontStyle:'bold',
                fontSize:fontSize,
                fill:fill,
                align:'center',
            })
            text.resolution = 1
            return text
        }
    },
    mounted(){  
        vm = this
        vm.load = true

        PIXI = vm.$PIXI
        d3 = vm.$d3
        // 动态调整 app 长宽比例
        // window.addEventListener('resize', vm.handleResize)
    }
}
</script>