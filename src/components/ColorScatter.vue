<template>
        <v-layout column>
            <div id='colorScatter' style="width:512px;height:512px;margin-left:8px;margin-top:8px" ref='colorScatter'></div>
        </v-layout>
</template>

<script>
// Home view 下所使用到的 training 過程觀察的 scatter plot 組件
// 參考 components/colormap.vue

let vm = undefined
let PIXI = undefined
let d3 = undefined
let moment = undefined
const date_format = 'YYYY-MM-DD HH:mm:ss'

export default {
    computed(){
        vm.column_index = undefined
    },
    methods:{
        // temporal pause
        tempPause(){
            let root = vm.eventBus.root
            if(root.state === 'training'){
                console.log('暂时停止')
                vm.temp_pause = true
                vm.mask_mode = true 
            }
        },
        // confirm
        confirm(){
            let [cdata, cxy] = vm.confirmControlPoints()
            // mask 资料点整理回传， 中心点设定，处理回传参数
            let param = {
                'cxy': cxy,
                'cdata': cdata
            }
            // 将中心点坐标,原始数据传回后端,同時清空當前的 vm.mask_pts
            vm.$axios.post(vm.$api + '/inference/confirm_latent',param)
            .then(() => {
                console.log('Confirm ok')
            }).catch(error => {
                console.error('Confirm latent error',error)
            })
        },
        // （使用控制點時呼叫）计算 mask points 的中心位置,选中资料点将会标示为center_mark,绘制出白色三角形控制中心点,
        setCenterPoint(){
            if(vm.mask_pts !== undefined){
                let mean = [0,0]
                let size = vm.mask_pts.length
                vm.mask_pts.forEach(pt=>{
                    // pt.tint = vm.getColor(pt.x,pt.y)
                    mean[0] += pt.x
                    mean[1] += pt.y
                    pt.center_mark = true
                })
                mean[0] /= size
                mean[1] /= size
                let control_pt = vm.controlPointsInit(vm.controlTexture, mean[0], mean[1])
                control_pt.alpha = 1 
                control_pt.mask_pts = vm.mask_pts
                vm.mask_pts = undefined
                vm.ctn_control_pts.addChild(control_pt)
            }
        },
        // continue scatter plot data
        async onContinue(){
            console.log('后端传递')
            vm.mask_pts = undefined
            // 起始標註點
            vm.group_move = undefined
            // （不使用控制點時） 確定控制中心
            let [cdata,cxy] = vm.confirmCenterPoints() 
            // mask 资料点整理回传， 中心点设定，处理回传参数
            let param = {
                'cxy': cxy,
                'cdata': cdata
            }
            console.log(param)

            // 将中心点坐标,原始数据传回后端,同時清空當前的 vm.mask_pts
            await vm.$axios.post(vm.$api + '/inference/confirm_latent',param)
            .then(() => {
                console.log('Confirm ok')
            }).catch(error => {
                console.error('Confirm latent error',error)
            })            
        },
        //(Home reset button 使用)reset 空間內容
        onReset(){
            vm.rotate_dirty = false
            vm.zoom_dirty = false
            vm.mask_pts = undefined
            vm.group_move = undefined
            // 重置 mask 选框
            vm.maskBox(vm.mask_box)
            // 还原旋转前位置
            d3.select('#colorScatter').call(vm.zoom.transform,d3.zoomIdentity)
            vm.ctn_pts.children.forEach(pt => {
                pt.x = pt.rawpos[0]
                pt.y = pt.rawpos[1]
                pt.curpos = pt.rawpos
                pt.refpos = pt.rawpos
                // reset 還原 position 原始顏色
                pt.tint = vm.getColor(pt.x,pt.y)
            })
        },
        // 设定色碼表
        buildColorTable(background){
            vm.colors = []
            let raw_colormap = vm.app.renderer.extract.pixels(background)
            // raw color map 是由 r g b a 组成的 n * 4 大小的 array
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
        // 获取 color map pixel 颜色
		getColor(x, y) {
			x = parseInt(x)
			y = parseInt(y)

			if (x >= 0 && y >= 0 && x < 512 && y < 512) {
				return vm.colors[x][y]
			}
			return 0xCCCCCC // default to black
        },
        // 绘图容器,参数初始化设定
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
            // 主体容器
            vm.ctn = new PIXI.Container()
            vm.ctn.name = 'main_ctn'
            vm.wrapper.addChild(vm.ctn)
            // 数据点容器
            vm.ctn_pts = new PIXI.Container()
            vm.ctn_pts.name = 'ctn_points'
            vm.ctn_pts.count = undefined    
            vm.ctn.addChild(vm.ctn_pts)
            // 選取框
            vm.ctn_mask = new PIXI.Container()
            vm.ctn_mask.name = 'ctn_mask'
            vm.mask_box = new PIXI.Graphics()
            vm.maskBox(vm.mask_box)
            vm.ctn_mask.addChild(vm.mask_box)
            vm.ctn.addChild(vm.ctn_mask)
            // control point 和 control shadow 间的连接线
            vm.ctn_lines = new PIXI.Container()
            vm.ctn_lines.name = 'links'
            vm.ctn.addChild(vm.ctn_lines)
            // 控制点残影容器
            // vm.ctn_control_shadow = new PIXI.Container()
            // vm.ctn_control_shadow.name = 'control_shadow'
            // vm.ctn.addChild(vm.ctn_control_shadow)
            // 控制点容器
            vm.ctn_control_pts = new PIXI.Container()
            vm.ctn_control_pts.name = 'control_pts'
            vm.ctn.addChild(vm.ctn_control_pts)
            // 数据点贴图
            vm.dotTexture = vm.dotStyle()  
            // 数据点 highlight 贴图
            vm.controlTexture = vm.controlStyle()
            // control shadow 贴图
            vm.controlShadowTexture = vm.controlShadowStyle()
        },
        // 数据点的贴图
        dotStyle(){
            let g = new PIXI.Graphics()
            g.lineStyle(1,0x0)
            g.beginFill(0xFFFFFF)
            // 参数 x,y,半径
            g.drawCircle(0, 0, 3)
            g.endFill()
            return g.generateCanvasTexture()
        },
        // 数据点 control 点贴图,白色三角形
        controlStyle(){
            let g = new PIXI.Graphics()
            g.lineStyle(2,0x0)
            g.beginFill(0xFFFFFF)
            g.moveTo(0,-7.5)
            g.lineTo(-7.5,7.5)
            g.lineTo(7.5,7.5)
            g.lineTo(0,-7.5)
            g.endFill()
            return g.generateCanvasTexture()
        },
        // 数据点 control shadow 贴图, 阴影三角形
        controlShadowStyle(){
            let g = new PIXI.Graphics()
            g.lineStyle(2,0x0)
            g.beginFill(0xFFFFFF)
            g.moveTo(7.5,0)
            g.lineTo(0,15)
            g.lineTo(15,15)
            g.lineTo(7.5,0)
            g.moveTo(10,5)
            g.lineTo(5,15)
            g.moveTo(12.5,10)
            g.lineTo(10,15)
            g.endFill()
            return g.generateCanvasTexture()
        },
        // d3 axis scale initial
        d3Init(){
            vm.x_scale = d3.scaleLinear().range([0,512]).domain([-1,1])
            vm.y_scale = d3.scaleLinear().range([0,512]).domain([-1,1])  
            // 縮放參數設定
            // let zoom = d3.zoom()
            //         .on('zoom',vm.zoomed)
            //         // 將 d3.zoom() 的 scaleExtent 設定爲 【1,1】，阻止其 zoom 
            //         .scaleExtent([1,1])
            // d3.select('#colorScatter').call(zoom)
            // vm.zoom = zoom
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
        addPoints(latent){
            vm.dataWrapper = {}
            vm.ctn_pts.count = latent.length
            latent.forEach((d) => {
                let date_index = moment(d[0]).utc().format(date_format)
                vm .dataWrapper[date_index] = {}
                let sp = new PIXI.Sprite(vm.dotTexture)
                vm.setPointLocation(sp,0,0)
                sp.alpha = 0.3
                sp.data = d
                sp.center_mark = false
                sp.mask_group = undefined
                vm.dataWrapper[date_index].point = sp
                vm.ctn_pts.addChild(sp)
            });
            vm.latent = true
        },
        // 測試新的資料transition 方式
        pointsTransition(data){
            if(!vm.temp_pause){
                data.forEach(d => {
                    let date_index = moment(d[0]).utc().format(date_format)
                    let pt = vm.dataWrapper[date_index].point
                    vm.setPointLocation(pt,d.slice(-2)[0],d.slice(-2)[1],false)
                });
            }
            // d3.select('#colorScatter').call(vm.zoom.transform,d3.zoomIdentity)
        },
        // 設定資料點的座標位置, 傳入pt, Latent_x, Latent_y
        setPointLocation(pt,x,y,first=true){
            x = vm.x_scale(x)
            y = vm.y_scale(y)

            pt.rawpos = [x,y]
            pt.curpos = [x,y]
            // rotation 和 zooming 時的參考座標
            pt.refpos = [x,y]
            if(pt.tint !== 0xffffff || first)
                pt.tint = vm.getColor(x,y)
            pt.x = pt.curpos[0]
            pt.y = pt.curpos[1]
            pt.texture = vm.dotTexture
        },
        // 移除資料點
        removePoints(){
            vm.latent = false
            vm.mask_mode = false
            if(vm.eventBus !== undefined)
                vm.eventBus.root.adjust = 'pan'
            if(vm.mask_pts !== undefined)
                vm.mask_pts = undefined
            vm.ctn_control_pts.removeChildren()
            vm.ctn_pts.removeChildren()
            vm.dataWrapper = undefined
        },
        // 左鍵拖動
        mousedown(e){
            vm.tempPause()
            // 在 mask_mode -》 true 允许拖动 mask 数据点
            // 在 pcp_mode 下禁止所有数据点移动
            // 记录鼠标点击的初始位置
            vm.group_move = [e.data.global.x, e.data.global.y]
            // if(vm.mask_mode && !vm.pcp_mode){
            if(vm.mask_mode){
                if(!vm.mask_pt_clicked){
                    // 根据设定半径进行搜索
                    vm.circleFilter(vm.filter_radius,[e.data.global.x, e.data.global.y])
                }
            }
        },
        // 半径搜索
        circleFilter(r,center){
            let group = []
            vm.mask_pts = vm.ctn_pts.children.filter((pt) => {
                // 检查是否在半径内
                let value = Math.pow((pt.x-center[0]),2) + Math.pow((pt.y-center[1]),2)
                if(value <= Math.pow(r,2)){
                    pt.tint = 0xffffff
                    pt.mask_group = group
                    group.push(pt)
                    pt.center_mark = true
                    pt.interactive = true
                    pt.buttonmode = true
                    pt.mousedown = vm.mask_pts_click
                    pt.rightdown = vm.mask_pts_rightClick
                    return true
                }
                else if(pt.mask_group === undefined){
                    pt.tint = vm.getColor(pt.x,pt.y)
                }
                return false
            })
            // 避免在上面 filter 中修改到了 vm.ctn_pts.children 的順序,所以在這裏再執行一次
            vm.mask_pts.forEach((pt,i) => {
                vm.ctn_pts.setChildIndex(pt,vm.ctn_pts.count-1-i)
            })
            vm.mask_group.push(vm.mask_pts)
            vm.mask_group_drawPCP()
            vm.mask_pts = undefined
        },
        // 將上一輪有保留的 mask_group 標記
        setPreMask_group(mask_group){
            mask_group.forEach(mask_pts => {
                let group = []
                mask_pts.forEach((item,i) => {
                    let date = moment(item.data[0]).utc().format(date_format)
                    let pt = vm.dataWrapper[date].point
                    group.push(pt)
                    pt.tint = 0xffffff
                    pt.mask_group = group
                    pt.center_mark = true
                    pt.interactive = true
                    pt.buttonmode = true
                    pt.mousedown = vm.mask_pts_click
                    pt.rightdown = vm.mask_pts_rightClick 
                    vm.ctn_pts.setChildIndex(pt,vm.ctn_pts.count-1-i)
                })
                vm.mask_group.push(group)
            })
        },
        // 选中点群的拖拽开始
        mask_pts_click(e){
            if(vm.mask_mode && !vm.pcp_mode){
                vm.mask_pt_clicked = true
                vm.group_move = [e.data.global.x, e.data.global.y]
                vm.current_mask_pts = e.currentTarget.mask_group
            }
        },
        // 删除当前选中点群
        mask_pts_rightClick(e){
            // if(vm.mask_mode && !vm.pcp_mode){
            if(vm.mask_mode){
                let mask_pts = e.currentTarget.mask_group
                let index = vm.mask_group.indexOf(mask_pts)
                vm.mask_pts_remove(mask_pts)
                vm.mask_group.splice(index,1)       
                vm.onContinue()
                vm.mask_group_drawPCP()
            }
        },
        // 绘制 mask group 的 pcp line
        mask_group_drawPCP(){
            if(vm.pcp_mode){
                let pcp = vm.eventBus.pcp
                pcp.removeLines()
                vm.mask_group.forEach(mask_pts => {
                    pcp.drawMaskDataLine(mask_pts,vm.getColor)
                })
            }
        },

        mask_pts_remove(mask_pts){
            mask_pts.forEach(pt => {
                pt.x = pt.rawpos[0]
                pt.y = pt.rawpos[1]
                pt.curpos = pt.rawpos
                pt.mask_group = undefined
                pt.center_mark = false
                pt.interactive = false
                pt.buttonmode = false
                pt.tint = vm.getColor(pt.x,pt.y)
            })   
        },
        // 清除所有 mask_pts 
        clearAllMask(){ 
            vm.mask_group.forEach(mask_pts => {
                vm.mask_pts_remove(mask_pts)
            })
            vm.mask_group = []
        },
        // 右鍵旋轉操作,以及選取框開始
        rightdown(e){
            // if(vm.eventBus.pcp.ctn_lines !== undefined){
            //     let pcp_lines = vm.eventBus.pcp.ctn_lines.children
            // }
            let mask_group = vm.mask_group
            // 選擇框模式
            if(vm.mask_mode && vm.pcp_mode && mask_group.length === 0){
                // 控制是否 mask_box 绘制模式
                vm.mask_box_draw = true
                vm.mask_box.startx = e.data.global.x
                vm.mask_box.starty = e.data.global.y
            }
        },
        // 清除 mask_pts
        clearPCPMaskPts(){
            vm.pcp_mask_pts.forEach(pt => {
                if(!pt.center_mark){
                    pt.tint = vm.getColor(pt.x,pt.y)
                }
            })
        },
        // 所有点重新获取原本色颜色
        resetColor(){
            vm.ctn_pts.children.forEach(pt => {
                if(!pt.center_mark){
                    pt.tint = vm.getColor(pt.x,pt.y)
                }
            })
            vm.ctn_control_pts.children.forEach(cpt => {
                let mask_pts = cpt.mask_pts
                mask_pts.forEach(pt => {
                    pt.tint = 0xffffff
                })
            })     
        },
        // 按鍵旋轉移動，拖拽控制
        mosuemove(e){
            // 邊界設定，超出結束控制
            if (e.data.global.y >= 512 || e.data.global.y < 0 ||  e.data.global.x >= 512 ||  e.data.global.x < 0 ){
                // mask box 錯誤判斷
                if(vm.mask_mode && vm.mask_box_draw)  
                    vm.rightup()
                // zoom, pan 的錯誤判斷
                if(vm.group_move)
                    vm.mouseup()
            }

            // 控制視圖平移
            if(!vm.mask_mode && vm.group_move){
                vm.allPointsMove(e)
            }
            // 執行 PCP mask 選擇框
            if(vm.mask_box_draw && vm.pcp_mode){
                if(vm.pcp_mask_pts){
                    vm.clearPCPMaskPts()
                    let pcp = vm.eventBus.pcp
                    pcp.removeLines()
                }
                vm.maskBoxRisize(e)
            }
            // 直接移动 mask 标注数据点
            // if(vm.mask_mode && vm.group_move && !vm.pcp_mode){  
            if(vm.mask_mode && vm.group_move){
                let mask_pts = undefined
                if (vm.mask_pt_clicked){
                    mask_pts = vm.current_mask_pts
                } 
                else{
                    // 注意 slice 回傳的是一個 array
                    mask_pts = vm.mask_group.slice(-1)[0]
                }
                if(mask_pts !== undefined){
                    vm.maskPointsMove(e,mask_pts)
                }
            }    
        },
        // (使用圈选框搜索)mask 选择框绘制调整
        maskBoxRisize(e){
            let x1 = vm.mask_box.startx
            let y1 = vm.mask_box.starty
            let x2 = e.data.global.x
            let y2 = e.data.global.y
            // 清空当前绘制的 maskbox
            vm.mask_box.clear()
            // 对 maskbox 进行初始化, 给定(object, x1, y1, x2, y2), 防止恶意触发
            if(Math.abs(x1-x2) > 2 && Math.abs(y1-y2) > 2){
                vm.maskBox(vm.mask_box,x1,y1,x2,y2)
                // 保存 maskbox 的对角坐标
                vm.mask_box.endx = e.data.global.x
                vm.mask_box.endy = e.data.global.y
                vm.mask_box.alpha = 0.3
            }
        },
        // 移動所有數據點
        allPointsMove(e){
            let x_move = e.data.global.x - vm.group_move[0]
            let y_move = e.data.global.y - vm.group_move[1]
            vm.ctn_pts.children.forEach(pt => {
                pt.x = pt.curpos[0] + x_move
                pt.y = pt.curpos[1] + y_move
                if(!pt.center_mark){
                    pt.tint = vm.getColor(pt.x,pt.y)
                }
            })
        },
        // 直接移动 mask 标注数据点
        maskPointsMove(e,mask_pts){
            let x_move = e.data.global.x - vm.group_move[0] 
            let y_move = e.data.global.y - vm.group_move[1]  
            mask_pts.forEach(pt => {
                pt.x = pt.curpos[0]+x_move
                pt.y = pt.curpos[1]+y_move
            })
        },
        // 旋转停止, mask pts 行为停止, 确认被标注的 mask pts
        rightup(){
            // vm.rotating = false
            vm.mask_box_draw = false
            vm.mask_box.alpha = 0
            vm.rotation_acc = vm.rotation
            if(vm.mask_mode && vm.mask_box.width >= 3 && vm.pcp_mode){
                vm.maskBoxCollision()
                // 取消右鍵選取框設定
                if(vm.pcp_mode){
                    let pcp = vm.eventBus.pcp
                    pcp.removeLines()
                    if(vm.pcp_mask_pts){
                        pcp.drawMaskDataLine(vm.pcp_mask_pts,vm.getColor)
                    }
                }
            }
            vm.mask_box.clear()
        },
        // 左鍵停止移動
        mouseup(){
            // pan 結束
            if(!vm.mask_mode){
                vm.ctn_pts.children.forEach(pt => {
                    pt.curpos = [pt.x,pt.y]
                    pt.rawpos = pt.curpos
                })
            }
            
            // mark pts 移動結束
            let mask_pts = undefined
            if(vm.mask_pt_clicked){
                mask_pts = vm.current_mask_pts
            }
            else{
                mask_pts = vm.mask_group.slice(-1)[0]
            }
            if(mask_pts !== undefined){
                mask_pts.forEach(pt => {
                    pt.curpos = [pt.x,pt.y]
                    // pt.rawpos = pt.curpos 
                })
            }

            vm.mask_pt_clicked = false
            vm.group_move = undefined

            if(vm.temp_pause){
                vm.onContinue()
                vm.temp_pause = false
            }
        },
        // mask box
        maskBox(box,x1=0,y1=0,x2=0,y2=0){
            box.lineStyle(1,0x000000,0)
            box.beginFill()
            box.drawRect(x1,y1,x2-x1,y2-y1)
            box.endFill()
            box.alpha = 0
        },
        // 确认被全选到的数据点内容, mask box 與資料點 collision
        maskBoxCollision(){
            let x1 = vm.mask_box.startx, x2 = vm.mask_box.endx
            let x_extent = vm.minMax(x1,x2)
            let y1 = vm.mask_box.starty, y2 = vm.mask_box.endy
            let y_extent = vm.minMax(y1,y2)
            vm.pcp_mask_pts = vm.ctn_pts.children.filter(pt => {
                if(x_extent[0] <= pt.x &&  x_extent[1] >= pt.x && y_extent[0] <= pt.y && y_extent[1] >= pt.y){
                    pt.tint = 0xffffff
                    return true
                }
                else{
                    if(pt.tint !== 0xffffff && !pt.center_mark){
                        pt.tint = vm.getColor(pt.x,pt.y)
                    }
                    return false
                }
            })
            //////////////////////////////
            // pixi 5.0 之後可以使用 sortChildren() 來調整
            // vm.ctn_pts.sortChildren()
            //////////////////////////////
            // 在非 pcp_mode 的情况下將選中的資料點移動至圖層的上層
            if(!vm.pcp_mode){
                vm.pcp_mask_pts.forEach((pt,i) => {
                    vm.ctn_pts.setChildIndex(pt,vm.ctn_pts.count-1-i)
                })
            }
            // 防止出现没有选中任何点的情况
            if(vm.pcp_mask_pts.length === 0)
                vm.pcp_mask_pts = undefined
        },
        // 确认是否又被 filter box 选中'
        pcpFilter(columns,axis){
            let mask_pts = undefined
            let column_index = vm.column_index
            if(vm.mask_group.length > 0){
                mask_pts = []
                vm.mask_group.forEach(pts => {
                    let mask = pts.filter(pt => {
                        return vm.filter_cb(pt,columns,axis,column_index)
                    })
                    window.mask = mask
                    mask_pts = mask_pts.concat(mask)
                })
                // 当没有filter box的时候执行
                if(mask_pts.length === 0){
                    vm.mask_group.forEach(pts => {
                        mask_pts = mask_pts.concat(pts)
                    })
                }
            }
            else{
                mask_pts = vm.ctn_pts.children.filter(pt => {
                    return vm.filter_cb(pt,columns,axis,column_index)
                })
            }
            // 不允許其出現在最上方
            mask_pts.forEach((pt) => {
                pt.tint = 0xffffff 
            })
            return [mask_pts,vm.getColor]
        },
        filter_cb(pt,columns,axis,column_index){
            if(!pt.center_mark){
                pt.tint = vm.getColor(pt.x,pt.y)
            }
            let data = pt.data
            let box_count = 0
            let bool =  columns.every((c,i) => {
                let filter_box = axis[c].filter_box.children
                if(filter_box.length !== 0){
                    return filter_box.some(box => {
                        box_count += 1
                        let [max,min] = box.extent
                        return max >= data[column_index[i]] && min <= data[column_index[i]]
                    })
                }
                else{
                    return true
                }
            })
            return bool && box_count 
        },
        // 以 min，max 順序回傳
        minMax(num1,num2){
            let min = Math.min(num1,num2)
            let max = Math.max(num1,num2)
            return [min,max]
        },
        // 確定控制中心,整理回传参数
        confirmCenterPoints(){
            let cdata = []
            let cxy = []
            console.log(vm.mask_group)
            vm.mask_group.forEach((mask_pts) => {
                let mask_data = []
                let mean = [0,0]
                let size = mask_pts.length
                mask_pts.forEach(pt => {
                    mask_data.push(vm.filterSelectedDimData(pt.data))
                    mean[0] += pt.x
                    mean[1] += pt.y
                })
                mean[0] /= size
                mean[1] /= size
                cdata.push(mask_data)
                cxy.push([vm.x_scale.invert(mean[0]),vm.y_scale.invert(mean[1])])
            })
            return [cdata,cxy]
        },
        // 過濾選中維度資料
        filterSelectedDimData(data){
            let indexs = vm.column_index
            let filter_data = []
            indexs.forEach(i => {
                filter_data.push(data[i])
            })
            return filter_data
        }
    },
    mounted(){
        vm = this
        d3 = vm.$d3
        PIXI = vm.$PIXI
        moment = vm.$moment
        
        vm.latent = false
        vm.rotating = false
        vm.zoom_dirty = false
        vm.rotate_dirty = false
        vm.mask_mode = false 
        vm.pcp_mode = false
        vm.mask_box_draw = false
        // 記錄 group 移動的起始位置,将会以 [] 形式保存
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
        // 資料包裝盒 ＝》point，line，data
        vm.dataWrapper = undefined        
        // 过滤半径
        vm.filter_radius = 20
        // 記錄 mask group
        vm.mask_group = []
        // 暂时停止
        vm.temp_pause = false

        vm.$refs.colorScatter.addEventListener('contextmenu',e => e.preventDefault())
        vm.pixiInit()
        vm.d3Init()
        // 加載背景 color map
        if(vm.$PIXI.utils.TextureCache['map_big.png'] == undefined){
            vm.$PIXI.loader.add('map_big.png').load(()=>{
                vm.drawGraph()
            })
        }else{
            vm.drawGraph()
        }
        window.ColorScatter = vm
    },
    beforeDestroy(){
        if(vm.app){
            vm.app.destroy()
        }
    }
}
</script>