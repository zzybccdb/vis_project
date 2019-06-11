<template>
    <!-- <v-layout ref='layout'> -->
        <div style="height:300px" ref='boxplot'></div>
    <!-- </v-layout> -->
</template>
<script>
// 一个颜色表的 lib
import Palette from '@/palette.js'

let vm = undefined
let PIXI = undefined

export default {
    props:['title'],
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
        load(){
            vm.$axios.get(vm.$api+'/inference/get_boxplot')
            .then((response)=>{
                vm.title = response.data.dbname
                vm.data = response.data.data
                vm.columns = response.data.columns
                vm.pixiInit()
            })
			.catch(error => {
				window.error = error
				console.log(error)
			})
        },
        // 初始化绘图
        pixiInit(){
            // 初始化绘图内容
            vm.app = new PIXI.Application({
                autoResize:true,
                // backgroundColor: 0xfafafa,
                backgroundColor:0x55bbaa,
                antialias:true,
            })
            vm.app.renderer.view.style.display = 'block'
            vm.padding = 50
            // window.addEventListener('resize', vm.handleResize)
            vm.handleResize()
            console.log("APP长宽：",vm.app.renderer.width,vm.app.renderer.height)
            console.log("padding宽度",50)
            // 将图表加入 DOM tree
            vm.$refs.boxplot.appendChild(vm.app.view)
            // 整体图表的外包装
            vm.wrapper = new PIXI.Container()
            vm.wrapper.name = 'wrapper'
            vm.wrapper.y = 100
            vm.wrapper.x = vm.padding
            vm.app.stage.addChild(vm.wrapper)
            console.log("wrapper 起始点 50，50")
            // 绘制 title
            let title_text = vm.Text(vm.title)
            console.log(vm.app.renderer.height-title_text.height-40)
            console.log(title_text.height)
            // 将 title 移动至图表中心
            title_text.transform.localTransform.fromArray([
                1, 0, (vm.app.renderer.width-vm.padding*2)/2-title_text.width/2,
                0, -1, vm.app.renderer.height-title_text.height-40,
            ])
            vm.wrapper.addChild(title_text)
            // 绘制 x 轴
            let Xaxis = new PIXI.Container()
            Xaxis.name = 'Xaxis'
            let line = vm.drawAxis(vm.app.renderer.width-vm.padding*2,0,"Xaxis")
            Xaxis.addChild(line)
            // let ticks = 
            vm.wrapper.addChild(Xaxis)
        },
        // 处理 web resize 
        handleResize() {
            vm = this;
            let width = vm.$refs.boxplot.clientWidth
            let height = vm.$refs.boxplot.clientHeight
            vm.app.renderer.resize(width, height);
            // 转换 PIXI 世界坐标系，变为以左下角为原点
            vm.app.stage.worldTransform.fromArray([
                1,  0, 0,
                0, -1, vm.app.renderer.height,
            ])
        },
        // 绘制轴线
        drawAxis(x,y,name){
            // 绘制轴线
            let axis = new PIXI.Graphics()
            axis.name = name
            axis.lineStyle(1, 0x000000, 1)
            axis.moveTo(0, 0)
            axis.lineTo(x, y)
            return axis
        },
        // 绘制ticks
        drawTicks(){

        },
        // 绘制文本
        Text(content='no text',font="Arial",fontSize='18',fill='0x000000',align='center'){
            let text = new PIXI.Text(content,{
                fontFamily:font,
                fontSize:fontSize,
                fill:fill,
                align:'center'
            })
            return text
        }
    },
    mounted(){  
        vm = this
        PIXI = vm.$PIXI
        vm.boxplot = vm.$refs.boxplot
        
        vm.load()
    }
}
</script>