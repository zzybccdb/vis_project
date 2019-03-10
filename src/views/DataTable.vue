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
            <v-flex style="height:60px">
                <v-layout style='overflow:hidden' row>
                    <v-flex lg11 fluid fill-height>
                        <v-text-field
                            label="Outline"
                            placeholder="formula"
                        ></v-text-field>
                    </v-flex>
                    <!-- fab對應的圓形按鈕 -->
                    <v-btn style="transform:translateY(15px)" fab small flat color='blue'>
                        <v-icon>check</v-icon>    
                    </v-btn>
                </v-layout> 
            </v-flex>           
            <v-flex lg11 class="card" style='overflow:auto'> 
                <handsontable ref='table'/>
                <!-- <v-layout column>
                    <v-flex style="height:50px;width:150px">
                        <v-select v-model='slot_value' :items='timeslots'>
                        </v-select>  
                    </v-flex>
                    <v-flex lg12> 
                        <handsontable ref='table'/>
                    </v-flex>
                </v-layout> -->
            </v-flex>
            <v-flex  class="card" style="height:50px;">
                <!--前後翻頁-->
                <v-layout row nowrap>
                    <v-btn fab small>
                    <v-icon @click='priviousPage()'>keyboard_arrow_left</v-icon>
                    </v-btn>
                    <v-btn fab small>
                    <v-icon @click='nextPage()'>keyboard_arrow_right</v-icon>
                    </v-btn>
                    <v-flex lg1>
                        <v-select ref='current_page' style='padding-left:50px;width:50px;height:30px' 
                        v-model='page' :items='items' @change='pageChange()'>
                        </v-select>
                    </v-flex>
                    <v-flex lg1>
                        <v-select ref='interval' style='padding-left:50px;width:200px;height:30px' 
                        v-model='interval_value' :items='interval_items' @change='intervalChange'>
                        </v-select>
                    </v-flex>                      
                    <v-card-text style='padding:20px;font-size:16px'>
                        <p ref='entries' class="text-lg-center"></p>
                    </v-card-text>
                </v-layout>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script>
