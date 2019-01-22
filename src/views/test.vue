<template>
    <v-container px-0 style="margin:0; max-width:1920px;background:white;padding-top:0px" fluid fill-height>
        <!-- <v-card> -->
        <v-layout row  no-wrap>
            <v-flex style="border:1px solid #ccc;box-shadow:none; margin:10px">
                <v-layout style="width:290px" align-start justify-start column >
                    <v-flex style="margin:15px;margin-right:0px">
                            <v-btn-toggle v-model="toggle_exclusive">
                                <v-btn flat small v-on:click=Status(0)>
                                <v-icon>fas fa-arrows-alt-h</v-icon>
                                </v-btn>
                                <v-btn flat small v-on:click=Status(1)>
                                <v-icon>far fa-hand-point-up</v-icon>
                                </v-btn>
                            </v-btn-toggle> 
                    </v-flex>
                    <v-flex style="margin:15px; margin-top:0px;margin-right:0px">
                        <colormap ref="cm" @loaded="onColormapLoaded"></colormap>
                    </v-flex>
                    <v-flex style="margin:15px; margin-top:0px;margin-right:0px" ref="infobox">
                        <canvas ref="information" ></canvas>
                    </v-flex>
                </v-layout>
            </v-flex>

            <v-flex xs12 class="streamgraph" ref="streamgraph" style="border:1px solid #ccc;box-shadow:none; margin:10px">
                <div id="chart2" ref="chart2"> </div>
            </v-flex>

            <v-flex ref="legendbox" style="border:1px solid #ccc;box-shadow:none; margin:10px; width:170px;">
                <canvas ref="legend"></canvas>
            </v-flex>
            
        </v-layout>
        <!-- </v-card> -->
    </v-container> 
