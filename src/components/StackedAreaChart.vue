<template>
    <div class="streamGraph-wrapper" ref="home">
    </div>
</template>

<script>
export default{
    //需要使用到的组件
    components:{
    },
    //全局监听的变量
    data:()=>{
        return{
        }
    },
    //
    created(){
    },
    //所有需要呼叫的function放在这里
    methods:{
        init(){},
        d3Init(){},
    },
    //启动呼叫
    mounted(){
        let vm = this 

    }, 
    //离开时执行的内容
    beforeDestroy(){
        let vm = this
		if (vm.appLegend && vm.appInfo) {
            vm.appLegend.destroy()
            vm.appInfo.destroy()
		}
    }
}
</script>