<template>
    <v-layout ref='layout'>
        <canvas ref='canvas'></canvas>
    </v-layout>
</template>
<script>
// 由 chart.js 繪製的 scatter plot, 是 result 頁面中的一個組件
import Chart from 'chart.js'
let vm = undefined
let canvas = undefined
export default {
    components: {
    },
    data: () => {
        return {
        };
    },
    created(){
    },
    methods:{
        ScatterPlotUInit(){
            vm.scatterChart = new Chart(canvas, {
                type: 'scatter',
                data: {
                    datasets: [{
                        data: [{
                            x: 0,
                            y: 0
                        },]
                    }]
                },
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        xAxes: [{
                            // 设定轴线标签名
                            scaleLabel: {
                                display: true,
                                labelString: 'x'
                            },
                            type: 'linear',
                            position: 'bottom'
                        }],
                        yAxes: [{
                            // 设定轴线标签名
                            scaleLabel: {
                                display: true,
                                labelString: 'y'
                            },
                            type: 'linear',
                            position: 'bottom'
                        }],
                    }
                }
            }) 
            // vm.scatterChart.update()  
        },
        setAxisLabel(xLabel,yLabel){
            vm.scatterChart.options.scales.xAxes[0].scaleLabel.labelString = xLabel
            vm.scatterChart.options.scales.yAxes[0].scaleLabel.labelString = yLabel
            // vm.scatterChart.update() 
        },
        update(data=[{x:1,y:1}]){
            vm.scatterChart.data.datasets[0].data = data
            vm.scatterChart.update()
            console.log("ok")
        }
    },
    mounted(){  
        vm = this
        canvas = vm.$refs.canvas
        let layout = vm.$refs.layout
        canvas.width = parseFloat(layout.clientWidth)
        canvas.height = parseFloat(layout.clientWidth)
        vm.ScatterPlotUInit()
    }
}
</script>