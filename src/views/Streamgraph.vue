<template>
	<div>
		<div class="streamgraph" ref="streamgraph">
			<div style="margin-left: 30px; margin-top:30px">
				<div style="margin-left:50px">
					<v-btn-toggle v-model="toggle_exclusive">
						<v-btn flat small v-on:click=Status(0)>
						<v-icon>fas fa-arrows-alt-h</v-icon>
						</v-btn>
						<v-btn flat small v-on:click=Status(1)>
						<v-icon>far fa-hand-point-up</v-icon>
						</v-btn>
						<!-- <v-btn flat small v-on:click=Status(2)>
						<v-icon>fas fa-redo</v-icon>
						</v-btn> -->
					</v-btn-toggle>
				</div>
			</div>
			<div id="chart" ref="chart"></div>
			<canvas ref="legend" style="z-index:999"></canvas>
		</div>
	</div> 
</template>

<script>
export default {
	components: {},
	data:()=>{
		return{
			toggle_exclusive:1,
		}
	},
	methods:{
		Status(item){
			if( item != 2){
				let event = (item===1)?"none":"all";
				this.$d3.select(".mask_brush>.overlay").attr("pointer-events",event);
			}
		},

		initial(){
			let vm = this;
			vm.rawData = null;
			vm.sl_label = null;
			vm.zoom_level = "day";
			vm.gl_start = null;
			vm.gl_end = null;
			let g = new vm.$PIXI.Graphics();
			g.lineStyle(1, 0x000000,1);
			g.beginFill(0xFFFFFF);
			g.drawRoundedRect(0, 0, 13, 12,1);
			g.endFill();
			vm.cellTexture = g.generateCanvasTexture();

			vm.format = {
				"day":"YYYY-MM-DD 00:00:00",
				"hour":"YYYY-MM-DD HH:00:00",
				"minute":"YYYY-MM-DD HH:mm:00",
			}

			vm.margin = {top: 20, right: 50, bottom: 30, left: 50};
			vm.width = vm.$refs.streamgraph.clientWidth * 0.8 - vm.margin.right - vm.margin.left;
			vm.height = 600 - vm.margin.top - vm.margin.bottom;
			vm.content_height = vm.height-200;
			vm.app_width = vm.$refs.streamgraph.clientWidth * 0.15,
			vm.app_height = vm.height + 120;

			vm.mask = {
				"day":{},
				"hour":{},
				"minute":{}
			}
			window.mask = vm.mask;
			vm.mask_behavior = 0;
			vm.mask_stack = [];

			vm.app = new vm.$PIXI.Application( vm.app_width, vm.app_height, {
				antialias:true,
				view:vm.$refs.legend,
				backgroundColor:0xFFFFFF
			});

			vm.x = vm.$d3.scaleTime()
				.range([0, vm.width]);

			vm.x2 = vm.$d3.scaleTime()
				.range([0, vm.width]);

			vm.y = vm.$d3.scaleLinear()
				.range([vm.content_height-10, 0]);

			vm.y2 = vm.$d3.scaleLinear()
				.range([vm.content_height-10, 0]);

			vm.ly = vm.$d3.scaleLinear()
					.range([vm.content_height,vm.content_height-180]);

			vm.lyr = vm.$d3.scaleLinear()
					.range([vm.content_height,vm.content_height-180]);

			vm.line = vm.$d3.line()
					// .curve(vm.$d3.curveCatmullRom)
					.x(function(d) {return vm.x(new Date(d.date));})
					.y(function(d) {return vm.ly(d.value);});

			vm.loss_line = vm.$d3.line()
					// .curve(vm.$d3.curveCatmullRom)
					.x(function(d) {return vm.x(new Date(d.date));})
					.y(function(d) {return vm.lyr(d.value);});

			vm.z = vm.$d3.scaleOrdinal(vm.$d3.schemeSet3)
			vm.zoom = vm.$d3.zoom()
				.scaleExtent([1, Infinity])
				.translateExtent([[0, 0], [vm.width, vm.content_height]])
				.extent([[0, 0], [vm.width, vm.content_height]])
				.on("zoom", vm.zoomed);

			vm.xAxis = vm.$d3.axisBottom(vm.x);
			vm.yAxis = vm.$d3.axisLeft(vm.y);
			vm.yAxisr = vm.$d3.axisRight(vm.y);  

			vm.lyAxis = vm.$d3.axisLeft(vm.ly)
			vm.lyAxisr = vm.$d3.axisRight(vm.lyr);  

			vm.$axios.post(vm.$api + '/analysis/dim_loss',{"level":"day"}).then((data)=>{
				vm.columns = data.data.columns;
				// console.log(vm.columns)
				vm.dataloss = data.data.loss;
				window.dataloss = vm.dataloss;
				vm.rawData = data.data.raw;
				window.rawData = vm.rawData;
				vm.maskData = data.data.mask;
				window.maskData = vm.maskData;
				let keys = vm.columns.slice(1);
				// console.log(keys)
				let totalSize = data.data.loss.length
				vm.container = vm.DrawLegend( keys, vm.z, vm, totalSize );
				vm.app.stage.addChild(vm.container);
				vm.gl_start = vm.$moment(vm.dataloss[0][0]).format("YYYY-MM-DD");
				vm.gl_end= vm.$moment(vm.dataloss[vm.dataloss.length-1][0]).format("YYYY-MM-DD");
				vm.DrawChart();
			});

			vm.brush = vm.$d3.brushX()
				.extent([[0, 20], [vm.width, 50]])
				.on("brush end", vm.brushed);
			
			vm.mask_brush = vm.$d3.brushX()
				.extent([[0, 0], [vm.width, vm.content_height]])
				.on("end", vm.MaskBrushed);
		},
		
		CheckMask( time_start, time_end){
			// time_start = vm.$moment(time_start).format(vm.format[vm.zoom_level])
			// time_end = vm.$moment(time_end).format(vm.format[vm.zoom_level])
			// time_start = new Date(time_start).getTime();
			// time_end = new Date(time_end).getTime();
			let exist = false
			let temp = {}
			var vm = this
			for( let item in vm.mask[vm.zoom_level] ){
				if( item.start <= time_start && item.end >= time_end ){
					exist = true
					break
				}
				else if((item.start >= time_start && item.end <= time_end) ||  
						(item.start >= time_start && item.end >= time_end) ||
						(item.start <= time_start && item.end <= time_end)){
					delete vm.mask[vm.zoom_level][item];
					temp.start = Math.min(item.start,time_start)
					temp.end = Math.max(item.end,time_end)
				}
			}
			if( exist === false ){
				vm.mask_behavior += 1
				let id = "mask_layer"+vm.mask_behavior
				vm.mask[vm.zoom_level][id] = temp
			}

		},

		MaskBrushed(){
			var vm = this
			let s = vm.$d3.event.selection;
			let datetime_arr = [], temp = {}, drawed = false;
			let mask_range = s.map(vm.x.invert, vm.x);
			mask_range = mask_range.map((d)=>{
				return vm.$moment(d).format(vm.format[vm.zoom_level]);
			})
			mask_range = mask_range.sort();
			console.log(mask_range)
			let b = mask_range.map((d)=>{
				return new Date(d).getTime();
			}) 
			temp.start = b[0], temp.end = b[1];
			for( let item in vm.mask[vm.zoom_level] ){
				if ( item.start <= b[0] && item.end >= b[1]){
					drawed = true;
					break;
				}
				else{
					if( (b[0] >= vm.mask[vm.zoom_level][item].start && b[0] <= vm.mask[vm.zoom_level][item].end)
					|| (b[1] >= vm.mask[vm.zoom_level][item].start && b[1] <= vm.mask[vm.zoom_level][item].end) ){
						temp.start = Math.min(temp.start,vm.mask[vm.zoom_level][item].start);
						temp.end = Math.max(temp.end,vm.mask[vm.zoom_level][item].end);
						vm.$d3.selectAll("#"+item).remove();
						delete vm.mask[vm.zoom_level][item];
					}
				}
			}
			if( drawed === false ){
				vm.mask_behavior += 1;
				let id = "mask_layer"+vm.mask_behavior;
				vm.mask[vm.zoom_level][id] = temp

				vm.temp.forEach((d)=>{
					let a = new Date(vm.$moment(d.date).format(vm.format[vm.zoom_level])).getTime();
					if( a >= temp.start && a <= temp.end ){
						datetime_arr.push(d);   
					}
				})
				vm.DrawMaskGraph( datetime_arr, id )
				vm.$axios.post(vm.$api + '/analysis/mask',{"level":vm.zoom_level,"index":mask_range})
			}
			vm.$d3.select(".mask_brush>.selection").attr("width",0);
		},

		MaskDisabled(){

		},

		DrawMaskGraph( datetime_arr, class_name ){
			var vm = this
			vm.mask_stack = vm.stack(datetime_arr);
			// console.log(vm.mask_stack)
			vm.mask_layers.selectAll(".mask_layer"+vm.mask_behavior)
				.data(vm.mask_stack)
				.enter().append("path")
				.attr("class",class_name+" mask_layer")
				.attr("id",class_name)
				.attr("key",function(d){
					return d.key;
				})
				.attr("d",vm.area)
				.style("clip-path","url(#cclip)")
				.style("fill",()=>{ return "gray"; }) 
				.style("pointer-events","none")
				.attr("stroke", "black")
				.attr("stroke-width", "0px")
				.style("cursor","move");
		},

		DrawChart(){
			let vm = this;
			vm.temp = vm.StructAreaDate(vm.dataloss,"day");
			let keys = vm.columns.slice(1);

			vm.stack = vm.$d3.stack()
				.keys(keys)
				// order includes stackOrderAscending stackOrderDescending(defalut) stackOrderInsideOut stackOrderNone stackOrderReverse
				.order(vm.$d3.stackOrderAscending)
				// d3.stack offset help to adjust the offset of stack
				.offset(vm.$d3.stackOffsetSilhouette)

			vm.area = vm.$d3.area()
				.curve(vm.$d3.curveMonotoneX)
				.x(function(d)  { return vm.x(new Date(d.data.date)); })
				.y0(function(d) { return vm.y(d[0]); })
				.y1(function(d) { return vm.y(d[1]); });

			let layers = vm.stack(vm.temp);

			// vm.mask_stack = vm.stack(vm.temp.slice(vm.temp.length-1));

			vm.y.domain([vm.$d3.min(layers, vm.StackMin), vm.$d3.max(layers, vm.StackMax)])
			vm.x.domain(vm.$d3.extent(vm.temp, function(d) { return new Date(d.date); }));
			vm.x2.domain(vm.x.domain())
			vm.y2.domain(vm.y.domain())

			//main svg
			let svg = vm.$d3.select("#chart").append("svg")
				.attr("width", vm.width + vm.margin.right + vm.margin.left)
				.attr("height", vm.height + vm.margin.top + vm.margin.bottom + 120 )    
				.call(vm.zoom);
			
			//focus view
			let focus = svg.append("g")
					.attr("class","focus")
					.attr("transform", "translate(" + vm.margin.left + "," + (0) + ")")

			//focus x axis
			focus.append("g")
				.attr("class", "fxaxis")
				.attr("transform", "translate(0," + (50) + ")")
				.call(vm.xAxis);

			//focus brush 
			focus.append("g")
				.attr("class", "brush")
				.attr("opacity",0.7)
				.call(vm.brush)
				.call(vm.brush.move, vm.x.range());
			//content view 
			let content = svg.append("g")
					.attr("class","content")
					.attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")
			
			let mask = svg.append("g")
					.attr("class","mask")
					.attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")

			let infobox = svg.append("g")
					// .style("z-index",999)
					.attr("class","infobox")
					.attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 100) + ")")

			//selection view
			let selection  = svg.append("g")
					.attr("class", "selection")
					.attr("transform", "translate(" + vm.margin.left + "," + (vm.margin.top + 320) + ")");

			//content clip path
			content.append("defs").append("clipPath")
				.attr("id", "cclip")
				.append("rect")
				.attr("width", vm.width)
				.attr("height", vm.content_height);

			//selection clip path
			selection.append("defs").append("clipPath")
				.attr("id", "sclip")
				.append("rect")
				.attr("transform", "translate(" + 0 + "," + 150 + ")")
				.attr("width", vm.width)
				.attr("height", 200);

			//content x axis
			content.append("g")
				.attr("class", "xaxis")
				.attr("transform", "translate(0," + vm.content_height + ")")
				.call(vm.xAxis);
		
			//selection x axis
			selection.append("g")
				.attr("class", "xaxis")
				.attr("transform", "translate(0," + (vm.content_height) + ")")
				.call(vm.xAxis);

			//selection y axis
			selection.append("g")
				.attr("class", "lyaxis")
				.call(vm.lyAxis);
			selection.append("text")
				.attr("transform","translate(-15,160)")
				// .style("z-index",999)
				.style("font-size",12)
				.style("fill","red")
				.text("Raw Data");

			selection.append("text")
				.attr("transform","translate("+(vm.width-10)+",160)")
				// .style("z-index",999)
				.style("font-size",12)
				.style("fill","steelblue")
				.text("Loss");
			//selection right y axis
			selection.append("g")
				.attr("class", "lyaxisr")
				.attr("transform", "translate(" + vm.width + ", 0)")
				.call(vm.lyAxisr);
			//content right y axis
			content.append("g")
				.attr("class", "yaxisr")
				.attr("transform", "translate(" + vm.width + ", 0)")
				.call(vm.yAxisr);
			//content left y axis
			content.append("g")
				.attr("class", "yaxis")
				.call(vm.yAxis);
			//content layers 
			vm.layers = content.append("g")
				.attr("class", "layers")

			//content layer
			vm.layers.selectAll(".layer")
				.data(layers)
				.enter().append("path")
				.attr("class","layer")
				.attr("key",function(d){
					return d.key;
				})
				.attr("d",vm.area)
				.style("clip-path","url(#cclip)")
				.style("fill",(d, i)=>{ return vm.z(i); }) 
				.attr("stroke", "black")
				.attr("stroke-width", "0px")
				.style("cursor","move");

		
			//content layer behavior
			vm.layers.selectAll(".layer")
				.attr("opacity", 1)
				.on("click", function(d,i){
					vm.sl_label = d.key;
					vm.$d3.selectAll(".layer")
					.attr("opacity", function(d,j) {
						return j != i ? 0.3 : 1;
					}).classed("hover", function(d,j) {
						return j != i ? false : true;
					})
					.attr("stroke-width", function(d, j) {
						return j != i ? "0px" : "1px";
					})
					vm.container.children.forEach((item,i)=>{
						if(item.text != undefined && item.text === d.key)
							item.alpha = 1;
						else if( i > vm.container.children.length-8)
							item.alpha = 1;
						else
							item.alpha = 0.3;
					})
					vm.StructLineData(d.key);
					vm.DrawLineChart();
					let mousex = vm.$d3.mouse(this)[0];
					let invertedx = vm.$moment(vm.x.invert(mousex)).format(vm.format[vm.zoom_level]);
					vm.CheckedTime(invertedx);
				})
				.on("mousemove", function(d,i){
					let mousex = vm.$d3.mouse(this)[0];
					let format = {
						'day':"YYYY-MM-DD",
						'hour':"YYYY-MM-DD HH:00",
						'minute':"YYYY-MM-DD HH:mm:00",
					}
					let invertedx = vm.x.invert(mousex);
					invertedx = vm.$moment(invertedx).format(format[vm.zoom_level])
					d.forEach((item,i)=>{
						vm.dataarr[i] = vm.$moment(item.data.date).format(format[vm.zoom_level])
					})
					let index = vm.dataarr.indexOf(invertedx);
					let key_index = vm.columns.indexOf(d.key);
					svg.select(".label_rect").style("visibility", "visible");
					if(mousex < (vm.width-260)){
						svg.select(".label_date").text(invertedx).attr("x",mousex+55)
						svg.select(".label_text").text(d.key).attr("x",mousex+55)
						if(d[index] != undefined)
							svg.select(".label_value").text("error:"+vm.dataloss[index][key_index].toFixed(5)).attr("x",mousex+25)
						else
							svg.select(".label_value").text("error:"+"no data").attr("x",mousex+25)
						svg.select(".label_rect").style("fill", "#000").attr("x",mousex+25).style("fill", vm.z(i))
					}
					else{
						svg.select(".label_date").text(invertedx).attr("x",mousex-200)
						svg.select(".label_text").text(d.key).attr("x",mousex-170)
						if(d[index] != undefined)
							svg.select(".label_value").text("error:"+vm.dataloss[index][key_index].toFixed(5)).attr("x",mousex-200)
						else
							svg.select(".label_value").text("error:"+"no data").attr("x",mousex-200)
						svg.select(".label_rect").style("fill", "#000").attr("x",mousex-200).style("fill", vm.z(i))
					}
					if( vm.sl_label === d.key ){
						let c_lenght = vm.container.children.length;
						vm.container.children[c_lenght-2].text = "Date Time: " + invertedx;
						vm.container.children[c_lenght-1].text = "Raw Data: " + vm.lineData[index].value.toFixed(5)
					}
				})
				.on("mouseout", function() {
					svg.select(".label_rect").style("visibility", "hidden");
					svg.select(".label_date").text("");
					svg.select(".label_text").text("");
					svg.select(".label_value").text("");

				})
			//selection line chart path
			vm.lineChart = selection.append("g").attr("class","lineChart");
			vm.raw_circle = selection.append("circle");
			vm.raw_circle.attr("fill","coral").attr("r",0);
			//selection line loss path
			vm.lineChart.append("path")
				.attr("id","lineLoss")
				.attr("fill", "none")
				.attr("stroke", "steelblue")
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.style("clip-path","url(#sclip)");   

			//selection raw data path
			vm.lineChart.append("path")
				.attr("id","lineRaw")
				.attr("fill", "none")
				.attr("stroke", "coral")
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.style("clip-path","url(#sclip)");   

			//content data info view 
			infobox.append("text")
				.attr("class","label_date")
				.attr("x",0)
				.attr("y",45)
				.attr("font-size",18)
				.attr("fill","black")
				.text("")
				// .style("z-index",999)
				.style("visibility", "visible");

			infobox.append("text")
				.attr("class","label_text")
				.attr("x",0)
				.attr("y",75)
				.attr("font-size",18)
				.attr("fill","black")
				.text("")
				// .style("z-index",999)
				.style("visibility", "visible");

			infobox.append("text")
				.attr("class","label_value")
				.attr("x",0)
				.attr("y",105)
				.attr("font-size",18)
				.attr("fill","black")
				.text("")
				// .style("z-index",999)
				.style("visibility", "visible");

			infobox.append("rect")
				.attr("class", "label_rect")
				.attr("y",62)
				.attr("rx",1)
				.attr("ry",1)
				.attr("width", "15")
				.attr("height", "15")
				.style("opacity",1)
				.style("fill", "#fff")
				.style("stroke","#000")
				// .style("z-index",999)
				.style("visibility", "hidden")

			//mask brush 
			mask.append("g")
				.attr("class", "mask_brush")
				.attr("opacity",0.7)
				.call(vm.mask_brush)
			vm.$d3.select(".mask_brush>.overlay").attr("pointer-events","none");
			//mask layers 
			vm.mask_layers = mask.append("g")
				.attr("class","mask_layers")

			vm.$d3.select(".mask_brush>.selection").style("fill","steelblue")
			vm.svg = svg;
			vm.selection = selection;
			vm.GetMaskData();
		},

		StackMax(layer){
			return this.$d3.max(layer, function(d) { return d[1]; });
		},

		StackMin(layer){
			return this.$d3.min(layer, function(d) { return d[0]; });
		},

		DrawLegend( legends, z, vm, totalSize ){
			let container = new vm.$PIXI.Container();
			let title = new vm.$PIXI.Text("Labels",{fontFamily :'Times New Roman', fontSize: 15, fill : 0x000000});
			title.x = 15, title.y = 105;
			title.buttonMode = true;
			title.interactive = true;
			container.addChild(title);
			title.mousedown = ()=>{
				vm.$d3.selectAll(".layer")
				.attr("opacity", 1)
				.classed("hover", false)
				.attr("stroke-width", "0px")
				container.children.forEach((item)=>{
					item.alpha = 1;
				})                
			}

			legends.forEach((item,i)=>{
				let sp = new vm.$PIXI.Sprite(vm.cellTexture);
				sp.tint = z(i).replace("#","0x")
				sp.x = 15;
				sp.y = i * 20 + 130;
				sp.text = item;

				let key = new vm.$PIXI.Text(item,{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
				key.x = 35, key.y = sp.y;
				key.interactive = true;
				key.buttonMode = true;
				key.mousedown = function(){
					let text = item;
					vm.sl_label = key.text;
					vm.$d3.selectAll(".layer")
					.attr("opacity", function(d) {
						return d.key != text ? 0.3 : 1;
					}).classed("hover", function(d) {
						return d.key != text ? false : true;
					})
					.attr("stroke-width", function(d) {
						return d.key != text ? "0px" : "1px";
					})
					container.children.forEach((item,i)=>{
						if(item.text != undefined && item.text === text)
							item.alpha = 1;
						else if( i > container.children.length-8)
							item.alpha = 1;
						else
							item.alpha = 0.3;
					})
					vm.StructLineData(text);
					vm.DrawLineChart();
				}

				container.addChild(sp)
				container.addChild(key)
			})
			let endheight = container.children[container.children.length-1].y
			vm.legend_num = new vm.$PIXI.Text("Data Number: "+totalSize,{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			vm.legend_num.x = 15, vm.legend_num.y = endheight + 30
			container.addChild(vm.legend_num)

			vm.legend_level = new vm.$PIXI.Text("zoom level: "+vm.zoom_level,{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			vm.legend_level.x = 15, vm.legend_level.y = endheight + 50
			container.addChild(vm.legend_level)

			let graphics = new vm.$PIXI.Graphics(); 
			// set a fill and line style
			graphics.beginFill(0xfff);
			graphics.lineStyle(10, 0xff7f50, 1);
			graphics.moveTo(15,vm.content_height + 205);
			graphics.lineTo(25, vm.content_height + 205);
			graphics.endFill();
			container.addChild(graphics)

			graphics.beginFill(0xfff);
			graphics.lineStyle(10, 0x4682b4,1);
			graphics.moveTo(15,vm.content_height + 225);
			graphics.lineTo(25, vm.content_height + 225);
			graphics.endFill();
			container.addChild(graphics)
		
			let label_raw = new vm.$PIXI.Text("Raw Data",{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			label_raw.x = 35, label_raw.y = vm.content_height + 198;
			container.addChild(label_raw)
			let label_loss = new vm.$PIXI.Text("Error Value",{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			label_loss.x = 35, label_loss.y = vm.content_height + 218;
			container.addChild(label_loss)

			let rawData_t = new vm.$PIXI.Text("Date Time: None",{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			rawData_t.x = 15, rawData_t.y = vm.content_height + 250;
			container.addChild(rawData_t)
			let rawData = new vm.$PIXI.Text("Raw Data: None",{fontFamily :'Times New Roman', fontSize: 12, fill : 0x000000});
			rawData.x = 15, rawData.y = vm.content_height + 280;
			container.addChild(rawData)
			return container;
		},

		DrawLineChart(){
			var vm = this
			vm.ly.domain(vm.$d3.extent(vm.lineData,function(d){return d.value}))
			vm.lyr.domain(vm.$d3.extent(vm.linedata_loss,function(d){return d.value}))

			vm.selection.select(".lyaxis").call(vm.lyAxis);
			vm.selection.select(".lyaxisr").call(vm.lyAxisr);
			
			vm.selection.select("#lineLoss")
						.datum(vm.linedata_loss)  
						.attr("d", vm.loss_line);

			vm.selection.select("#lineRaw")
						.datum(vm.lineData)         
						.attr("d", vm.line)
						.on("mouseover",function(d){  
							let format = null;
							switch (vm.zoom_level ) {
								case 'day':
									format = "YYYY-MM-DD";
									break;
								case 'hour':
									format = "YYYY-MM-DD HH:00";
									break;
								case 'minute':
									format = "YYYY-MM-DD HH:mm:00";
									break;
								default:
									break;
							}
							let mousex = vm.$d3.mouse(this)[0];
							// vm.raw_circle.attr("r",5).attr("cx",mousex).attr("cy",mousey);
							let invertedx = vm.x.invert(mousex);
							invertedx = vm.$moment(invertedx).format(format)
							//line chart date array
							let dt_arr = [];
							d.forEach((item,i)=>{
								dt_arr[i] = vm.$moment(item.date).format(format)
							})
							let index = dt_arr.indexOf(invertedx)
							let c_lenght = vm.container.children.length;
							vm.container.children[c_lenght-2].text = "Date Time: " + invertedx;
							vm.container.children[c_lenght-1].text = "Raw Data: " + vm.lineData[index].value.toFixed(5)                            
						})
		},

		StructLineData( key=null ){
			var vm = this
			let index = vm.columns.indexOf(key);
			let length = vm.dataloss.length;
			vm.lineData = [], vm.linedata_loss = [];
			let format = null;
			let slot = {
				'day':1440,
				'hour':60,
				'minute':1,
			};
			switch (vm.zoom_level ) {
				case 'day':
					format = "YYYY-MM-DD 00:00:00";
					break;
				case 'hour':
					format = "YYYY-MM-DD HH:00:00";
					break;
				case 'minute':
					format = "YYYY-MM-DD HH:mm:00";
					break;            
				default:
					break;
			}
			for( let start = vm.$moment.utc(vm.dataloss[0][0]), i = 0; i < length; ){
				let temp = {}, loss = {};
				temp.date = start.format(format).toString()
				let s1 = start.format(format)
				let s2 = vm.$moment.utc(vm.dataloss[i][0]).format(format)
				// if( start.isSame(vm.dataloss[i][0]) ){
				if( s1 === s2 ){
					// (vm.zoom_level === 'day')?temp.date = start.format("ddd, DD MMM YYYY 00:00:00").toString():temp.date = start.format("ddd, DD MMM YYYY HH:00:00").toString();
					loss.date = temp.date;  
					loss.value = vm.dataloss[i][index];
					temp.value = vm.rawData[i][index];   
					vm.linedata_loss.push(loss);
					vm.lineData.push(temp);           
					i++;
				}
				else{
					loss.date = temp.date;
					loss.value = 0;
					temp.value = 0;   
					vm.linedata_loss.push(loss);
					vm.lineData.push(temp);
				}
				start.add('minute',slot[vm.zoom_level]);               
			}
		},

		StructAreaDate( dataloss, level ){
			var vm = this;
			let temp = [],length = dataloss.length;
			vm.legend_num.text = "Data Number: "+length;

			switch (level) {
				case "day":
					for( let start = vm.$moment.utc(dataloss[0][0]), i = 0; i < length; ){
						let object = {};
						let s1 = start.format("YYYY-MM-DD")
						let s2 = vm.$moment.utc(dataloss[i][0]).format("YYYY-MM-DD")
						// console.log(s1,s2)
						// if( start.isSame(dataloss[i][0])){
						if( s1 === s2 ){
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = vm.$moment(dataloss[i][j]).format("YYYY-MM-DD 00:00:00").toString() 
								}
								else
									object[column] = dataloss[i][j]
							})
							temp.push(object)
							i++;
						}
						else{
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = start.format("YYYY-MM-DD 00:00:00").toString() 
								}
								else
									object[column] = 0
							})
							temp.push(object)
						}
						start.add('hour',24);
					}
					break;
				case 'hour':
					for( let start = vm.$moment.utc(dataloss[0][0]), i = 0; i < length; ){
						let object = {};
						let s1 = start.format("YYYY-MM-DD HH:00:00")
						let s2 = vm.$moment.utc(dataloss[i][0]).format("YYYY-MM-DD HH:00:00")
						//if( start.isSame(dataloss[i][0]) ){
						if( s1 === s2 ){
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = vm.$moment.utc(dataloss[i][j]).format("YYYY-MM-DD HH:00:00").toString() 
								}
								else
									object[column] = dataloss[i][j]
							})
							temp.push(object)
							i++;
						}
						else{
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = start.format("YYYY-MM-DD HH:00:00").toString() ;
								}
								else
									object[column] = 0
							})
							temp.push(object)
						}
						start.add('hour',1);
					}
					break;
				case 'minute':
					for( let start = vm.$moment.utc(dataloss[0][0]), i = 0; i < length; ){
						let object = {};
						let s1 = start.format("YYYY-MM-DD HH:mm:00")
						let s2 = vm.$moment.utc(dataloss[i][0]).format("YYYY-MM-DD HH:mm:00")

						//if( start.isSame(dataloss[i][0]) ){
						if( s1 === s2){
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = vm.$moment.utc(dataloss[i][j]).format("YYYY-MM-DD HH:mm:00").toString() 
								}
								else
									object[column] = dataloss[i][j]
							})
							temp.push(object)
							i++;
						}
						else{
							vm.columns.forEach((column,j)=>{
								if( j === 0 ){
									object[column] = start.format("YYYY-MM-DD HH:mm:00").toString() ;
								}
								else
									object[column] = 0
							})
							temp.push(object)
						}
						start.add('minute',1);
					}
					break;
				default:
					// console.log("default")
					dataloss.forEach((item)=>{
						let object = {};
						vm.columns.forEach((column,i)=>{
							object[column] = item[i]
						})
						temp.push(object)
					});
					break;
			}
			return temp;
		},

		GetData(start,end,t){
			var vm = this;
			let time1 = null, time2 = null;
			vm.$d3.selectAll(".mask_layer").remove();
			if( vm.zoom_level === 'day' ){
				vm.$axios.post(vm.$api + '/analysis/dim_loss',{"level":'day'}).then((data)=>{
					vm.columns = data.data.columns;
					vm.dataloss = data.data.loss;
					vm.rawData = data.data.raw;
					window.rawData = vm.rawData;
					vm.maskData = data.data.mask;
					window.maskData = vm.maskData;
					vm.temp = vm.StructAreaDate(vm.dataloss,vm.zoom_level);
					let layers = vm.stack(vm.temp)
					vm.x.domain([new Date(vm.gl_start),new Date(vm.gl_end)]);
					vm.y.domain([vm.$d3.min(layers, vm.StackMin), vm.$d3.max(layers, vm.StackMax)])
					// vm.x2.domain(vm.$d3.extent(temp, function(d) { return new Date(d.date); }))
					vm.y2.domain(vm.y.domain())
					vm.svg.selectAll(".xaxis").call(vm.xAxis);
					vm.svg.selectAll(".yaxis").call(vm.yAxis);
					vm.svg.selectAll(".yaxisr").call(vm.yAxisr);
					vm.svg.selectAll(".fxaxis").call(vm.xAxis);

					vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					vm.svg.selectAll(".layer").data(layers).attr("d",vm.area);

					if( vm.sl_label != null ){
						vm.StructLineData(vm.sl_label);
						vm.DrawLineChart();
					}
					vm.GetMaskData();
				}).catch(error => {
					console.log('something went wrong!', error.response.data)
				});
			}
			else if( vm.zoom_level === "hour"){
				time1=vm.$moment(start).add("day",-6).format("YYYY-MM-DD 00:00:00");
				time2=vm.$moment(end).add("day",6).format("YYYY-MM-DD 00:00:00");
				vm.$axios.post(vm.$api + '/analysis/dim_loss',{"level":vm.zoom_level,'filter': true,"start_date":time1,"end_date":time2}).then((data)=>{
					vm.columns = data.data.columns;
					vm.dataloss = data.data.loss;
					window.dataloss = data.data.loss;
					vm.rawData = data.data.raw;
					window.rawData = vm.rawData;
					vm.maskData = data.data.mask;
					window.maskData = vm.maskData;
					vm.temp = vm.StructAreaDate(vm.dataloss,vm.zoom_level);
					let layers = vm.stack(vm.temp)
					vm.x.domain([new Date(time1), new Date(time2)]);
					vm.y.domain([vm.$d3.min(layers, vm.StackMin), vm.$d3.max(layers, vm.StackMax)])
					vm.y2.domain(vm.y.domain())
					
					vm.svg.selectAll(".xaxis").call(vm.xAxis);
					vm.svg.selectAll(".yaxis").call(vm.yAxis);
					vm.svg.selectAll(".yaxisr").call(vm.yAxisr);

					vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					vm.svg.selectAll(".layer").data(layers).attr("d",vm.area);

					if( vm.sl_label != null ){
						vm.StructLineData(vm.sl_label);
						vm.DrawLineChart();
					}
					vm.GetMaskData();
				}).catch(error => {
					console.log('something went wrong!', error.response.data)
				});
			}
			else if( vm.zoom_level === "minute"){
				time1=vm.$moment(start).add("hour",12).format("YYYY-MM-DD 00:00:00");
				time2=vm.$moment(end).add("hour",24).format("YYYY-MM-DD 00:00:00");
				vm.$axios.post(vm.$api + '/analysis/dim_loss',{"level":vm.zoom_level,'filter': true,"start_date":time1,"end_date":time2}).then((data)=>{
					vm.columns = data.data.columns;
					vm.dataloss = data.data.loss;
					window.dataloss = data.data.loss;
					vm.rawData = data.data.raw;
					window.rawData = vm.rawData;
					vm.maskData = data.data.mask;
					window.maskData = vm.maskData;
					vm.temp = vm.StructAreaDate(vm.dataloss,vm.zoom_level);
					let layers = vm.stack(vm.temp)
					vm.x.domain(vm.$d3.extent(vm.temp, function(d) { return new Date(d.date); }));
					vm.y.domain([vm.$d3.min(layers, vm.StackMin), vm.$d3.max(layers, vm.StackMax)])
					// vm.x2.domain(vm.x.domain())
					vm.y2.domain(vm.y.domain())
					
					vm.svg.selectAll(".xaxis").call(vm.xAxis);
					// vm.svg.selectAll(".fxaxis").call(vm.xAxis);
					vm.svg.selectAll(".yaxis").call(vm.yAxis);
					vm.svg.selectAll(".yaxisr").call(vm.yAxisr);

					vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					vm.svg.selectAll(".layer").data(layers).attr("d",vm.area);

					if( vm.sl_label != null ){
						vm.StructLineData(vm.sl_label);
						vm.DrawLineChart();
					}
					vm.GetMaskData();
				}).catch(error => {
					console.log('something went wrong!', error.response.data)
				});
			}
		},

		GetMaskData(){
			var vm = this;
			let datetime_arr = [];
			let temp = {}, start = false, length = vm.maskData.length;
			// console.log(vm.maskData)
			vm.maskData.forEach((d,index)=>{
				if(d[1] && start === false){
					temp = {},datetime_arr = [];
					let time_start = vm.$moment.utc(d[0]).format("YYYY-MM-DD HH:mm:00")
					temp.start = new Date(time_start).getTime();
					start = true;
				}
				else if( start && d[1] === false ){
					let temp_end =  vm.$moment.utc(vm.maskData[index][0]).format("YYYY-MM-DD HH:mm:00")
					temp.end = new Date(temp_end).getTime();
					console.log(temp.start,temp.end)
					start = false;
					vm.mask_behavior += 1, vm.mask[vm.zoom_level]["mask_layer"+vm.mask_behavior] = temp;
					vm.temp.forEach((item)=>{
						let a = new Date(item.date).getTime();
						if( a >= temp.start && a <= temp.end ){
							datetime_arr.push(item);   
						}
					})
					vm.DrawMaskGraph( datetime_arr, "mask_layer"+vm.mask_behavior );   
				}  
			});
			if( start && vm.maskData[length-1][1] === true ){
				let temp_end =  vm.$moment.utc(vm.maskData[length-1][0]).format("YYYY-MM-DD HH:mm:00")
				temp.end = new Date(temp_end).getTime();
				start = false;
				vm.mask_behavior += 1, vm.mask[vm.zoom_level]["mask_layer"+vm.mask_behavior] = temp;
				vm.temp.forEach((item)=>{
					let a = new Date(item.date).getTime();
					if( a >= temp.start && a <= temp.end ){
						datetime_arr.push(item);   
					}
				})
				vm.DrawMaskGraph( datetime_arr, "mask_layer"+vm.mask_behavior );      
			}
		},

		zoomed(){
			let vm = this;
			let t = vm.$d3.event.transform;
			let time1 = vm.$moment(vm.x.domain()[0]);
			let time2 = vm.$moment(vm.x.domain()[1]);   
			let millisecondes = vm.$moment.duration(time2.diff(time1))._milliseconds;
			let start = time1.format("YYYY-MM-DD 00:00:00"), end = time2.format("YYYY-MM-DD 00:00:00")
			switch (vm.zoom_level) {
				case 'day':
					if( millisecondes <= 1728000000 ){
						if(millisecondes < 1296000000){
							vm.zoom_level = "hour";
							vm.legend_level.text = "zoom level: " + vm.zoom_level;
							vm.GetData(start,end,t);  
						}
						else{
							vm.x.domain(t.rescaleX(vm.x2).domain());
							vm.svg.selectAll(".layer").attr("d",vm.area);
							vm.svg.selectAll(".mask_layer").attr("d",vm.area);
							if( vm.sl_label != null ){
								vm.svg.select("#lineRaw").attr("d",vm.line);
								vm.svg.select("#lineLoss").attr("d",vm.loss_line);
							}
							vm.svg.selectAll(".xaxis").call(vm.xAxis);
							vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
						}
					}
					else{
						vm.x.domain(t.rescaleX(vm.x2).domain());
						vm.svg.selectAll(".layer").attr("d",vm.area);
						vm.svg.selectAll(".mask_layer").attr("d",vm.area);
						if( vm.sl_label != null ){
							vm.svg.select("#lineRaw").attr("d",vm.line);
							vm.svg.select("#lineLoss").attr("d",vm.loss_line);
						}
						vm.svg.selectAll(".xaxis").call(vm.xAxis);
						vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					}                   
					break;
				case 'hour':
					if( millisecondes > 1296000000 ){
						vm.zoom_level = "day"; 
						vm.legend_level.text = "zoom level: " + vm.zoom_level;
						vm.GetData(start,end,t);
					}
					//2 days
					else if( millisecondes < 172800000 ){
						// 1.5 day
						if(millisecondes < 129600000){
							vm.zoom_level = "minute";
							vm.legend_level.text = "zoom level: " + vm.zoom_level;
							vm.GetData(start,end,t);
						}
						else{
							vm.x.domain(t.rescaleX(vm.x2).domain());
							vm.svg.selectAll(".layer").attr("d",vm.area);
							vm.svg.selectAll(".mask_layer").attr("d",vm.area);
							if( vm.sl_label != null ){
								vm.svg.select("#lineRaw").attr("d",vm.line);
								vm.svg.select("#lineLoss").attr("d",vm.loss_line);    
							}
							vm.svg.selectAll(".xaxis").call(vm.xAxis);
							vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
						}
					}
					else{
						vm.x.domain(t.rescaleX(vm.x2).domain());
						vm.svg.selectAll(".layer").attr("d",vm.area);
						vm.svg.selectAll(".mask_layer").attr("d",vm.area);
						if( vm.sl_label != null ){
							vm.svg.select("#lineRaw").attr("d",vm.line);
							vm.svg.select("#lineLoss").attr("d",vm.loss_line);
						}
						vm.svg.selectAll(".xaxis").call(vm.xAxis);
						vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					}                    
					break;
				case 'minute':
					if( millisecondes > 129600000 ){
						vm.zoom_level = "hour";
						vm.legend_level.text = "zoom level: " + vm.zoom_level;
						vm.GetData(start,end,t);   
					}
					else{
						vm.x.domain(t.rescaleX(vm.x2).domain());
						vm.svg.selectAll(".layer").attr("d",vm.area);
						vm.svg.selectAll(".mask_layer").attr("d",vm.area);
						if( vm.sl_label != null ){
							vm.svg.select("#lineRaw").attr("d",vm.line);
							vm.svg.select("#lineLoss").attr("d",vm.loss_line);
						}
						vm.svg.selectAll(".xaxis").call(vm.xAxis);
						vm.svg.select(".brush").call(vm.brush.move, vm.x.range().map(t.invertX, t));
					}   
					break;
				default:
					console.log("bug")
					break;
			}
		},
	
		brushed(){
			// return
			if (this.$d3.event.sourceEvent && this.$d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
			let vm = this;
			let s = vm.$d3.event.selection || vm.x2.range();
			vm.x.domain(s.map(vm.x2.invert, vm.x2));

			if( vm.svg != null){
				vm.svg.selectAll(".layer").attr("d", vm.area);
				vm.svg.select(".xaxis").call(vm.xAxis);
				vm.svg.select(".layers").call(vm.zoom.transform, vm.$d3.zoomIdentity
					.scale(vm.width / (s[1] - s[0]))
					.translate(-s[0], 0));
			}
		},
		
		CheckedTime( datetime ){
			let vm = this;
			datetime = new Date(datetime).getTime();
			for( let item in vm.mask[vm.zoom_level] ){
				let mask_range = vm.mask[vm.zoom_level][item];
				if ( mask_range.start <= datetime && mask_range.end >= datetime ){
					mask_range.start = vm.$moment(mask_range.start).format(vm.format[vm.zoom_level]);
					mask_range.end = vm.$moment(mask_range.end).format(vm.format[vm.zoom_level]);
					vm.$axios.post(vm.$api + '/analysis/mask',{"level":vm.zoom_level,"index":[mask_range.start,mask_range.end],"mask":false})
					vm.$d3.selectAll("#"+item).remove();
					break
				}
			}
		},
	},
	created(){
		// window.vm = this;
		this.dataarr = [];
	},
	mounted(){
		this.y_offset = 0
		this.initial();
	}
}
</script>

<style scoped>
/* body {
font: 10px sans-serif;
} */

.streamgraph{
	/* margin-top: 20px;  */
	display: flex;
	flex-flow: row nowrap;
	justify-content:center;
	background-color: #fff
}

#chart { 
background: #fff;
}

p {
font: 12px helvetica;
}

.layer{
	fill:steelblue
}
</style>