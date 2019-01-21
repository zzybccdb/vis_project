<template>
	<div id="colormap" ref="home"></div>
</template>

<script>
export default {
	components: {},
	methods: {
		buildColorTable(bg) {
			var vm = this
			let raw_colormap = vm.app.renderer.extract.pixels(bg)
			vm.colors = []
			for(let x=0;x<256;++x) {
				let color = []
				for(let y=0;y<256;++y) {
					let idx = (x + 256 * y) * 4

					let c = raw_colormap[idx] * 0x10000 +
					raw_colormap[idx+1] * 0x100 +
					raw_colormap[idx+2]

					color.push(c)
				}
				vm.colors.push(color)
			}
		},

		highLightSelectedPoint(){
			let vm = this
			// console.log(vm.eventBus.data[0].cm)
			vm.eventBus.data.forEach(d => {
				if(d.cal.selected && d.cal){
					d.cm.texture = vm.selectedTexture
					d.cm.alpha = 1.0	
				}	
			});
		},

		clearHighlight(){
			let vm = this
			vm.eventBus.data.forEach(d => {
				d.cm.texture = vm.dotTexture
				d.cm.alpha = 0.3	
			})
		},

		getColor(x, y) {
			var vm = this
			x = parseInt(x)
			y = parseInt(y)

			if (x >= 0 && y >= 0 && x < 256 && y < 256) {
				return vm.colors[x][y]
			}
			return 0xCCCCCC // default to black
		},

		rotate(rad) {
			var vm = this

			if (vm.dirty) {
				vm.ctn_points.children.forEach(d => {
					d.orgpos = [d.x, d.y]
				})
				vm.$d3.select('#colormap').call(vm.zoom.transform, vm.$d3.zoomIdentity)
				vm.dirty = false
			}
			let cos = Math.cos(rad)
			let sin = Math.sin(rad)

			vm.ctn_points.children.forEach(d => {
				let tx = d.orgpos[0] - 128, ty = d.orgpos[1] - 128
				d.x = tx * cos - ty * sin + 128
				d.y = tx * sin + ty * cos + 128
				d.rotpos = [d.x, d.y]
			})

			vm.rotate_dirty = true

			vm.__changeColor()
		},

		addPoints() {
			var vm = this

			// let mt = new vm.$PIXI.Graphics()
			let pts = []
			// add new graphics
			// mt.lineStyle(1, 0x0)
			// mt.beginFill(0xFFFFFF)
			// mt.drawCircle(0, 0, 3, 3)
			// mt.endFill()
			// let dotTexture = mt.generateCanvasTexture()

			let data = vm.eventBus.data
			let x_extent = vm.$d3.extent(data.map(d => {return parseFloat(d.raw[0])}))
			let y_extent = vm.$d3.extent(data.map(d => {return parseFloat(d.raw[1])}))
			let x_range = x_extent[1] - x_extent[0]
			let y_range = y_extent[1] - y_extent[0]
			data.forEach(d => {
				let p = new vm.$PIXI.Point(parseFloat(d.raw[0]), parseFloat(d.raw[1]))
				let sp = new vm.$PIXI.Sprite(vm.dotTexture)
				let nx = (p.x - x_extent[0]) / x_range
				let ny = (p.y - y_extent[0]) / y_range
				let x = nx * 250 + 3
				let y = ny * 250 + 3
				sp.rawpos = [x, y]
				sp.orgpos = [x, y]
				sp.npos = [nx, ny]
				sp.x = x
				sp.y = y
				pts.push([x+3, y+3])
				d.cm = sp
				sp.alpha = 0.3
				sp.oldAlpha = 0.3
				vm.ctn_points.addChild(sp)
			})
			vm.applyZoom()
		},

		drawCurve(points, tension){
			let vm = this
			tension = tension || 1;
			let ctx = new vm.$PIXI.Graphics()
			var l = points.length;
			// If we're given less than two points, there's nothing we can do
			if (l < 2) return;

			ctx.lineStyle(2, 0x000000, 0.1);
			// If we only have two points, we can only draw a straight line
			if (l == 2) {
				ctx.moveTo(points[0][0], points[0][1]);
				ctx.lineTo(points[1][0], points[1][1]);
				vm.ctn_points.addChild(ctx)
				return;
			}

			// Helper function to calculate the hypotenuse
			function h(x, y) {
				return Math.sqrt(x * x + y * y);
			}

			/* For each interior point, we need to calculate the tangent and pick
			* two points on it that'll serve as control points for curves to and
			* from the point. */
			var cpoints = [];
			points.forEach(function() {
				cpoints.push({});
			});

			for (var i = 1; i < l - 1; i++) {
				var pi = points[i],     // current point
					pp = points[i - 1], // previous point
					pn = points[i + 1]; // next point;

				/* First, we calculate the normalized tangent slope vector (dx,dy).
				* We intentionally don't work with the derivative so we don't have
				* to handle the vertical line edge cases separately. */

				var rdx = pn[0] - pp[0],  // actual delta-x between previous and next points
					rdy = pn[1] - pp[1],  // actual delta-y between previous and next points
					rd = h(rdx, rdy),     // actual distance between previous and next points
					dx = rdx / rd,        // normalized delta-x (so the total distance is 1)
					dy = rdy / rd;        // normalized delta-y (so the total distance is 1)

				/* Next we calculate distances to previous and next points, so we
				* know how far out to put the control points on the tangents (tension).
				*/

				var dp = h(pi[0] - pp[0], pi[1] - pp[1]), // distance to previous point
					dn = h(pi[0] - pn[0], pi[1] - pn[1]); // distance to next point

				/* Now we can calculate control points. Previous control point is
				* located on the tangent of the curve, with the distance between it
				* and the current point being a fraction of the distance between the
				* current point and the previous point. Analogous to next point. */

				var cpx = pi[0] - dx * dp * tension,
					cpy = pi[1] - dy * dp * tension,
					cnx = pi[0] + dx * dn * tension,
					cny = pi[1] + dy * dn * tension;

				cpoints[i] = {
					cp: [cpx, cpy], // previous control point
					cn: [cnx, cny], // next control point
			};
			}

			/* For the end points, we only need to calculate one control point.
			* Picking a point in the middle between the endpoint and the other's
			* control point seems to work well. */

			cpoints[0] = {
				cn: [ (points[0][0] + cpoints[1].cp[0]) / 2, (points[0][1] + cpoints[1].cp[1]) / 2 ],
			};
			cpoints[l - 1] = {
				cp: [ (points[l - 1][0] + cpoints[l - 2].cn[0]) / 2, (points[l - 1][1] + cpoints[l - 2].cn[1]) / 2 ],
			};
			/* Now we can draw! */

			// ctx.moveTo(points[0][0], points[0][1]);

			for (i = 1; i < l; i++) {
				ctx = new vm.$PIXI.Graphics()
				var p = points[i],
					cp = cpoints[i],
					cpp = cpoints[i - 1];
				ctx.lineStyle(1, 0x000000, 0.1);
				ctx.moveTo(points[i-1][0], points[i-1][1]);
				/* Each bezier curve uses the "next control point" of first point
				* point, and "previous control point" of second point. */
				ctx.bezierCurveTo(cpp.cn[0], cpp.cn[1], cp.cp[0], cp.cp[1], p[0], p[1]);
				vm.ctn_points.addChild(ctx)
			}

			// vm.ctn_points.addChild(ctx)
			return
		},

		resetZoom() {
			var vm = this
			vm.ctn_points.children.forEach(d => {
				d.orgpos[0] = d.rawpos[0]
				d.orgpos[1] = d.rawpos[1]
				d.x = d.rawpos[0]
				d.y = d.rawpos[1]
			})
			vm.dirty = true
			vm.rotate_dirty = false
			vm.$d3.select('#colormap').call(vm.zoom.transform, vm.$d3.zoomIdentity)
		},

		changeAlpha(alpha) {
			var vm = this;
			if (alpha >=0 && alpha < 1) {
				vm.ctn_points.children.forEach(d => {
					d.alpha = alpha
				})
			}
		},

		maskBox(){
			let vm = this
			let g = new vm.$PIXI.Graphics()
			g.lineStyle(1, 0xCCCCCC)
			g.beginFill(0xFFFFFF)
			g.moveTo(0,0)
			g.lineTo(0,15)
			g.lineTo(15,15)
			g.lineTo(15,0)
			g.lineTo(0,0)
			g.lineStyle(1, 0x000000)
			g.moveTo(15,0)
			g.lineTo(0,15)
			g.moveTo(7.5,0)
			g.lineTo(0,7.5)
			g.moveTo(7.5,15)
			g.lineTo(15,7.5)
			g.endFill()
			return g
		},

		updateData() {
			// update the data from event bus
			var vm = this
			vm.addPoints()
		},

		clearData() {
			var vm = this
			vm.ctn_points.removeChildren()
			vm.resetZoom(0)
		},

		__changeColor(errorMode=false) {
			var vm = this
			if (vm.eventBus.data) {
				vm.eventBus.data.forEach(d => {
					if (d.cm) {
						let sp = d.cm

						let color = vm.getColor(sp.x, sp.y)

						if(!sp.kernel && !sp.neibor){
							sp.tint = color
						}

						if (d.cal) {
							if(errorMode){
								d.cal.tint = color
								d.cal.alpha = d.cal.data.raw[2] + 0.1
							}
							else{
								d.cal.tint = color
								d.cal.alpha = 1
							}

							if (d.mask) {
								d.cal.tint = 0xCCCCCC
								sp.tint = 0xCCCCCC
								sp.alpha = 0
							}
						}
						if (d.pcp) {
							d.pcp.tint = color
						}
						d.color = color
					}
				})
			}
		},

		applyZoom() {
			var vm = this
			vm.dirty = true
			vm.rotation_acc = 0
			if (vm.rotate_dirty) {
				vm.ctn_points.children.forEach(d => {
						d.orgpos = [d.rotpos[0], d.rotpos[1]]
				})
				vm.rotate_dirty = false
			}
			if (vm.eventBus.data) {
				vm.eventBus.data.forEach(d => {
					if (d.cm) {
						let sp = d.cm
						let newPos = vm.currrentTransform.apply(sp.orgpos)
						sp.x = newPos[0]
						sp.y = newPos[1]
					}
				})
			}
			vm.__changeColor()
		},

		switchZoom() {
            var vm = this;
			vm.app.stage.rightdown = function(e) {
				vm.rotating = true
				vm.ang1 = Math.atan2(e.data.global.y - 128, e.data.global.x - 128)
			}

			vm.app.stage.mousemove = function(e) {
                if (e.data.global.y >= 256 || e.data.global.y < 0 ||  e.data.global.x >= 256 ||  e.data.global.x < 0 ){
                    vm.rotating = false
                    vm.rotation_acc = vm.rotation
                }
				if (vm.rotating) {
					vm.rotation = Math.atan2(e.data.global.y - 128, e.data.global.x - 128) - vm.ang1 + vm.rotation_acc
					vm.rotate(vm.rotation)
				}
			}

			vm.app.stage.rightup = function() {
				vm.rotating = false
				vm.rotation_acc = vm.rotation
			}
		},

		init() {
			var vm = this
			vm.ctn_points = new vm.$PIXI.Container()
			//new add container
			vm.ctx_curve = new vm.$PIXI.Container()
			vm.ctx_curve.name = "curve"
			let bg = new vm.$PIXI.Sprite(vm.$PIXI.loader.resources['map.png'].texture)
			vm.bg = bg
			vm.buildColorTable(bg)
			vm.selectionBoxColor = 0x0287e3

			vm.timeslot = {
				'year' : 1439,
				'month': 119,
				'day': 4,
			}

			vm.app.stage.addChild(bg)
			vm.app.stage.addChild(vm.ctn_points)
			//new add container
			vm.app.stage.addChild(vm.ctx_curve)

			vm.app.stage.interactive = true
			vm.app.stage.buttonMode = true

			vm.switchZoom()
			vm.initZoom()

			let g = new vm.$PIXI.Graphics
			g.lineStyle(1, 0x000000)
			g.beginFill(0xFF0000)
			g.drawCircle(0, 0, 3, 3)
			g.endFill()
			vm.selectedTexture = g.generateCanvasTexture()

			let mt = new vm.$PIXI.Graphics
			mt.lineStyle(1, 0x0)
			mt.beginFill(0xFFFFFF)
			mt.drawCircle(0, 0, 3, 3)
			mt.endFill()
			vm.dotTexture = mt.generateCanvasTexture()			

			vm.$emit('loaded')
		},

		initZoom() {
			var vm = this
			var zoom = vm.$d3.zoom()
				.on('zoom', zoomed)

			vm.zoom = zoom

			function zoomed() {
				vm.currrentTransform = vm.$d3.event.transform
				vm.applyZoom()
			}

			vm.$d3.select('#colormap').call(zoom)
		},

		maskSelect() {
			let vm = this
			let ctn_box = new vm.$PIXI.Container()
			ctn_box.name = 'ctn_box'
			vm.app.stage.addChild(ctn_box)

			let rightdown = function(e) {
				let p = e.data.getLocalPosition(vm.app.stage)
				let box = new vm.$PIXI.Graphics()
				box.x = p.x
				box.y = p.y
				box.start_p = p
				box.clear()
				ctn_box.addChild(box)
				ctn_box.selecting = true
				box.end_p = box.start_p
			}

			let mousemove = function(e) {
				if( ctn_box.selecting ){
					let p = e.data.getLocalPosition(vm.app.stage)
					let box = ctn_box.children[ctn_box.children.length-1]
					let p_topleft = {
						x: Math.min(p.x, box.start_p.x),
						y: Math.min(p.y, box.start_p.y),
					}
					let p_bottomright = {
						x: Math.max(p.x, box.start_p.x),
						y: Math.max(p.y, box.start_p.y),
					}
					box.clear()
					box.lineStyle(1, vm.selectionBoxColor)
					box.beginFill(vm.selectionBoxColor, 0.5)
					box.drawRect(0, 0, p_bottomright.x - p_topleft.x, p_bottomright.y - p_topleft.y)
					box.endFill()
					box.alpha = 0.5
					box.x = p_topleft.x
					box.y = p_topleft.y
					// box.start_p = p_topleft
					box.toplefg = p_topleft
					box.bottomright = p_bottomright
				}
			}

			let rightup = function() {
				let box = ctn_box.children[ctn_box.children.length-1]
				let rect = [box.toplefg.x, box.toplefg.y,box.bottomright.x,box.bottomright.y]
				vm.eventBus.data.forEach( d =>{
					if( d.cm ){
						let p = d.cm
						if (!d.mask) {
							if(d.cal && vm.collision([p.x,p.y], rect)){
								d.cal.texture = vm.eventBus.cal.cellTextureSelected
								d.cal.selected = true
							}  else {
								// d.cal.texture = d.cal.oldTexture
								// d.cal.selected = false
							}
						}
					}
				})
				ctn_box.removeChildAt(ctn_box.children.length-1)
				ctn_box.selecting = false
				vm.eventBus.cal.adjustAxisOrder()
				vm.eventBus.pcp.clearData()
				vm.eventBus.pcp.updateData()
			}

			vm.app.stage.rightdown = rightdown
			vm.app.stage.mousemove = mousemove
			vm.app.stage.rightup = rightup
		},

		clearSelect() {
			var vm = this;
			vm.eventBus.data.forEach( d =>{
				if( d.cal) {
					d.cal.texture = vm.eventBus.cal.cellTexture
					d.cal.selected = false
					d.cal.singSelected = false
					d.cal.neibor = false
				}
			})
			vm.eventBus.cal.adjustAxisOrder()
			vm.eventBus.pcp.clearData()
			vm.eventBus.pcp.updateData()
		},

		collision( point, rect ){
			if( rect[0] <= point[0] && point[0] <= rect[2] &&
				rect[1] <= point[1] && point[1] <= rect[3])
				return true
			else
				return false
		},
	},
	mounted() {
		var vm = this;
		vm.dirty = true
		vm.rotate_dirty = false
		vm.rotation = 0
		vm.rotation_acc = 0
		vm.colormapWidth = 256
		vm.colormapHeight = 256
		vm.currrentTransform = vm.$d3.zoomIdentity
		vm.$refs.home.addEventListener('contextmenu', e => {e.preventDefault()})

		vm.app = new vm.$PIXI.Application({
			width: 256,
			height:256,
			backgroundColor: 0xFFFFFF,
			antialias: true,
		})
		vm.app.view.id = "test"
		vm.app.renderer.view.style.display = 'block'
		vm.app.renderer.view.style.margin = '0 auto'
		vm.$refs.home.appendChild(vm.app.view)

		if (vm.$PIXI.utils.TextureCache['map.png'] == undefined) {
			vm.$PIXI.loader.add('map.png').load(() => {
				vm.init()
			})
		} else {
			vm.init()
		}

	},
	beforeDestroy() {
		var vm = this;
		if (vm.app) {
			vm.app.destroy()
		}
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
