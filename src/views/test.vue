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
    <v-container ref='home' style="margin:0; max-width:1920px;padding-top:0px" fluid fill-height>
        <v-layout column>
            <v-flex class="card" fluid>
                <PCP ref='pcp'></PCP>
            </v-flex>
            <v-flex xs12 style="background:white" class="card" fluid>
                <StackedAreaChart ref='sac'></StackedAreaChart>
            </v-flex>
            <!-- <v-flex xs4 style="background:blue" fluid>
            </v-flex> -->
        </v-layout>
    </v-container>
</template>

<script>
import PCP from '@/components/PCP.vue'
import StackedAreaChart from '@/components/StackedAreaChart.vue'
const EventBus = {}
export default{
    //需要使用到的组件
    components:{
        PCP,
        StackedAreaChart
    },
    //全局监听的变量
    data:() => {
        return{}
    },
    //
    created(){
    },
    //所有需要呼叫的function放在这里
    methods:{
        init(){
            let vm = this
            // vm.$ref.sac.drawGraph()
            vm.timeFormat = {
                "year":"YYYY-MM-DD 00:00:00",
                "month":"YYYY-MM-DD HH:00:00",
                "day":"YYYY-MM-DD HH:mm:00",
            }

            vm.timeSlot = {
                "year":[1,"day"],
                "month":[30,"hour"],
                "day":[7,"minute"]
            }
        },

        loadData(){
            let vm = this
            let timeRange = vm.getTimeRange()
            let param = {
                level:vm.timeSlot[vm.eventBus.calLevel][1],
                date_range:timeRange
            }
            console.log(param)
			vm.$axios.post(vm.$api + '/inference/loss', param)
			.then(vm.onDataLoaded)
			.catch(error => {
				window.error = error
				console.error(error)
			})
        },

        getTimeRange(){
            let vm = this
            let temp = vm.selectedDate 
            let level = vm.eventBus.calLevel
            let slot = vm.timeSlot[level][0]
            let format = vm.timeFormat[level]
            let time1 = temp.add(-slot,level).format(format)
            let time2 = temp.add(slot*2,level).format(format)
            let range = [time1,time2]
            return range
        },

        onDataLoaded(responese){
            console.log(responese)
        },
    },
    //启动呼叫
    mounted(){
        let vm = this   

        let moment = vm.$moment
        //取消鼠標右鍵的菜單選項
        vm.$refs.home.oncontextmenu = () => {return false}
        //资料传递
        vm.eventBus = EventBus
        EventBus.root = vm
        EventBus.pcp = vm.$refs.pcp
        EventBus.sac = vm.$refs.sac
        //把资料绑定到组件上
        vm.$refs.pcp.eventBus = EventBus
        vm.$refs.sac.eventBus = EventBus
        //从呼叫端口获取传递的资料
        vm.selectedDate = moment(vm.$route.params.date)
        vm.eventBus.calLevel = vm.$route.params.calLevel

        vm.init()
        vm.loadData()
    },
    //离开时执行的内容
    beforeDestroy(){

    }
}
</script>

<style scoped>
.card{
    border:1px solid #ccc;
    box-shadow:none;
    margin:10px;
}
</style>