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
                <PCP ref='pcp' @loaded='onPCPLoaded'></PCP>
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
const EventBus = {}
export default{
    //需要使用到的组件
    components:{
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
    },
    //启动呼叫
    mounted(){
        let vm = this   
    },
    //离开时执行的内容
    beforeDestroy(){

    }
}
</script>