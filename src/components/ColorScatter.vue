<template>
        <div id='colorScatter' style="width:100%;height:100%;margin:10px" ref='colorScatter'></div>
</template>

<script>
// Home view 下所使用到的 training 過程觀察的 scatter plot 組件
// 參考 components/colormap.vue

let vm = undefined
let PIXI = undefined
let d3 = undefined

export default {
    methods:{
        // 设定色碼表
        buildColorTable(background){
            vm.colors = []
            let raw_colormap = vm.app.renderer.extract.pixels(background)
            // raw_colormap 是由　pixel 數量 × 【r,g,b,a】 的 array
            // r，g，b，a 取值都是 0～255
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
            vm.app.autoResize = true
            vm.app.renderer.resize(width,height)
            // 設定 app 的鼠標操作
            vm.app.stage.interactive = true
            vm.app.stage.buttonmode = true
            vm.app.stage.rightdown = vm.rightdownRotate
            vm.app.stage.mousemove = vm.mousemoveRotate
            vm.app.stage.rightup = vm.rightupRotate
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
            vm.ctn_pts.interactive = true
            vm.ctn_pts.buttonmode = true
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
        // d3 axis scale initial
        d3Init(){
            vm.x_scale = d3.scaleLinear().range([0,512])
            vm.y_scale = d3.scaleLinear().range([0,512])
            // 縮放參數設定
            let zoom = d3.zoom()
                    .on('zoom',vm.zoomed)
            d3.select('#colorScatter').call(zoom)
            vm.zoom = zoom
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
            vm.domainSetting(data)
            data.forEach(d => {
                let sp = new PIXI.Sprite(vm.dotTexture)
                vm.setPointLocation(sp,d[0],d[1])
                sp.alpha = 0.3
                vm.ctn_pts.addChild(sp)
            });
            vm.latent = true
        },
        // 將點放置到正確的位置
        pointsTransition(data){
            vm.domainSetting(data)
            vm.ctn_pts.children.forEach((pt,i) => {
                vm.setPointLocation(pt,data[i][0],data[i][1])
            });
        },
        // scale domain 設定
        domainSetting(data){
            let x_extent = d3.extent(data.map(d => parseFloat(d[0])))
            let y_extent = d3.extent(data.map(d => parseFloat(d[1])))
            vm.x_scale.domain(x_extent)
            vm.y_scale.domain(y_extent)            
        },
        // 設定資料點的座標位置, 傳入pt, Latent_x, Latent_y
        setPointLocation(pt,x,y){
            x = vm.x_scale(x)
            y = vm.y_scale(y)

            pt.rawpos = [x,y]
            pt.curpos = [x,y]
            // rotation 和 zooming 時的參考座標
            pt.refpos = [x,y]
            pt.tint = vm.getColor(x,y)
            pt.x = pt.curpos[0]
            pt.y = pt.curpos[1]
        },
        // 移除資料點
        removePoints(){
            vm.latent = false
            vm.ctn_pts.removeChildren()
        },
        // 數據點的縮放 Zoom
        zoomed(){ 
            vm.transform = d3.event.transform
            vm.applyZoom()
        },
        // 縮放，平移 矩陣公式
        // [ 1, 0, x軸平移距離 ] [x] => [x']
        // [ 0, 1, y軸平移距離 ] [y] => [y']
        // [ 0, 0, 1 ]         [1] => [1]
        applyZoom(){
            vm.zoom_dirty = true
            vm.rotation_acc = 0
            if(vm.rotate_dirty){
                vm.ctn_pts.children.forEach(pt => {pt.refpos=pt.curpos})
                vm.rotate_dirty = false
            }
            vm.ctn_pts.children.forEach(pt => {
                let new_pos = vm.transform.apply(pt.refpos)
                pt.curpos = new_pos
                pt.x = pt.curpos[0]
                pt.y = pt.curpos[1]
                pt.tint = vm.getColor(pt.x,pt.y)
            })
        },
        // 右鍵旋轉操作
        rightdownRotate(e){
            vm.rotating = true
            //  以圖形中心爲旋轉點
            // Math.atan2 回傳弧度
            vm.ang1 = Math.atan2(e.data.global.y - 256, e.data.global.x - 256)
        },
        // 右鍵旋轉移動
        mousemoveRotate(e){
            if (e.data.global.y >= 512 || e.data.global.y < 0 ||  e.data.global.x >= 512 ||  e.data.global.x < 0 ){
                vm.rotating = false
                vm.rotation_acc = vm.rotation
            }
            if (vm.rotating) {
                vm.rotation = Math.atan2(e.data.global.y - 256, e.data.global.x - 256) - vm.ang1 + vm.rotation_acc
                vm.rotate(vm.rotation)
            }            
        },
        // 停止旋轉
        rightupRotate(){
            vm.rotating = false
            vm.rotation_acc = vm.rotation
        },
        // 旋轉矩陣公式
        // [ cos角度 -sin角度 ] [x] => [x']
        // [ sin角度 cos角度 ]  [y] => [y']
        rotate(rad){
            // 旋轉矩陣公式
            let cos = Math.cos(rad)
            let sin = Math.sin(rad)
            if(vm.zoom_dirty){
                vm.ctn_pts.children.forEach(pt => {pt.refpos=pt.curpos})
                vm.$d3.select('#colorScatter').call(vm.zoom.transform, d3.zoomIdentity)
                vm.zoom_dirty = false
                console.log('reset zoom')
            }
            vm.ctn_pts.children.forEach(pt => {
                let tx = pt.refpos[0] - 256, ty = pt.refpos[1] - 256
                pt.x = tx * cos - ty * sin + 256
                pt.y = tx * sin + ty * cos + 256
                pt.curpos = [pt.x,pt.y]
                pt.tint = vm.getColor(pt.x,pt.y)
            })
            vm.rotate_dirty = true
        },
    },
    mounted(){
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI
        
        vm.latent = false
        vm.rotating = false
        vm.zoom_dirty = false
        vm.rotate_dirty = false

        // 圖形起始位置的偏移角度
        vm.ang1 = undefined
        // 記錄當前旋轉量
        vm.rotation = 0
        // 記錄歷史旋轉量
        vm.rotation_acc = 0
        
        vm.transform = d3.zoomIdentity

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