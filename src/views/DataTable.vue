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
            <v-flex style="height:60px;margin:10px">
                <!--錯誤提示符號-->
                <v-layout>
                    <v-flex>
                        <v-alert
                            v-model="alert"
                            dismissible
                            type="error"
                        >
                        {{errorMessage}}
                        </v-alert>
                    </v-flex>
                </v-layout>
                <v-layout style='overflow:hidden' row>
                    <v-flex lg8 fluid fill-height>
                        <!-- 利用 v-on:key-up.enter 執行enter後的事件 -->
                        <v-text-field
                            v-model="formula"
                            label="Outline"
                            placeholder="newcol = col1 + col2"
                            v-on:keyup.enter="checkFormula"
                        ></v-text-field>
                    </v-flex>
                    <!-- fab對應的圓形按鈕 -->
                    <v-btn style="transform:translateY(15px)" fab small flat color='blue'>
                        <v-icon @click="checkFormula()">check</v-icon>    
                    </v-btn>
                    <v-btn style="transform:translateY(15px)" fab small flat color='blue'>
                        <v-icon v-model='heat_map' @click="heatMap()">info</v-icon>    
                    </v-btn>
                    <!-- 色碼条 -->
                    <v-flex>
                        <canvas ref='color_line' width=256px height=40px style="transform:translateY(16px);display:none"></canvas>
                    </v-flex>
                </v-layout> 
            </v-flex>           
            <v-flex ref="box" lg11 class="card" style='overflow:hidden'> 
                <!-- <div style='overflow:hidden;height:100%'> -->
                <handsontable ref='table'/>
                <!-- </div> -->
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
import handsontable from '@/components/Handsontable.vue'
export default{
    //需要使用到的组件
    components:{
        handsontable
    },
    //全局监听的变量
    data:() => {
        return{
            formula:undefined,
            // page跟v-model有双向绑定，所以变动page，自动执行换页行为
            page: 1,
            items: [
                { text: 1, value: 1 },
            ],
            interval_value: 0,
            interval_items:[
                {text:'Raw Data',value: 0},
                {text:'1 day',value: 1},
                {text:'2 hour', value: 2},
                {text:'5 minute', value: 3}
            ],
            alert:false,
            heat_map:false,
        }
    },
    //
    created(){
        let vm = this
        vm.timeformat = {
            'Raw Data':'MM/DD/YYYY/HH:mm',
            '1 day':'MM/DD/YYYY',
            '2 hour':'MM/DD/YYYY/HH:00',
            '5 minute':'MM/DD/YYYY/HH:mm',
        }
        vm.date_format = 'YYYY-MM-DD HH:mm:ss'
        vm.errorMessage = 'Operation Error, May be Column have 0'
        // 宣告當前排序的維度
        vm.sort_col = 'date'
        vm.order = 'ASC'
        vm.reorder = 'DESC'
        vm.change_interval = false
        vm.color_stack = []
        vm.per_page_rows = 0
    },
    //所有需要呼叫的function放在这里
    methods:{
        test(){
            let vm = this
            console.log(vm.fake)
        },
        // 绘制色碼条
        colorLine(){
            let vm = this
            let ctx = vm.$refs.color_line.getContext('2d')
            let gradient = ctx.createLinearGradient(28,10,150,30)
            // rgb(132,174,209)
            gradient.addColorStop(0,'rgba(132,174,209,1)')
            // rgba(147,210,197,1)
            gradient.addColorStop(0.33,'rgba(147,210,197,1)')
            // rgb(255,255,177)
            gradient.addColorStop(0.66,'moccasin') 
            // rgb(243,127,115)
            gradient.addColorStop(1,'salmon') 
            ctx.fillStyle = gradient
            ctx.fillRect(28,10,150,20)

            ctx.font = "12px serif"
            ctx.fillText("Min", 0,25)
            ctx.fillText("Max", 187,25)
            // getImageData(x,y,width,height) => return rgba
            let data = ctx.getImageData(28,10,150,30).data
            for(let col=0; col<150; col++){
                let r = data[((150 * 10) + col) * 4];
                let g = data[((150 * 10) + col) * 4+1];
                let b = data[((150 * 10) + col) * 4+2];
                vm.color_stack.push("rgba("+r+","+g+","+b+",0.7)")                
            }
        },
        // 呼叫heat map执行
        heatMap(){
            let vm = this
            let table = vm.$refs.table
            let ctx = vm.$refs.color_line
            table.cell_heatMap(!vm.heat_map)
            vm.heat_map = !vm.heat_map
            if(vm.heat_map)
                ctx.style.display = 'inline'
            else
                ctx.style.display = 'none'
        },
        //呼叫后端,进行资料加载.载入资料后执行 this.onDataLoaded
        loadData(interval,sort='date',order='ASC',date_range=undefined){
            let vm = this
            let param = {
                interval,
            }
            param.sort = sort
            param.order = order
            if(date_range != undefined){
                param.date_range = date_range
            }
            //加载dataset
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

            vm.change_interval = true
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
                case 0:
                    vm.loadData(vm.interval)
                    break;
                case 1:
                    vm.loadData(vm.interval)
                    break
                case 2:
                    vm.loadData(vm.interval,vm.sort_col,vm.order,[sd.format(format),ed.format(format)])
                   break
                case 3:
                    vm.loadData(vm.interval,vm.sort_col,vm.order,[sd.format(format),ed.format(format)])                    
                    break
                default:
                    console.error("Interval changing is error check it!")
            }
        },
        //从后端获得response后实际进行处理
        onDataLoaded(response){
            let vm = this
            let date_index = response.data.columns.indexOf('date')
            let total_nums = response.data.data.length
            let total_page =  Math.ceil(total_nums / vm.per_page_rows)
            let extent = response.data.extent
            vm.columns = response.data.columns.slice(date_index)
            vm.total_nums = total_nums
            //把資料加入表格中
            vm.$refs.table.clearData()
            vm.$refs.table.setCols(vm.columns)
            vm.$refs.table.setExtent(extent,vm.color_stack)
            
            vm.data = response.data.data
            vm.date_index = date_index
            vm.total_page = total_page
            // vm.current_page = 1
            //底部信息設定
            vm.pageSelect(total_page)
            vm.bottomInfo([1,vm.per_page_rows],total_nums)
            if(vm.EventBus.currentDate_index != undefined){
                vm.highLightDate(vm.EventBus.currentDate_index)
            }
            // 每次修改page 這樣就會呼叫到同時綁定的pageChange（）
            if(vm.change_interval){
                vm.change_interval = false
                // 这里需要注意，vm.page 触发 pageChange 当且仅当page发生改变的时候
                // 这个改变是 == 的，所以需要是实质的改变。
                if(vm.page === 1){  
                    vm.pageChange()
                }
                vm.page = 1
            }
            else{
                vm.pageChange()
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
            }
        },
        //上一页
        priviousPage(){
            let vm = this
            if( vm.page - 1 > 0 ){
                vm.page -= 1
            }    
        },  
        //翻页 該 function 跟 page是雙向綁定
        pageChange(){
            let vm = this
            let page = vm.page
            let end = page * vm.per_page_rows
            let total = vm.total_nums
            // 记录日期这个 column 的index
            let date_index = vm.date_index

            let page_data = vm.data.slice(end-vm.per_page_rows,end)
            vm.$refs.table.changeData(vm.dataSetting(page_data,date_index))
            // 底部信息
            vm.bottomInfo([end-vm.per_page_rows+1, end], total)
        },
        //标注特定的item
        highLightDate(index){
            let vm = this
            // let remainder = index % 50
            // let remainder = index % 33
            //获取当前资料在具体哪一页
            // vm.page = Math.ceil(index/50)
            vm.page = Math.ceil(index/vm.per_page_rows)
        },
        //公式处理
        checkFormula(){
            let vm = this
            let hot_table = vm.$refs.table
            let regex = /([+,\-,,*,/,(,),=])/
            let content = vm.formula.split(regex).filter(t=>{return t!=''})
            //这里使用 split 分割公式，这里注意一点，（）内表示的是需要利用它切割，但是需要保留下来。
            //- 和 / 都是特殊字元，需要加 \，同时这里没有考虑到加入（ 或 ）后有空格的情况，所以用 filter 过滤
            let newcol = content[0]
            let params = {
                'newcol':newcol,
                'formula':vm.formula,
            }
            //直接處理公式，並且生成新的資料欄位
            vm.$axios.post(vm.$api+'/dataset/NewColByFormat',params).then(() => {
                vm.loadData(vm.interval)
            }).catch(error => {
                hot_table.deleteCol(newcol)
                vm.errorMessage('Operation Error, May be Column have 0')
                console.log(error)
            })            
        },
        //錯誤提示
        errorMessage(err){
            let vm = this
            window.error = err
            vm.alert = true
            setTimeout(() => {
                vm.alert = false
            }, 2000);
        }
    },
    // 启动呼叫
    // 初始状态下显示最底层时间维度资料
    mounted(){
        let vm = this
        let table = vm.$refs.table
        // 包装 table 的容器
        let box = vm.$refs.box
        let cal_level = {
            'Raw Data':'Raw Data',
            'year':'1 day', 
            'month':'2 hour',
            'minute':'5 minute'
        }
        vm.interval = 'Raw Data'
        //table本身自帶一個EventBus
        table.eventbus = EventBus
        vm.EventBus = EventBus

        EventBus.table = table  
        EventBus.root = vm

        window.vm = vm 
        window.table = table
        window.box = box

        let box_height = box.clientHeight
        vm.per_page_rows = parseInt((box_height-25-24)/23 + 1)

        if(vm.$route.params.push === 'calender'){
            EventBus.currentDate_index = vm.$route.params.index
            vm.interval = cal_level[vm.$route.params.cal_level]
        }else{
            EventBus.date = undefined
            EventBus.currentDate_index = undefined
        }

        vm.colorLine()
        vm.loadData(vm.interval)
        
        // 取消chrome自带的右键选单 
        vm.$refs.home.addEventListener("contextmenu", e => {e.preventDefault()})
        // 監聽網頁size的變化，重整表格
        window.addEventListener('resize', ()=>{
            let hot = vm.$refs.table.$refs.hot.hotInstance
            box_height = box.clientHeight
            vm.per_page_rows = parseInt((box_height-25-24)/23 + 1)

            vm.pageChange()
            hot.render()
        })
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