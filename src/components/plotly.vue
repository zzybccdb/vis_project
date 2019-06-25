<template>
    <!-- <v-layout ref='layout'> -->
        <v-layout id='boxplot' ref='boxplot' row align-center style="overflow:auto">
            <div v-bind:id='col' v-for = "col in columns" :key="col" style="height:300px;min-width:150px;max-width=300px" ></div>
        </v-layout>
    <!-- </v-layout> -->
</template>
<script>
// 一个颜色表的 lib

let vm = undefined

export default {
    props:['title','columns'],
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
                let layout = {
                    showlegend: false,
                    margin: {
                        l: 80,
                        r: 20,
                        b: 20,
                        t: 20,
                        pad: 0
                    },
                }
                setTimeout(()=>{
                    vm.data.forEach(data => {
                        Plotly.newPlot(data[0].name, data, layout, {displayModeBar:false,showSendToCloud: true});
                    });
                    vm.EventBus.heatmap.loading = false
                }, 1000)
                
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
    }
}
</script>