const EventBus = {}
import handsontable from '@/components/handsontable.vue'
export default{
    //需要使用到的组件
    components:{
        handsontable
    },
    //全局监听的变量
    data:() => {
        return{
            page: 1,
            items: [
                { text: 1, value: 1 },
            ],
            interval_value: 1,
            interval_items:[
                {text:'1 day',value: 1},
                {text:'2 hour', value: 2},
                {text:'5 minute', value: 3}
            ]           
        }
    },
    //
    created(){
        let vm = this
        vm.timeformat = {
            '1 day':'MM/DD/YYYY',
            '2 hour':'MM/DD/YYYY/HH:00',
            '5 minute':'MM/DD/YYYY/HH:mm'
        }
        vm.date_format = 'YYYY-MM-DD HH:mm:ss'
    },
    //所有需要呼叫的function放在这里
    methods:{
        //呼叫后端,进行资料加载.载入资料后执行 this.onDataLoaded
        loadData(interval,date_range=undefined){
            let vm = this
            let param = {
                interval
            }
            if(date_range != undefined){
                param.date_range = date_range
            }
            // vm.$axios.post(vm.$api+'/inference/latent',param)
            // .then(vm.onDataLoaded)
            // .catch(error => {
            //     window.error = error
            //     console.error(error)
            // })
            vm.$axios.post(vm.$api+'/inference/rawdata',param)
            .then(vm.onDataLoaded)
            .catch(error => {
                window.error = error
                console.error(error)
            })

        },
        //资料的时间间隔变换
        intervalChange(item){
            let vm = this
            let moment = vm.$moment
            let length = vm.total_nums - 1
            let format = vm.date_format
    
            vm.EventBus.date = undefined
            vm.EventBus.currentDate_index = undefined

            let start = moment(vm.data[0][vm.date_index]).year()
            let end = moment(vm.data[length][vm.date_index]).year()

            let sd = moment.utc().year(start).dayOfYear(1).hour(0).minute(0).second(0)
            let ed = moment.utc().year(end+1).dayOfYear(1).hour(0).minute(0).second(0).add(-1, 'second')

            vm.interval = vm.interval_items.filter( d => {
                return d.value === item
            })[0].text
        
            switch(item){
                case 1:
                    vm.loadData(vm.interval)
                    break
                case 2:
                    vm.loadData(vm.interval,[sd.format(format),ed.format(format)])
                   break
                case 3:
                    vm.loadData(vm.interval,[sd.format(format),ed.format(format)])                    
                    break
                default:
                    console.error("Interval changing is error check it!")
            }
        },
        //从后端获得response后实际进行处理
        onDataLoaded(response){
            let vm = this
            let date_index = response.data.columns.indexOf('date')
            let start_data = response.data.data.slice(0,50)
            let total_nums = response.data.data.length
            let total_page =  Math.ceil(total_nums / 50)

            vm.columns = response.data.columns.slice(date_index)
            vm.total_nums = total_nums
            //把資料加入表格中
            vm.$refs.table.clearData()
            vm.$refs.table.setCols(vm.columns)
            vm.$refs.table.changeData(vm.dataSetting(start_data,date_index))
            //重整表格
            setTimeout(() => {
                vm.$refs.table.sortByindex(0,'asc')
            }, 300)
            
            vm.data = response.data.data
            vm.date_index = date_index
            vm.total_page = total_page
            // vm.current_page = 1
            window.response = response
            //底部信息設定
            vm.pageSelect(total_page)
            vm.bottomInfo([1,50],total_nums)
            //b
            if(vm.EventBus.currentDate_index != undefined){
                vm.highLightDate(vm.EventBus.currentDate_index)
            }
        },
        //对资料进行预处理,处理成表格接收的内容
        dataSetting(page_data,date_index){
            let vm = this 
            let moment = vm.$moment
            let format = vm.timeformat[vm.interval]
            let data = []
            page_data.forEach(d => {
                d = d.slice(date_index)
                d[0] = moment.utc(d[0]).format(format)
                data.push(d)
            })
            return data
        },
        //页面底部页面选择器设定
        pageSelect(total_page){
            let vm = this
            let temp =[]
            //設定select
            for(let i = 1 ; i <= total_page; i++){
                let obj = {}
                obj.value = i
                obj.text = i
                temp.push(obj)
            }
            vm.items = temp
        },
        //页面底部信息宣告
        bottomInfo(items,total_nums){
            let vm = this
            let entries = vm.$refs.entries
            entries.innerHTML = items[0] + ' - ' + items[1] + ' of ' + total_nums 
        },
        //下一页
        nextPage(){
            let vm = this
            if( vm.page + 1 <= vm.total_page){
                vm.page += 1
                vm.pageChange()
            }
        },
        //上一页
        priviousPage(){
            let vm = this
            if( vm.page - 1 > 0 ){
                vm.page -= 1
                vm.pageChange()
            }    
        },  
        //翻页
        pageChange(index=undefined){
            let vm = this
            let page = vm.page
            let end = page * 50
            let total = vm.total_nums
            let date_index = vm.date_index

            let page_data = vm.data.slice(end-50,end)
            vm.$refs.table.changeData(vm.dataSetting(page_data,date_index))

            setTimeout(() => {
                vm.$refs.table.sortByindex(0,'asc')
                if(index != undefined){
                    vm.$refs.table.highLightItem(index)
                }
            },300)

            vm.bottomInfo([end-49, end], total)
        },
        //标注特定的item
        highLightDate(index){
            let vm = this
            let remainder = index % 50
            //获取当前资料在具体哪一页
            vm.page = Math.ceil(index/50)
            vm.pageChange(remainder)
        },
    },
    //启动呼叫
    mounted(){
        let vm = this
        let cal_level = {
            'year':'1 day', 
            'month':'2 hour',
            'minute':'5 minute'
        }
        vm.interval = '1 day'
        //table本身自帶一個EventBus
        vm.$refs.table.eventbus = EventBus
        vm.EventBus = EventBus

        EventBus.table = vm.$refs.table  
        EventBus.root = vm

        if(vm.$route.params.push === 'calender'){
            EventBus.currentDate_index = vm.$route.params.index
            vm.interval = cal_level[vm.$route.params.cal_level]
        }else{
            EventBus.date = undefined
            EventBus.currentDate_index = undefined
        }
        vm.loadData(vm.interval)
        window.table = vm.$refs.table
        vm.$refs.home.addEventListener("contextmenu", e => {e.preventDefault()})
    },
    //离开时执行的内容
    beforeDestroy(){

    }
}
</script>
