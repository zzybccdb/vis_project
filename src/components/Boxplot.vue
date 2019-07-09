<template>
    <!-- <v-layout ref='layout'> -->
        <div style="height:300px;overflow:auto" ref='boxplot'></div>
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
        loadData(){
            /*
                回传值包括:
                data: dimension * [max, q3, median, q1, min],
                dbname:table name,
                columns: table dimensions name
            */
            vm.$axios.get(vm.$api+'/inference/get_boxplot')
            .then((response)=>{
                vm.title = response.data.dbname
                vm.columns = response.data.columns
                vm.pixiInit()
                vm.d3Init(response.data.data)
                vm.drawGraph()
                vm.load = false
            })
			.catch(error => {
                window.error = error
                vm.columns = ['test1']
                vm.pixiInit()
                vm.d3Init({'test1':[1,3,5,7,9]})
                vm.drawGraph()
                vm.load = false
			})
        },
        // PIXI初始化设定,视窗绑定
        pixiInit(){
            let padding = 150
            let width = padding * vm.columns.length + 20
            let height = 280
            // 初始化绘图内容
            vm.app = new PIXI.Application({
                autoResize:true,
                backgroundColor: 0xfafafa,
                // backgroundColor:0x55bbaa,
                antialias:false,
                transparent: false,
                resolution:1,
            })
            vm.app.renderer.roundPixels = true
            vm.app.renderer.view.style.display = 'block'
            vm.app.renderer.resize(width,height)
            // 轉換世界座標系統
            vm.app.stage.worldTransform.fromArray([
                1,  0, 0,
                0, -1, vm.app.renderer.height,
            ])
            // 将图表加入 DOM tree
            vm.$refs.boxplot.appendChild(vm.app.view)
            // 整体图表的外包装
            vm.wrapper = new PIXI.Container()
            vm.wrapper.name = 'wrapper'
            vm.wrapper.y = 0
            vm.wrapper.x = 0
            vm.app.stage.addChild(vm.wrapper)
            vm.layout = {
                margin: {
                    l: 80,
                    r: 20,
                    b: 20,
                    t: 20,
                },
                line_lenght: 50,
                padding: padding,
            }
            // 每個軸線圖表容器
            vm.ctn = new PIXI.Container()
            vm.ctn.name = 'main ctn'
            vm.wrapper.addChild(vm.ctn)
        },
        // d3初始化设定,绑定资料和 scale
        d3Init(data){
            vm.dimensions = {}
            for(let d in data){
                let temp = {}
                temp.data = data[d]
                temp.extent = [data[d][0],data[d].slice(-1)[0]]
                if( parseInt(temp.extent[0]) === 0 && parseInt(temp.extent[1]) === 0){
                    data[d] = [-1,-0.5,0,0.5,1]
                    temp.extent = [-1,1]
                }
                temp.scale = d3.scaleLinear().domain(temp.extent).range([40,260])
                temp.name = d
                temp.ctn = new PIXI.Container()
                temp.ctn.name = d
                vm.dimensions[d] = temp
                vm.ctn.addChild(temp.ctn)
            }
        },
        // 開始繪製
        drawGraph(){
            let format = d3.format('.2s')
            vm.columns.forEach((label, i) => {  
                vm.drawTicks(format,label,i)
                vm.drawLabels(label,i)
                vm.drawBox(label,i)
                // Infobox
                vm.InfoBox = vm.InfoBoxInit()
                vm.ctn.addChild(vm.InfoBox)
            })
        },
        // 繪製刻度/標示線
        drawTicks(format,label,i){
            let ticks = vm.dimensions[label].scale.ticks(5)
            let ctn_label = new PIXI.Container()
            let horiLines = new PIXI.Container()
            ticks.forEach((item) => {
                let x = vm.layout.padding * i + vm.layout.margin.l
                let y = vm.dimensions[label].scale(item)
                let text = undefined
                let line = undefined
                // 幫 tick 制定 format, 防止數值表達式超過邊界
                if(Math.abs(item) > 1000 || Math.abs(item) < 0.0001)
                    text = vm.Text(format(item),12)
                else
                    text = vm.Text(item,12)
                text.transform.localTransform.fromArray([
                    1, 0, x-text.width, // x
                    0, -1, y+text.height/2, // y
                ])
                line = vm.drawSolidLine(x,y,x+vm.layout.line_lenght,y,0xededed)
                ctn_label.addChild(text)                    
                horiLines.addChild(line)
            })
            vm.dimensions[label].ctn.addChild(ctn_label)
            vm.dimensions[label].ctn.addChild(horiLines)
            vm.dimensions[label].ctn_label = ctn_label                
        },
        // 繪製 dimension name
        drawLabels(label,i){
            let text = vm.Text(label)
            let x = vm.layout.padding * i + vm.layout.margin.l + vm.layout.line_lenght / 2 - text.width / 2
            let y = 20
            text.transform.localTransform.fromArray([
                1, 0, x, // x
                0, -1, y, // y
            ])
            vm.dimensions[label].ctn.addChild(text)
        },
        // 繪製箱型圖
        drawBox(label,i){
            let l = vm.layout.line_lenght - 10
            let data = vm.dimensions[label].data
            let x = vm.layout.padding * i + vm.layout.margin.l
            let ctn_box = new PIXI.Container()
            ctn_box.interactive = true
            ctn_box.buttonMode = true
            let horiLines = new PIXI.Container()
            let median = new PIXI.Container()
            let box = new PIXI.Graphics()
            // 繪製最大最小線段和垂直線
            let horiline = undefined
            let vertiLine = undefined
            let miny = vm.dimensions[label].scale(data[0])
            horiline = vm.drawSolidLine(x+20,miny,x+30,miny,0x3273b2)   
            horiLines.addChild(horiline)
            let maxy = vm.dimensions[label].scale(data.slice(-1))
            horiline = vm.drawSolidLine(x+20,maxy,x+30,maxy,0x3273b2)   
            horiLines.addChild(horiline)
            vertiLine = vm.drawSolidLine(x+vm.layout.line_lenght/2,miny,x+vm.layout.line_lenght/2,maxy,0x3273b2)
            horiLines.addChild(vertiLine)
            // 繪製中位數線
            let mediany = vm.dimensions[label].scale(data[2])
            horiline = vm.drawSolidLine(x+10,mediany,x+40,mediany,0x3273b2)   
            median.addChild(horiline)
            // 繪製 q1 , q3 box
            let v1 = vm.dimensions[label].scale(data[1])
            let v2 = vm.dimensions[label].scale(data[3])
            box.lineStyle(2, 0x3273b2, 1);
            box.beginFill(0x98b9d8)
            box.drawRect(x+10, v1, l-10, v2-v1,);
            box.endFill()
            ctn_box.addChild(horiLines)
            ctn_box.addChild(box)
            ctn_box.addChild(median)
            // 設定鼠標觸控區域
            ctn_box.hitArea = new PIXI.Rectangle(x, miny, vm.layout.line_lenght, maxy);
            ctn_box.mouseover = () => {vm.showInfo(data,i)}
            ctn_box.mouseout = () => {vm.InfoBox.alpha = 0}
            vm.dimensions[label].ctn_box = ctn_box
            vm.dimensions[label].ctn.addChild(ctn_box)
        },
        // 初始化 inforbox
        InfoBoxInit(){
            let text = ['MIN: ','Q1:','Media: ','Q3: ','MAX: ']
            let slot = (vm.app.renderer.height - vm.layout.margin.t - vm.layout.margin.b) / 4
            let ctn = new PIXI.Container()
            vm.info = []
            text.forEach((t,i) => {
                let x = vm.layout.margin.l - 20
                let y = slot * i + 20
                let content1 = vm.Text(t,12,0xffffff)
                let content2 = vm.Text('222',12,0xffffff)

                content1.transform.localTransform.fromArray([
                    1, 0, x+3,// x
                    0, -1, y+content1.height+3, // y
                ])
                content2.transform.localTransform.fromArray([
                    1, 0, x+3+content1.width+3,// x
                    0, -1, y+content1.height+3, // y
                ])

                let box = new PIXI.Graphics()
                box.lineStyle(2,0xffffff,1)
                box.beginFill(0x3273b2)
                box.drawRect(x,y,100,content1.height+6)
                box.endFill()
                ctn.addChild(box)
                ctn.addChild(content1)
                ctn.addChild(content2)
                vm.info.push(content2)
            })
            ctn.alpha = 0
            return ctn
        },
        // 顯示 inforbox 信息
        showInfo(data,i){ 
            vm.InfoBox.x = vm.layout.padding * (i-1) + vm.layout.margin.l + 20
            vm.InfoBox.alpha = 1
            let format = d3.format('.6r')
            vm.info.forEach((t,i)=>{
                t.text = String(format(data[i]))
            })
        },
        // 处理 web resize 
        handleResize() {
            let width = vm.$refs.boxplot.clientWidth
            let height = vm.$refs.boxplot.clientHeight
            vm.app.renderer.resize(width, height);
            // 转换 PIXI 世界坐标系，变为以左下角为原点
            vm.app.stage.worldTransform.fromArray([
                1,  0, 0,
                0, -1, vm.app.renderer.height,
            ])
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
        // 绘制文本, 存在字體 
        Text(content='no text',fontSize=15,fill='0x000000'){
            let text = new PIXI.Text(content,{
                fontFamily:'Arial',
                // fontStyle:'bold',
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
        vm.boxplot = vm.$refs.boxplot
        PIXI.settings.PRECISION_FRAGMENT= 'highp'
        vm.loadData()
        // 动态调整 app 长宽比例
        // window.addEventListener('resize', vm.handleResize)
    },
	beforeDestroy() {
		if (vm.app !== undefined) {
			vm.app.destroy()
		}
	}
}
</script>