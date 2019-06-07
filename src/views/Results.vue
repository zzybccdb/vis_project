<template>
    <!-- 
    v-container -> v-layout -> v-flex
    v-container 可以被用于控制整个页面需要呈现的区域配置.如果需要可以使用 
        fluid 占据页面全部宽度 
        fill-height 占据页面全部高度
    v-layout 用于划分 v-container 范围下的区域状态.
        row/column 控制布局的横/纵分布
        wrap 控制是否换行, 默认是false
    v-layout 可以控制 v-flex的分布状况, v-container 并不能控制 row/column 的布局分布
    v-flex  是最基础的区块单位    
    -->
    <v-container ref='home' grid-list-md style="margin:0; max-width:1920px;padding:10px;overflow:hidden" fluid fill-height>
        <v-layout column>
            <v-flex lg4 style="margin:5px;background:red">
            </v-flex>          
            <v-flex lg8 class="card" style='margin:5px;'> 
                <v-layout row nowrap fill-height>
                    <v-flex lg8 style='margin:5px;overflow:hidden'>
                        <heatmap ref='heatmap'></heatmap>
                    </v-flex>
                    <v-flex lg4 style='margin:5px;overflow:hidden'>
                        <scatterplot ref='scatter'></scatterplot>
                    </v-flex>
                </v-layout>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script>
const EventBus = {}
let vm = undefined
import heatmap from '@/components/Heatmap.vue'
import scatterplot from '@/components/Scatterplot.vue'
export default{
    //需要使用到的组件
    components:{
        heatmap,
        scatterplot,
    },
    //全局监听的变量
    data:() => {
        return{
        }
    },
    //
    created(){
    },
    //所有需要呼叫的function放在这里
    methods:{
        // 初始化设定
        initial(){
            // 页面设定
            vm.pageSetting()
            vm.loadData()
        },
        // 页面设定
        pageSetting(){
            // 取消chrome自带的右键选单 
            vm.$refs.home.addEventListener("contextmenu", e => {e.preventDefault()})
            // 监听视窗变化
            window.addEventListener('resize', ()=> {
                let heatmap = vm.$refs.heatmap.$refs.hot.hotInstance
                heatmap.render()
            })
        },
        // 载入资料
        loadData(){
            vm.$axios.get(vm.$api+'/inference/get_covariance')
            .then(vm.onDataLoader)
			.catch(error => {
				window.error = error
				console.log(error)
			})
        },
        onDataLoader(response){
            let heatmap = vm.$refs.heatmap  
            let data = response.data.data
            let columns = response.data.columns
            let extent = response.data.extent
            let hotInstance = vm.$refs.heatmap.$refs.hot.hotInstance
            heatmap.changeData(data,extent)
            heatmap.setHeaders(columns)
            hotInstance.render()
        },
        // 载入 scatterplot 资料
        loadScatterplot(rowLabel, colLabel){
            let param = {
                'row':rowLabel,
                'col':colLabel
            }
            let scatter = vm.$refs.scatter
            vm.$axios.post(vm.$api+'/inference/get_scatter',param)
            .then((response)=>{
                let data = response.data.data
                // 开始绘制
                console.log("开始绘制")
                scatter.setAxisLabel(rowLabel,colLabel)
                scatter.update(data)
            })
        }
    },
    // 启动呼叫
    // 初始状态下显示最底层时间维度资料
    mounted(){  
        vm = this
        vm.EventBus = EventBus
        vm.EventBus.root = vm
        let heatmap = vm.$refs.heatmap
        heatmap.EventBus = EventBus
        vm.initial()
    },
    //离开时执行的内容
    beforeDestroy(){
        window.removeEventListener('resize', vm.handleResize)
    }
}
</script>

<style>
.ht_master .wtHolder{
    overflow-y: auto;
}
</style>