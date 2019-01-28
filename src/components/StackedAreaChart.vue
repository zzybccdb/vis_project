<template>
    <div class="stackedAreaChart-wrapper" ref="home">
        <v-flex xs12 class="sac" ref="sac" style="border:1px solid #ccc;box-shadow:none; margin:10px">
            <div id="chart2" ref="chart2"> </div>
        </v-flex>

        <!-- <v-flex ref="legendbox" style="border:1px solid #ccc;box-shadow:none; margin:10px; width:170px;">
            <canvas ref="legend"></canvas>
        </v-flex> -->
    </div>
</template>

<script>
const EventBus = {

}
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
        init(){
            let vm = this
            vm.d3Init()
            vm.pixiInit()
            vm.timeformat = {
                "day":"YYYY-MM-DD 00:00:00",
                "hour":"YYYY-MM-DD HH:00:00",
                "minute":"YYYY-MM-DD HH:mm:00",
            }
            //测试资料
            let data = [
            { date: "2006", redDelicious: "10", mcintosh: "15", oranges: "9", pears: "6" },
            { date: "2007", redDelicious: "12", mcintosh: "18", oranges: "9", pears: "4" },
            { date: "2008", redDelicious: "05", mcintosh: "20", oranges: "8", pears: "2" },
            // { date: "2006", redDelicious: "-10", mcintosh: "-15", oranges: "-9", pears: "-6" },
            // { date: "2007", redDelicious: "-12", mcintosh: "-18", oranges: "-9", pears: "-4" },
            // { date: "2008", redDelicious: "-05", mcintosh: "-20", oranges: "-8", pears: "-2" },   
            ];

            let data2 = [
                { date: "2006", redDelicious: "-10", mcintosh: "-15", oranges: "-9", pears: "-6" },
                { date: "2007", redDelicious: "-12", mcintosh: "-18", oranges: "-9", pears: "-4" },
                { date: "2008", redDelicious: "-05", mcintosh: "-20", oranges: "-8", pears: "-2" },
            ]
            //vm.keys = undefined
            vm.keys = ["redDelicious","mcintosh","oranges","pears"]
            // vm.StacedArea(vm.keys,data,data2)
        },
        
        d3Init(){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            //设定长宽margin属性
            vm.margin = {top: 20, right: 50, bottom: 30, left: 50}
            vm.width = vm.$refs.sac.clientWidth - vm.margin.right - vm.margin.left
            vm.height = 600 - vm.margin.top - vm.margin.bottom
            // vm.content_height = vm.height - 200
            //设定坐标轴,颜色的变化模式以及绘图区域
            vm.content_height = vm.height
            vm.x = d3.scaleTime().range([0, vm.width])
            vm.y = d3.scaleLinear()
                .range([vm.content_height-10, 0])
            vm.z = d3.scaleOrdinal(d3.schemeSet3)
            //将坐标轴设定绑定到对应的轴线
            vm.xAxis = d3.axisBottom(vm.x)
            vm.yAxis = d3.axisLeft(vm.y)
            vm.yAxisr = d3.axisRight(vm.y)
            //设定堆叠的属性
            vm.stack = d3.stack()
                // order includes stackOrderAscending stackOrderDescending(defalut) stackOrderInsideOut stackOrderNone stackOrderReverse
                .order(d3.stackOrderDescending)
                // d3.stack offset help to adjust the offset of stack
                .offset(d3.stackOffNone)
            //设定area的属性
            vm.area = d3.area()
                .curve(d3.curveMonotoneX)
                .x(function(d)  { return vm.x(moment(d.data.date)); })
                .y0(function(d) { return vm.y(d[0]); })
                .y1(function(d) { return vm.y(d[1]); })
            //主体svg绘制
            vm.svg = d3.select("#chart2").append("svg")
                .attr("width", vm.width + vm.margin.right + vm.margin.left)
                .attr("height", vm.height + vm.margin.top + vm.margin.bottom + 120 ) 
            //主视图绘制
            vm.contentv = vm.svg.append("g")
                .attr("class","content")
                .attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")
            //主视图绑定layer属性
            vm.layers = vm.contentv.append("g")
                .attr("class","layers")
        },

        pixiInit(){
            
        },

        StacedArea(keys,data,data2){
            let vm = this
            let d3 = vm.$d3
            let moment = vm.$moment
            //将资料转换成需要的格式
            vm.stack.keys(keys)
            let layers = vm.stack(data)
            let layers2 = vm.stack(data2)
            console.log(layers)
            layers2 = vm.reRangeFakeLayer(layers,layers2)
            console.log(layers2)
            //设定坐标轴范围
            vm.setAxisDomain(vm.x, vm.$d3.extent(data, function(d) { return moment(d.date); }))
            vm.setAxisDomain(vm.y, [-d3.max(layers, vm.stackMax), d3.max(layers, vm.stackMax)])
            //绘制坐标
            vm.drawAxis(vm.contentv, "translate(0,"+(vm.content_height/2-5)+")", "xaxis", vm.xAxis)
            vm.drawAxis(vm.contentv, "translate(" + vm.width + ", 0)", "yaxisr", vm.yAxisr)
            vm.drawAxis(vm.contentv, "translate(0, 0)", "yaxisr", vm.yAxis)
            vm.drawClip(vm.contentv, "cclip", vm.width, vm.height, "translate(0,0)")
            //绘制堆叠区域
            vm.drawStackGraph(vm.layers, layers, "layer", vm.area, vm.z, "auto")
            vm.drawStackGraph(vm.layers, layers2, "layer2", vm.area, vm.z, "auto")
        },

        setAxisDomain(axis, domain=[0,1]){
            let vm = this
            axis.domain(domain)
        },

        stackMax(layer){
            return this.$d3.max(layer, function(d) { return d[1]; });
        },

        stackMin(layer){
            return this.$d3.min(layer, function(d) {return d[0]; });
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
        
        drawStackGraph(main, layers, class_name="layer", area, fill_color, point_event, opacity=1, mask=false){
            main.selectAll("."+class_name)
                .data(layers)
                .enter().append("path")
                .attr("class", ()=>{
                    return class_name
                })
                .attr("id", (d)=>{
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

        reRangeFakeLayer(real,fake){
            let vm = this
            let newfake = []
            real.forEach(r => {
                let a = fake.filter(f => r.key === f.key)
                console.log(a)
            })
            return newfake
        }
    },
    //启动呼叫
    mounted(){
        let vm = this 
        vm.init()
    }, 
    //离开时执行的内容
    beforeDestroy(){
        let vm = this
		if (vm.appLegend && vm.appInfo) {
            vm.appLegend.destroy()
            vm.appInfo.destroy()
		}
    }
}
</script>