</template>
<script>
const EventBus = {

}
import { mapGetters } from 'vuex'
import Colormap from '@/components/Colormap.vue'
export default {   
    components: {
        Colormap
    },
    data:()=>{
        return{
            toggle_exclusive:1,
        }
    },
    created(){       
    },
    methods:{
        initial(){
            let vm = this
            let d3 = vm.$d3
            let query = {"level":"day"}

            vm.zoomlevel = "day"
            vm.mask_behavior = 0
            vm.mask_temp = {
                "day":{},
                "hour":{},
                "minute":{}
            }
            // graph init
            vm.d3Init()
            vm.pixiInit()
            //time format
            vm.timeformat = {
                "day":"YYYY-MM-DD 00:00:00",
                "hour":"YYYY-MM-DD HH:00:00",
                "minute":"YYYY-MM-DD HH:mm:00",
            }
            vm.timeslot = {
                "day":1440,
                "hour":60,
                "minute":1
            }
            // init draw
            vm.initData(query)
        },
       
        Status(item){
            let vm = this
            let d3 = vm.$d3
            if(item != 2){
                let event = (item === 1)?"none":"all"
                vm.maskv.select(".overlay").attr("pointer-events",event);
            }
        },

        onColormapLoaded() {
            console.log("colormap point loader")
			let vm = this
            // vm.$refs.cm.updateData()
        },
                
        d3Init(){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment 

            vm.margin = {top: 20, right: 50, bottom: 30, left: 50}
            vm.width = vm.$refs.streamgraph.clientWidth - vm.margin.right - vm.margin.left
            vm.height = 600 - vm.margin.top - vm.margin.bottom
            // console.log(vm.width,vm.height)
            vm.content_height = vm.height - 200

            vm.select_label = null

            vm.x = d3.scaleTime()
                .range([0, vm.width])

            vm.x2 = d3.scaleTime()
                .range([0, vm.width])

            vm.y = d3.scaleLinear()
                .range([vm.content_height-10, 0])

            vm.y2 = d3.scaleLinear()
                .range([vm.content_height-10, 0])
            
            vm.ly = d3.scaleLinear()
                .range([vm.content_height, vm.content_height-160])

            vm.lyr = d3.scaleLinear()
                .range([vm.content_height, vm.content_height-160])
            
            vm.z = d3.scaleOrdinal(d3.schemeSet3)

            vm.zoom = d3.zoom()
                .scaleExtent([1, Infinity])
                .translateExtent([[0, 0], [vm.width, vm.content_height]])
                .extent([[0, 0], [vm.width, vm.content_height]])
                .on("zoom", vm.upDate);      

            vm.xAxis = d3.axisBottom(vm.x)
            vm.yAxis = d3.axisLeft(vm.y)
            vm.yAxisr = d3.axisRight(vm.y)
            vm.lyAxis = d3.axisLeft(vm.ly)
            vm.lyAxisr = d3.axisRight(vm.lyr)

            vm.stack = d3.stack()
                // order includes stackOrderAscending stackOrderDescending(defalut) stackOrderInsideOut stackOrderNone stackOrderReverse
                .order(d3.stackOrderAscending)
                // d3.stack offset help to adjust the offset of stack
                .offset(d3.stackOffsetSilhouette)

            vm.area = d3.area()
                .curve(d3.curveMonotoneX)
                .x(function(d)  { return vm.x(moment(d.data.date)); })
                .y0(function(d) { return vm.y(d[0]); })
                .y1(function(d) { return vm.y(d[1]); })

            vm.loss_line = d3.line()
                .x( d => { return vm.x(moment(d.date)) })
                .y( d => { return vm.lyr(d.value)})

            vm.raw_line = d3.line()
                .x( d => { return vm.x(moment(d.date)) })
                .y( d => { return vm.ly(d.value)})

            vm.brush = d3.brushX()
                .extent([[0, 20], [vm.width, 50]])
                .on("brush end", vm.brushed)
            // main svg
            vm.svg = d3.select("#chart2").append("svg")
                .attr("width", vm.width + vm.margin.right + vm.margin.left)
                .attr("height", vm.height + vm.margin.top + vm.margin.bottom + 120 )    
                .call(vm.zoom)
            // content view
            vm.contentv = vm.svg.append("g")
                .attr("class","content")
                .attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")
            
            vm.layers = vm.contentv.append("g")
                .attr("class","layers")
            // focus view
            vm.focusv = vm.svg.append("g")
                .attr("class","focus")
                .attr("transform", "translate(" + vm.margin.left + "," + (0) + ")")
            // mask view
            vm.maskv = vm.svg.append("g")
                .attr("class","mask")
                .attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")") 
            
            vm.mask_layers = vm.maskv.append("g")
                .attr("class","mask_layers")

            vm.mask_brush = d3.brushX()
                .extent([[0, 20], [vm.width, vm.content_height]])
                .on("end", vm.maskBrushed)
            // infobox
            vm.infoboxv = vm.svg.append("g")
                .attr("class","infobox")
                .attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")
            // selected view && line chart
            vm.selection =  vm.svg.append("g")
                .attr("class", "selection")
                .attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 320) + ")")

            vm.lineChart = vm.selection.append("g").attr("class","lineChart")
        },

        brushed(){
            let vm = this 
            let d3 = vm.$d3
            let s = d3.event.selection || vm.x2.range()
            if( d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom" )
                return
            if( vm.svg != null ){
                vm.redrawD3Axis(vm.focusv, "xaxis", vm.xAxis)
                vm.changeD3StreamGraph(vm.layers, "layer")
                vm.svg.select(".layers").call(vm.zoom.transform, d3.zoomIdentity
                    .scale(vm.width / (s[1] - s[0]))
                    .translate(-s[0], 0))
            }
            
        },

        maskBrushed(){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]
            // fresh the page will call this function, so need a protection
            let s = (d3.event.selection)?d3.event.selection:null;
            let mask_range = []
       
            if(s != null){
                mask_range = s.map(vm.x.invert,vm.x)
                mask_range = mask_range.map((d)=>{
                    return moment(d).format(format)
                }).sort()

                let time_value = mask_range.map((d)=>{
                    return moment(d).valueOf()
                })

                let status = vm.checkMaskRange(time_value[0], time_value[1])
                if(!status.drawed){
                    console.log("draw the graph")
                    let time_range = status.time_range
                    let start = moment(time_range.start).format(format)
                    let end = moment(time_range.end).format(format)
                    vm.addMaskTimeArr(time_range.end, time_range.start)
                    vm.$axios.post(vm.$api + '/analysis/mask',{"level":vm.zoomlevel,"index":[start,end]})
                }
                vm.maskv.select(".selection").attr("width",0);
            }
        },

        checkMaskRange(time_start, time_end){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let drawed = false, time_range = {"start":time_start, "end":time_end}

            for(let item in vm.mask_temp[vm.zoomlevel]){
                let temp = vm.mask_temp[vm.zoomlevel][item]
                if(temp.start <= time_start && temp.end >= time_end){
                    drawed = true
                    break
                }
                else if((time_start >= temp.start && time_start <= temp.end) || (time_end >= temp.start && time_end <= temp.end)){
                    time_range.start = Math.min(time_start, temp.start)
                    time_range.end = Math.max(time_end, temp.end)
                    vm.mask_layers.selectAll("#"+item).remove()
                    delete vm.mask_temp[vm.zoomlevel][item]
                    // vm.addMaskTimeArr(time_range.end, time_range.start)
                    break
                }
            }
            return {"draw":drawed, "time_range":time_range}
        },

        cancelMask(time){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]

            for(let item in vm.mask_temp[vm.zoomlevel]){
                let temp = vm.mask_temp[vm.zoomlevel][item]
                if(temp.start <= time && temp.end >= time){
                    temp.start = moment(temp.start).format(format)
                    temp.end = moment(temp.end).format(format)
                    vm.$axios.post(vm.$api + '/analysis/mask',{"level":vm.zoomlevel,"index":[temp.start,temp.end],"mask":false})
                    vm.mask_layers.selectAll("#"+item).remove()
                    break
                }
            }
        },

        pixiInit(){
            let vm = this
            let canvas = vm.$refs.legend
            let g = new vm.$PIXI.Graphics();
            g.lineStyle(1, 0x000000,1);
            g.beginFill(0xFFFFFF);
            g.drawRoundedRect(0, 0, 13, 12,1);
            g.endFill();
            vm.cellTexture = g.generateCanvasTexture();
            // border initial
            let appw = vm.$refs.legendbox.clientWidth
            let apph = vm.$refs.legendbox.clientHeight

            let info_appw = vm.$refs.infobox.clientWidth - 20
            let info_apph = vm.$refs.infobox.clientHeight + 20 
            // console.log("info box", info_apph)
            vm.appLegend = new vm.$PIXI.Application( appw, apph, {
                antialias:true,
                view:vm.$refs.legend,
                backgroundColor:0xFFFFFF
            });
            
            vm.appInfo = new vm.$PIXI.Application( info_appw, info_apph, {
                antialias:true,
                view:vm.$refs.information,
                backgroundColor:0xFFFFFF
            });
        },

        initData(query={"level":"day"}){
            let vm = this
            let moment = vm.$moment
            vm.$axios.post(vm.$api + '/analysis/dim_loss',query).then((data)=>{
                let temp = {}
                temp.columns = data.data.columns
                temp.dataloss = data.data.loss
                temp.rawdata = data.data.raw
                temp.maskdata = data.data.mask
                temp.totalsize = data.data.loss.length
                temp.keys = temp.columns.slice(1)

                vm.temp = temp
                vm.zoomlevel = query.level
                
                vm.temp_layers = vm.structAreaDate( temp.dataloss, temp.columns, vm.zoomlevel)

                vm.drawLegend(temp.keys)
                vm.drawInformation(temp.totalsize)
                vm.baseD3Chart(temp.keys, vm.temp_layers)
                vm.organizeMaskData(temp.maskdata)
                // vm.drawD3MaskLayer()
            });
        },

        changeData(query, transform, start, end){
            let vm = this 
            let d3 = vm.$d3
            let moment = vm.$moment
            vm.$axios.post(vm.$api + '/analysis/dim_loss',query).then((data)=>{
                let temp = {}
                temp.columns = data.data.columns
                temp.dataloss = data.data.loss
                temp.rawdata = data.data.raw
                temp.maskdata = data.data.mask
                temp.totalsize = data.data.loss.length
                temp.keys = temp.columns.slice(1)
                let q_start = "", q_end = ""

                vm.temp = temp
                vm.zoomlevel = query.level

                vm.temp_layers = vm.structAreaDate( temp.dataloss, temp.columns, vm.zoomlevel)
                let layers = vm.stack(vm.temp_layers)
                // console.log(layers)
                vm.data_num.text = "Data Number: "+temp.totalsize

                if(query["start_date"] != undefined && query["end_date"] != undefined){
                    q_start = query["start_date"], q_end = query["end_date"]
                    vm.changeContentView(layers, start, end, transform)
                }
                else{
                    q_start = moment(temp.dataloss[0][0]),q_end = moment(temp.dataloss[temp.totalsize-1][0])
                    vm.changeContentView(layers, q_start, q_end, transform)
                }
                
                if(vm.select_label != null){
                    vm.drawLineChart(vm.select_label)
                }
                vm.mask_layers.selectAll(".mask_layers").remove();
                vm.organizeMaskData(temp.maskdata)
            })
        },

        changeContentView(layers, start, end, transform){
            let vm = this 
            let d3 = vm.$d3
            let moment = vm.$moment
            vm.setAxisDomain(vm.x, [moment(start), moment(end)])
            vm.setAxisDomain(vm.y, [d3.min(layers, vm.stackMin), d3.max(layers, vm.stackMax)])
            vm.setAxisDomain(vm.y2, vm.y.domain())
            vm.redrawD3Axis(vm.contentv, "xaxis", vm.xAxis)
            vm.redrawD3Axis(vm.contentv, "yaxis", vm.yAxis)
            vm.redrawD3Axis(vm.contentv, "yaxisr", vm.yAxisr)
            vm.changeD3StreamGraph(vm.layers, "layer", layers)
            vm.focusv.select(".brush").call(vm.brush.move, vm.x.range().map(transform.invertX, transform));
        },

        drawLegend(legends, totalsize){
            //Labels
            let vm = this
            vm.legend_container = new vm.$PIXI.Container();
            let title = vm.drawText("Labels",15,0,18,vm.legend_container)
            title.mousedown = vm.titleClick

            legends.forEach((label,i)=>{
                let p_y = i * 20 + 30, px = 15
                let rect = vm.drawRect(px, p_y, vm.z(i).replace("#","0x"),15,1,vm.legend_container)
                rect.text = label
                rect.on("mousedown",() => vm.clickD3Layer(label))

                let text = vm.drawText(label,35,p_y,15,vm.legend_container)
                text.on("mousedown",() => vm.clickD3Layer(label))
            })

            vm.appLegend.stage.addChild(vm.legend_container)
        },

        drawInformation(totalsize){
            let vm = this
            vm.info_container = new vm.$PIXI.Container();

            // fill and line style
            vm.raw_label = vm.drawRect(0,2,0xff7f50,10,0,vm.info_container)
            vm.raw_text  = vm.drawText("Raw Data",20,0,15,vm.info_container)
            vm.loss_label = vm.drawRect(0,32,0x4682b4,10,0,vm.info_container)
            vm.loss_text = vm.drawText("Error Value",20,30,15,vm.info_container)

            vm.raw_label.on("mousedown", () => vm.disableLine("lineRaw", vm.raw_text))
            vm.raw_text.on("mousedown", () => vm.disableLine("lineRaw", vm.raw_text))
            vm.loss_label.on("mousedown", () => vm.disableLine("lineLoss", vm.loss_text))
            vm.loss_text.on("mousedown", () => vm.disableLine("lineLoss", vm.loss_text))

            vm.data_num = vm.drawText("Data Number: "+totalsize,0,60,15,vm.info_container)
            vm.legend_level = vm.drawText("Zoom Level: "+vm.zoomlevel,0,80,15,vm.info_container)

            vm.infor_date = vm.drawText("Date Time : None",0,110,15,vm.info_container)
            vm.infor_raw_data = vm.drawText("Raw Data : None",0,130,15,vm.info_container)
            vm.infor_loss_data = vm.drawText("Loss Data : None",0,150,15,vm.info_container)

            vm.appInfo.stage.addChild(vm.info_container)
        },

        disableLine(line_id, item){
            let vm = this
            let d3 = vm.$d3

            if( vm.selection.select("#"+line_id) === undefined )
                return console.error("NO selection layer")

            let status = (+vm.selection.select("#"+line_id).style("opacity") === 0)? 1:0
            let alpha = (item.alpha === 1)? 0.5:1

            vm.selection.select("#"+line_id).style("opacity",status)
            item.alpha = alpha
        },

        drawText(text, p_x, p_y, font_size, container){
            let vm = this
            let PIXI = vm.$PIXI
            let content = new PIXI.Text(text,{fontFamily :'Times New Roman', fontSize: font_size, fill : 0x000000})
            content.x = p_x, content.y = p_y
            content.buttonMode = true
            content.interactive = true
            container.addChild(content)
            return content
        },

        drawRect(p_x, p_y, color, size=15, line_alph=1,container){
            let vm = this
            let PIXI = vm.$PIXI
            let rect = new PIXI.Graphics();
            rect.lineStyle(1, 0x000000, line_alph);
            rect.beginFill(color, 1);
            rect.drawRect(p_x, p_y, size, size);
            rect.buttonMode = true 
            rect.interactive = true
            container.addChild(rect)
            return rect
        },

        titleClick(){
            let vm = this
            let d3 = vm.$d3

            vm.layers.selectAll(".layer")
            .attr("opacity", 1)
            .classed("hover", false)
            .attr("stroke-width", "0px")

            vm.legend_container.children.forEach(item => {
                item.alpha = 1 
            })


        },

        clickD3Layer(label){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]
            let select_layer = document.getElementById(label)
            let mouseX = d3.mouse(select_layer)[0]
            let invertX = moment(moment(vm.x.invert(mouseX)).format(format)).valueOf()
            vm.select_label = label

            vm.layers.selectAll(".layer")
            .attr("opacity", function(layer, j){
                return layer.key != label? 0.3:1 
            })
            .classed("hover", function(layer, j){
                return layer.key != label? false:true
            })
            .attr("stroke-width", function(layer, j){
                return layer.key != label? "0px":"1px";
            })

            vm.legend_container.children.forEach((item, j) => {
                if( item.text != undefined && item.text === label )
                    item.alpha = 1
                else 
                    item.alpha = 0.3
            });
            
            vm.drawLineChart(label)
            vm.cancelMask(invertX)
        },

        baseD3Chart(keys, temp_layers){ 
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            vm.stack.keys(keys)

            let layers = vm.stack(temp_layers)

            // setting the axis domain
            vm.setAxisDomain(vm.x, vm.$d3.extent(temp_layers, function(d) { return moment(d.date); }))
            vm.setAxisDomain(vm.y, [d3.min(layers, vm.stackMin), d3.max(layers, vm.stackMax)])
            vm.setAxisDomain(vm.x2, vm.x.domain())
            vm.setAxisDomain(vm.y2, vm.y.domain())
            
            // content view x axis, y axis, y2 axis
            vm.drawAxis(vm.contentv, "translate(0,"+vm.content_height+")", "xaxis", vm.xAxis)
            vm.drawAxis(vm.contentv, "translate(" + vm.width + ", 0)", "yaxisr", vm.yAxisr)
            vm.drawAxis(vm.contentv, "translate(0,0)", "yaxis", vm.yAxis)
            vm.drawClip(vm.contentv, "cclip", vm.width, vm.height, "translate(0,0)")

            let mousemove = function(d, i){
                let current_layer = this
                vm.layerMousemove(current_layer, d, i)
            }

            // draw layers -- content layer
            vm.drawD3StreamGraph(vm.layers, layers, "layer", vm.area, vm.z, "auto")
            vm.layers.selectAll(".layer")
                .on("click", vm.d3LayerClick)
                .on("mousemove", mousemove)
                .on("mouseout", vm.layerMouseout)

            // draw focus view
            vm.drawAxis(vm.focusv, "translate(0,50)", "fxaxis", vm.xAxis)
            vm.drawD3Brush(vm.focusv, 0.7, vm.brush, vm.x.range(),"brush")
            
            // draw selection view
            vm.drawAxis(vm.selection, "translate(0," + (vm.content_height) + ")", "xaxis", vm.xAxis)
            vm.drawAxis(vm.selection, "translate(0,0)", "lyaxis", vm.lyAxis)
            vm.drawAxis(vm.selection, "translate(" + vm.width + ", 0)", "lyaxisr", vm.lyAxisr)
            vm.drawClip(vm.selection, "sclip", vm.width, 200, "translate(" + 0 + "," + 150 + ")",)
            vm.drawD3Text(vm.selection, "Raw Data","translate(-15"+",180)", "Raw_Data", 12, "red")
            vm.drawD3Text(vm.selection, "Loss","translate("+(vm.width-10)+",180)", "Loss", 12, "steelblue")
            
            // draw line chart
            vm.setD3LineChart(vm.lineChart, "lineLoss", "steelblue")
            vm.setD3LineChart(vm.lineChart, "lineRaw", "coral")

            // inforbox
            vm.drawD3Text(vm.infoboxv, "", "translate(0,45)", "label_date", 18, "black")
            vm.drawD3Text(vm.infoboxv, "", "translate(0,75)", "label_text", 18, "black")
            vm.drawD3Text(vm.infoboxv, "", "translate(0,105)", "label_value", 18, "black")
            vm.drawD3Rect(vm.infoboxv, "label_rect", "translate(0,62)", 15, 15) 

            // mask brush
            vm.drawD3Brush(vm.maskv, 1, vm.mask_brush, [0,0], "mask_brush")
            vm.maskv.select(".selection").style("fill","steelblue")
            vm.maskv.select(".overlay").attr("pointer-events","none")
        },

        organizeMaskData(mask_data){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]

            let temp_start = null
            let mask = false, length = mask_data.length

            mask_data.forEach((d, index) => {
                if(d[1] && mask === false){
                    let start = moment(d[0]).format(format) 
                    temp_start = moment(start).valueOf()
                    mask = true
                }
                else if(d[1] === false && mask === true){
                    mask = false
                    vm.addMaskTimeArr(mask_data[index-1][0], temp_start)
                }
            })
            if(mask_data[length-1][1] === true && mask === true){
                mask = false
                vm.addMaskTimeArr(mask_data[length-1][0], temp_start)
            }
        },

        addMaskTimeArr(time, temp_start){
            let vm = this
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]
            let datetime_arr = []

            vm.mask_behavior += 1
            let end = moment(time).format(format)
            let class_name = "mask_layers"+vm.mask_behavior
            let temp_end = moment(end).valueOf()
        
            vm.mask_temp[vm.zoomlevel][class_name] = {"start":temp_start, "end":temp_end}
            
            vm.temp_layers.forEach((item,index)=>{
                let a = moment(moment(item.date).format(format)).valueOf()
                if(a >= temp_start && a <= temp_end){
                    datetime_arr.push(item)
                }
            })
            vm.drawD3MaskLayer(datetime_arr, class_name)
        },

        drawD3MaskLayer(data, class_name){
            let vm = this
            let mask_layers = vm.stack(data)
            vm.drawD3StreamGraph(vm.mask_layers, mask_layers, class_name, vm.area, "gray", "none", 1, true)
        },

        drawD3Brush(main, opacity=1, brush, range, class_name){
            main.append("g")
                .attr("class",class_name)
                .attr("opacity", opacity)
                .call(brush)
                .call(brush.move, range)
        },

        drawD3Text(main, text="", translate="translate(0,0)", class_name, font_size, color){
            main.append("text")
                .attr("transform", translate)
                .attr("class", class_name)
                .attr("font-size", font_size)
                .attr("fill", color)
                .text(text)
                .style("visibility","visible")
        },

        changeD3Text(main, class_name, text ,x){
            main.select("."+class_name)
                .text(text)
                .attr("x",x)
        },

        drawD3Rect(main, class_name, translate="translate(0,0)", width, height){
            main.append("rect")
                .attr("class", "label_rect")
                .attr("transform", translate)
                .attr("rx",1)
                .attr("ry",1)
                .attr("width",15)
                .attr("height",15)
                .style("opacity", 1)
                .style("fill", "#fff")
                .style("stroke", "#000")
                .style("visibility","hidden")
        },      

        changeD3Rect(main, class_name, visible, rect_color, x){
            main.select("."+class_name)
                .style("visibility", visible)
                .style("fill", rect_color)
                .attr("x", x)
        },

        changeD3LineGraph(main, id, line, data=undefined){
            let graph = main.select("#"+id)
            
            if(data != undefined)
                graph.datum(data)
            
            graph.attr("d",line)
        },

        setD3LineChart(main, id, color){
            main.append("path")
                .attr("id", id)
                .attr("fill","none")
                .attr("stroke",color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .style("clip-path", "url(#sclip)")
        },

        drawD3StreamGraph(main, layers, class_name="layer", area, fill_color, point_event, opacity=1, mask=false){
            main.selectAll("."+class_name)
                .data(layers)
                .enter().append("path")
                .attr("class", ()=>{
                    if(mask)
                        return class_name+" mask_layers"
                    else
                        return class_name
                })
                .attr("id", (d)=>{
                    if(mask)
                        return class_name
                    else
                        return d.key
                })
                .attr("key",function(d,i){
                    return d.key;
                })
                .attr("d",area)
                .style("clip-path","url(#cclip)")
                .style("fill",(d, i)=>{ return ( typeof(fill_color) != "string")?fill_color(i):fill_color }) 
                .attr("pointer-events", point_event)
                .attr("stroke", "black")
                .attr("stroke-width", "0px")
                .style("cursor","move")
                .attr("opacity", opacity)
        },

        changeD3StreamGraph(main, class_name, layers=undefined){
            let vm = this
            let graph = main.selectAll("."+class_name)

            if (layers != undefined)
                graph.data(layers)
                    .attr("d", vm.area)
            else
                graph.attr("d", vm.area)
        },

        d3LayerClick(d){
            let vm = this
            vm.clickD3Layer(d.key)
        },

        drawLineChart(label){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            vm.structLineData(label)
            // set axis domain
            vm.setAxisDomain(vm.ly, d3.extent(vm.label_rawdata, d => {return d.value} ))
            vm.setAxisDomain(vm.lyr, d3.extent(vm.label_lossdata, d => {return d.value} ))
            // change axis
            vm.redrawD3Axis(vm.selection, "lyaxis", vm.lyAxis)
            vm.redrawD3Axis(vm.selection, "lyaxisr", vm.lyAxisr)
            // draw line
            vm.changeD3LineGraph(vm.lineChart, "lineLoss", vm.loss_line, vm.label_lossdata )
            vm.changeD3LineGraph(vm.lineChart, "lineRaw", vm.raw_line, vm.label_rawdata )
            
            let changeInfo = function(d){
                let format = vm.timeformat[vm.zoomlevel]
                
                let mouseX = d3.mouse(this)[0]
                let mouseY = d3.mouse(this)[1]

                let invertedX = vm.x.invert(mouseX)
                invertedX = moment(invertedX).format(format)
                
                let dt_arr = []
                d.forEach( (item,i) => {
                    dt_arr.push(moment(item.date).format(format))
                })
                let index = dt_arr.indexOf(invertedX)

                vm.infor_date.text = "Date Time :" + invertedX
                vm.infor_raw_data.text = "Raw Data :" + vm.label_rawdata[index].value.toFixed(5) 
                vm.infor_loss_data.text= "Loss Data :" + vm.label_lossdata[index].value.toFixed(5) 
            }

            vm.lineChart.select("#lineLoss").on("mouseover",changeInfo)
            vm.lineChart.select("#lineRaw").on("mouseover",changeInfo)
        },

        changeD3InforBox(visible, rect_color, date="", label_text="", label_value="", rect_x=0, date_x=0, text_x=0, value_x=0){
            let vm = this 
            vm.changeD3Rect(vm.infoboxv, "label_rect", visible, rect_color, rect_x)
            vm.changeD3Text(vm.infoboxv, "label_date", date, date_x)
            vm.changeD3Text(vm.infoboxv, "label_text", label_text, text_x)
            vm.changeD3Text(vm.infoboxv, "label_value", label_value, value_x)
        },

        layerMousemove(current_layer, data, i){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]

            let mouseX = d3.mouse(current_layer)[0]
            let mouseY = d3.mouse(current_layer)[1]
            let rect_color = vm.z(i)
            let invertedX = vm.x.invert(mouseX)
            invertedX = moment(invertedX).format(format)
            let dt_arr = []


            vm.temp.dataloss.forEach( item => {
                dt_arr.push(moment(item[0]).format(format))
            })

            let index = dt_arr.indexOf(invertedX) 
            let index_key = vm.temp.columns.indexOf(data.key)
            let label_value = (index != -1 && index_key != -1)?vm.temp.dataloss[index][index_key] : "Lose Data"

            if( mouseX < (vm.width-100))
                vm.changeD3InforBox("visible",rect_color, invertedX, data.key, "Loss value: "+label_value, mouseX+25, mouseX+25, mouseX+55, mouseX+25)
            else
                vm.changeD3InforBox("visible",rect_color, invertedX, data.key, "Loss value: "+label_value, mouseX-200, mouseX-200, mouseX-170, mouseX-200)
        },
        
        layerMouseout(d, i){
            let vm = this
            let d3 = vm.$d3
            vm.changeD3InforBox("hidden","white")
        },

        structAreaDate( dataloss, columns, level ){
            let vm = this
            let moment = vm.$moment
            let temp = [],length = dataloss.length
            let slot = vm.timeslot[level],format = vm.timeformat[level]
            // vm.data_num.text = "Data Number: "+length

            for( let start = moment(dataloss[0][0]), i = 0; i < length; ){
                let object = {}
                let s1 = start.format(format), s2 = moment(dataloss[i][0]).format(format)
                if( s1 === s2 ){
                    columns.forEach((column,j)=>{
                        if( j === 0 ){
                            object[column] = moment(dataloss[i][j]).format(format).toString() 
                        }
                        else
                            object[column] = dataloss[i][j]
                    })
                    temp.push(object)
                    i++;
                }
                else{
                    columns.forEach((column,j)=>{
                        if( j === 0 ){
                            object[column] = start.format(format).toString() 
                        }
                        else
                            object[column] = 0
                    })
                    temp.push(object)
                }
                start.add(slot,'minute');
            }

            return temp;
        },

        structLineData( label ){
            if( label === undefined )
                return console.error("NO Key!")
            let vm = this
            let moment = vm.$moment
            let temp = vm.temp

            let index = temp.columns.indexOf(label)
            let length = temp.dataloss.length
            let format = vm.timeformat[vm.zoomlevel]
            let slot = vm.timeslot[vm.zoomlevel]
            vm.label_rawdata = [], vm.label_lossdata = []

            for( let start = moment(temp.dataloss[0][0]), i = 0; i < length; ){
                let raw = {}, loss = {}
                raw.date = start.format(format)
                loss.date = raw.date
                let s1 = raw.date
                let s2 = moment(temp.dataloss[i][0]).format(format)
                if( s1 === s2 ){
                    loss.value = temp.dataloss[i][index]
                    raw.value = temp.rawdata[i][index]
                    vm.label_rawdata.push(raw)
                    vm.label_lossdata.push(loss)
                    i++ 
                }
                else{
                    loss.value = 0, raw.value = 0
                    vm.label_rawdata.push(raw)
                    vm.label_lossdata.push(loss)
                }
                start.add(slot,"minute")
            }
        },

        stackMax(layer){
            return this.$d3.max(layer, function(d) { return d[1]; });
        },

        stackMin(layer){
            return this.$d3.min(layer, function(d) {return d[0]; });
        },

        setAxisDomain(axis, domain=[0,1]){
            let vm = this
            axis.domain(domain)
        },

        redrawD3Axis(g, path_name, path){
            g.selectAll("."+path_name).call(path)
        },

        drawAxis(main, translate="translate(0,0)", orientation="xAxis", Axis){
            main.append("g")
                .attr("class", orientation)
                .attr("transform",translate)
                .call(Axis);
        },

        drawClip(main, id_name, width, height, translate){
            main.append("defs")
                .append("clipPath")
                .attr("id", id_name)
                .append("rect")
                .attr("transform", translate)
                .attr("width", width)
                .attr("height", height)
        },

        upDate(){
            let vm = this
            let d3 = vm.$d3 
            let moment = vm.$moment
            let format = vm.timeformat[vm.zoomlevel]
            let transform = d3.event.transform

            let d3_transform = d3.event.transform
            let time_rangeL = moment(vm.x.domain()[0])
            let time_rangeR = moment(vm.x.domain()[1])  
            let milliseconds = vm.$moment.duration(time_rangeR.diff(time_rangeL))._milliseconds
            let start = time_rangeL.format(format), end = time_rangeR.format(format)
            switch(vm.zoomlevel){
                case 'day':
                    if(milliseconds < 1296000000){
                        vm.zoomlevel = "hour"
                        vm.changeData({
                            "level":vm.zoomlevel,
                            'filter': true,
                            "start_date":time_rangeL.add(-6,"day").format(format),
                            "end_date":time_rangeR.add(6,"day").format(format)
                        },transform, start, end)
                    }
                    else
                        vm.D3zooming(d3_transform)
                    break
                case 'hour':
                    if( milliseconds > 1296000000 ){
                        vm.zoomlevel = "day"
                        vm.changeData({
                            "level":vm.zoomlevel
                        },transform, "", "")
                    }
                    if( milliseconds < 129600000 ){
                        vm.zoomlevel = "minute"
                        vm.changeData({
                            "level":vm.zoomlevel,
                            "filter":true,
                            "start_date":time_rangeL.add(-1,"day").format(format),
                            "end_date":time_rangeR.add(1,"day").format(format)
                        },transform,start,end)
                    }
                    else
                        vm.D3zooming(d3_transform)                 
                    break
                case 'minute':
                    if( milliseconds > 129600000 ){
                        vm.zoomlevel = "hour"
                        vm.changeData({
                            "level":vm.zoomlevel,
                            "filter":true,
                            "start_date":time_rangeL.add(-7,"day").format(format),
                            "end_date":time_rangeR.add(7,"day").format(format)
                        },transform,start,end)
                    }
                    else
                        vm.D3zooming(d3_transform)    
                    break
                
                default:
                    console.error("Zooming Error")
                    break
            }   
            

        },

        D3zooming(transform){
            let vm = this 
            let d3 = vm.$d3 
            let moment = vm.$moment

            vm.setAxisDomain(vm.x, transform.rescaleX(vm.x2).domain())
            vm.redrawD3Axis(vm.svg, "xaxis", vm.xAxis)
            vm.changeD3StreamGraph(vm.layers, "layer")
            vm.changeD3StreamGraph(vm.mask_layers, "mask_layers")
            
            if(vm.select_label != null){
                vm.changeD3LineGraph(vm.lineChart, "lineRaw", vm.raw_line)
                vm.changeD3LineGraph(vm.lineChart, "lineLoss", vm.loss_line)
            }
            vm.focusv.select(".brush").call(vm.brush.move, vm.x.range().map(transform.invertX, transform));
        }
        
    },
    mounted(){
        let vm = this  
        // Interoperable data 
        vm.eventBus = EventBus
		EventBus.root = vm
		EventBus.cm = vm.$refs.cm
		vm.$refs.cm.eventBus = EventBus

        this.initial();
    },

	beforeDestroy() {
		var vm = this;
		if (vm.appLegend && vm.appInfo) {
            vm.appLegend.destroy()
            vm.appInfo.destroy()
		}
	}
}
</script>

<style scoped>
#chart2 { 
  background: #fff;
}

p {
  font: 12px helvetica;
}

.layer{
    fill:steelblue
}
</style>