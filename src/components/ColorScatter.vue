<template>
        <div style="width:100%;height:100%" ref='colorScatter'></div>
</template>

<script>

let vm = undefined
let PIXI = undefined
let d3 = undefined

export default {
    methods:{
        // 设定色碼表
        buildColorTable(background){
            vm.colors = []
            let raw_colormap = vm.app.renderer.extract.pixels(background)
            for(let x=0; x<512; x++){
                let color = []
                for(let y=0; y<512; y++){
                    let idx = (x + 512 * y) * 4
                    let c = raw_colormap[idx]*0x10000+raw_colormap[idx+1]*0x100+raw_colormap[idx+2]
                    color.push(c)
                }
                vm.colors.push(color) 
            }
        },
		getColor(x, y) {
			x = parseInt(x)
			y = parseInt(y)

			if (x >= 0 && y >= 0 && x < 512 && y < 512) {
				return vm.colors[x][y]
			}
			return 0xCCCCCC // default to black
		},
        pixiInit(){
            vm.app = new PIXI.Application({
                autoResize:true,
                backgroundColor: 0xffffff, //白色背景畫布
                antialias:false,
                transparent: false,
                resolution:1,                
            })
            // layout 设定
            let width = vm.$refs.colorScatter.clientWidth
            let height = vm.$refs.colorScatter.clientHeight
            vm.app.layout = {
                appWidth:width,
                appHeight:height,
            }
            // 防止绘制出现模糊现象
            vm.app.renderer.roundPixels = true
            vm.app.renderer.view.style.display = 'block'
            vm.app.renderer.resize(width,height)
            // 将 PIXI application 加入 Dom Tree
            vm.$refs.colorScatter.appendChild(vm.app.view)
            // 图表外包装设定
            vm.wrapper = new PIXI.Container()
            vm.wrapper.name = 'colorScatter'
            vm.wrapper.x = 0
            vm.wrapper.y = 0
            // vm.app.stage.addChild(vm.wrapper)
            // 主题容器
            vm.ctn = new PIXI.Container()
            vm.ctn.name = 'main_ctn'
            vm.wrapper.addChild(vm.ctn)
            // 数据点容器
            vm.ctn_pts = new PIXI.Container()
            vm.ctn_pts.name = "ctn_points"
            vm.ctn.addChild(vm.ctn_pts)
            // 数据点贴图宣告
            vm.dotTexture = vm.dotStyle()            
        },
        // 数据点的贴图
        dotStyle(){
            let g = new PIXI.Graphics
            g.lineStyle(1,0x0)
            g.beginFill(0xFFFFFF)
            // 参数 x,y,半径
            g.drawCircle(0, 0, 3)
            g.endFill()
            return g.generateCanvasTexture()
        },

        d3Init(){
            vm.x_scale = d3.scaleLinear().range([0,512])
            vm.y_scale = d3.scaleLinear().range([0,512])
        },
        // 绘制图像
        drawGraph(){
            // 背景贴图,载入贴图
            vm.bg = new PIXI.Sprite(PIXI.loader.resources['map_big.png'].texture)
            vm.bg.name = "background"
            vm.app.stage.addChild(vm.bg)
            // 储存 color array 
            vm.buildColorTable(vm.bg)
            vm.app.stage.addChild(vm.wrapper)
        },
        // 加入数据点
        addPoints(data){
            let x_extent = d3.extent(data.map(d => parseFloat(d[0])))
            let y_extent = d3.extent(data.map(d => parseFloat(d[1])))

            vm.x_scale.domain(x_extent)
            vm.y_scale.domain(y_extent)

            data.forEach(d => {
                let sp = new PIXI.Sprite(vm.dotTexture)
                
                let x = vm.x_scale(d[0])
                let y = vm.y_scale(d[1])
            
                sp.rawpos = [x,y]
                sp.x = x
                sp.y = y
                sp.tint = vm.getColor(x,y)
                sp.alpha = 0.3
                vm.ctn_pts.addChild(sp)
            });
            vm.latent = true
        },
        // 对点的位置进行位移
        pointsTransition(data){
            let x_extent = d3.extent(data.map(d => parseFloat(d[0])))
            let y_extent = d3.extent(data.map(d => parseFloat(d[1])))
            vm.x_scale.domain(x_extent)
            vm.y_scale.domain(y_extent)
            vm.ctn_pts.children.forEach((pt,i) => {
                let x = vm.x_scale(data[i][0])
                let y = vm.y_scale(data[i][1])

                pt.rawpos = [x,y]
                pt.tint = vm.getColor(x,y)
                pt.x = x
                pt.y = y
            });
        },
        removePoints(){
            vm.latent = false
            vm.ctn_pts.removeChildren()
        }
    },
    mounted(){
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI
        
        vm.latent = false

        vm.$refs.colorScatter.addEventListener('contextmenu',e => e.preventDefault())
        vm.pixiInit()
        vm.d3Init()

        if(vm.$PIXI.utils.TextureCache['map_big.png'] == undefined){
            vm.$PIXI.loader.add('map_big.png').load(()=>{
                console.log('load picture')
                vm.drawGraph()
            })
        }else{
            vm.drawGraph()
        }
    },
    beforeDestroy(){
        if(vm.app){
            vm.app.destroy()
        }
    }
}
</script>