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
        </v-layout>
    </v-container>
</template>

<script>
const EventBus = {}
let vm = undefined
export default{
    //需要使用到的组件
    components:{
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
        //呼叫后端,进行资料加载.载入资料后执行 this.onDataLoaded
        loadData(){
            //加载dataset
            // vm.$axios.post(vm.$api+'/inference/rawdata',param)
            // .then(vm.onDataLoaded)
            // .catch(error => {
            //     window.error = error
            //     console.error(error)
            // })

        },
    },
    // 启动呼叫
    mounted(){
    },
    //离开时执行的内容
    beforeDestroy(){

    }
}
</script>

<style>
.ht_master .wtHolder{
    overflow-y: hidden;
}
</style>