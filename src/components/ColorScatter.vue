<template>
        <v-layout column>
            <div id='colorScatter' style="width:512px;height:512px;margin:10px" ref='colorScatter'></div>
        </v-layout>
</template>

<script>
// Home view 下所使用到的 training 過程觀察的 scatter plot 組件
// 參考 components/colormap.vue

let vm = undefined
let PIXI = undefined
let d3 = undefined

export default {
    methods:{
        // reset 空間內容
        onReset(){
            vm.rotate_dirty = false
            vm.zoom_dirty = false
            vm.mask = false 
            vm.mask_pts = undefined
            vm.group_move = undefined
            vm.maskBox(vm.mask_box)
            d3.select('#colorScatter').call(vm.zoom.transform,d3.zoomIdentity)
            vm.ctn_pts.children.forEach(pt => {
                pt.x = pt.rawpos[0]
                pt.y = pt.rawpos[1]
                pt.curpos = pt.rawpos
                pt.refpos = pt.rawpos
                pt.tint = vm.getColor(pt.x,pt.y)
            })
        },
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
            vm.app.stage.mousedown = vm.mousedown
            vm.app.stage.mouseup = vm.mouseup
            vm.app.stage.rightdown = vm.rightdown
            vm.app.stage.mousemove = vm.mosuemove
            vm.app.stage.rightup = vm.rightup
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
            vm.ctn_pts.name = 'ctn_points'
            vm.ctn_pts.sortableChildren = true
            vm.ctn.addChild(vm.ctn_pts)
            // 選取框
            vm.ctn_mask = new PIXI.Container()
            vm.ctn_mask.name = 'ctn_mask'
            vm.mask_box = new PIXI.Graphics()
            vm.maskBox(vm.mask_box)
            vm.ctn_mask.addChild(vm.mask_box)
            vm.ctn.addChild(vm.ctn_mask)
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

            pt.mask = false
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
            if(!vm.mask){
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
            }
        },
        // 左鍵拖動
        mousedown(e){
            if(vm.mask){
                vm.group_move = [e.data.global.x, e.data.global.y]
            }
        },
        // 右鍵旋轉操作
        rightdown(e){
            if(!vm.mask){
                vm.rotating = true
                //  以圖形中心爲旋轉點
                // Math.atan2 回傳弧度
                vm.ang1 = Math.atan2(e.data.global.y - 256, e.data.global.x - 256)
            }
            else{
                vm.mask_box_draw = true
                vm.mask_box.startx = e.data.global.x
                vm.mask_box.starty = e.data.global.y
            }
        },
        // 按鍵旋轉移動，拖拽控制
        mosuemove(e){
            // 邊界設定，超出結束控制
            if (e.data.global.y >= 512 || e.data.global.y < 0 ||  e.data.global.x >= 512 ||  e.data.global.x < 0 ){
                vm.rightup()
                vm.mouseup()
            }
            // 旋轉控制執行
            if (vm.rotating && !vm.mask) {
                vm.rotation = Math.atan2(e.data.global.y - 256, e.data.global.x - 256) - vm.ang1 + vm.rotation_acc
                vm.rotate(vm.rotation)
            }
            // 執行 mask 選擇框
            else if(vm.mask && vm.mask_box_draw){
                vm.mask_box.clear()
                vm.maskBox(vm.mask_box,vm.mask_box.startx,vm.mask_box.starty,e.data.global.x,e.data.global.y)
                vm.mask_box.globalx = e.data.global.x
                vm.mask_box.globaly = e.data.global.y
                vm.mask_box.alpha = 0.3
                vm.maskBoxCollision()
            }        
            else if(vm.mask && vm.mask_pts && vm.group_move){
                let x_move = vm.group_move[0] - e.data.global.x
                let y_move = vm.group_move[1] - e.data.global.y
                vm.mask_pts.forEach(pt => {
                    pt.x = pt.curpos[0]-x_move
                    pt.y = pt.curpos[1]-y_move
                })
            }    
        },
        // 停止旋轉
        rightup(){
            vm.rotating = false
            vm.mask_box_draw = false
            vm.mask_box.alpha = 0
            vm.rotation_acc = vm.rotation
            vm.mask_box.clear()
        },
        // 左鍵停止移動
        mouseup(){
            if(vm.mask_pts){
                vm.mask_pts.forEach(pt => {
                    pt.curpos = [pt.x,pt.y]
                    pt.rawpos = pt.curpos
                })
            }
            vm.group_move = undefined
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
        // 調整點位置
        onMask(){
            vm.mask = false
        },
        // mask box
        maskBox(box,x1=0,y1=0,x2=0,y2=0){
            box.lineStyle(1,0x000000,0)
            box.beginFill()
            box.drawRect(x1,y1,x2-x1,y2-y1)
            box.endFill()
            box.alpha = 0
        },
        // mask box 與資料點 collision
        maskBoxCollision(){
            let x1 = vm.mask_box.startx, x2 = vm.mask_box.globalx
            let x_extent = vm.minMax(x1,x2)
            let y1 = vm.mask_box.starty, y2 = vm.mask_box.globaly
            let y_extent = vm.minMax(y1,y2)
            vm.mask_pts = vm.ctn_pts.children.filter(pt => {
                if(x_extent[0] <= pt.x &&  x_extent[1] >= pt.x && y_extent[0] <= pt.y && y_extent[1] >= pt.y){
                    pt.tint = 0xff0000
                    pt.zIndex = 2
                    return true
                }
                else{
                    pt.tint = vm.getColor(pt.x,pt.y)
                    pt.zIndex = -1
                    return false
                }
            })
            //////////////////////////////
            // pixi 5.0 之後可以使用 sortChildren() 來調整
            // vm.ctn_pts.sortChildren()
            //////////////////////////////
            vm.mask_pts.forEach((pt,i) => {
                vm.ctn_pts.setChildIndex(pt,vm.ctn_pts.children.length-i-1)
            })

            // vm.mask_pts = vm.mask_pts.map(pt => {
            //     return [vm.x_scale.invert(pt.x),vm.y_scale.invert(pt.y)]
            // })
            // console.log(vm.mask_pts)
        },
        // 以 min，max 順序回傳
        minMax(num1,num2){
            let min = Math.min(num1,num2)
            let max = Math.max(num1,num2)
            return [min,max]
        }
    },
    mounted(){
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI
        
        vm.latent = false
        vm.rotating = false
        vm.zoom_dirty = false
        vm.rotate_dirty = false
        vm.mask = false 
        // 記錄 group 移動的起始位置
        vm.group_move = undefined
        
        //記錄 mask 的資料點
        vm.mask_pts = undefined
        // 圖形起始位置的偏移角度
        vm.ang1 = undefined
        // 記錄當前旋轉量
        vm.rotation = 0
        // 記錄歷史旋轉量
        vm.rotation_acc = 0
        // 設定縮放矩陣
        vm.transform = d3.zoomIdentity

        vm.$refs.colorScatter.addEventListener('contextmenu',e => e.preventDefault())
        vm.pixiInit()
        vm.d3Init()
        // 加載背景 color map
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