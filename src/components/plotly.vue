<template>
    <!-- <v-layout ref='layout'> -->
        <div id="myDiv" style="height:300px" ref='boxplot'></div>
    <!-- </v-layout> -->
</template>
<script>
// 一个颜色表的 lib

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
            vm.$axios.get(vm.$api+'/inference/box_plot_plotly')
            .then((response)=>{
                vm.data = response.data.data
                Plotly.newPlot('myDiv', vm.data, {}, {showSendToCloud: true});
            })
			.catch(error => {
				window.error = error
				console.log(error)
			})
        },
    },
    mounted(){  
        vm = this
        PIXI = vm.$PIXI
        vm.boxplot = vm.$refs.boxplot
        
        vm.load()
        window.addEventListener('resize',()=>{
            Plotly.relayout('myDiv', {
                'width':vm.$refs.boxplot.clientWidth,
                'height':vm.$refs.boxplot.clientHeight
            });
        })        
    }
}
</script>