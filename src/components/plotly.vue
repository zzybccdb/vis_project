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
                console.log(vm.data)
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

        // var y0=[],y1=[]
        // for (let i = 0; i < 50; i ++) 
        // {
        //     y0[i] = Math.random();
        //     y1[i] = Math.random();
        // }

        // var trace1 = {
        //     y: y0,
        //     type: 'box'
        // };

        // var trace2 = {
        //     y: y1,
        //     type: 'box'
        // };

        // var data = [trace1, trace2];

        
    }
}
</script>