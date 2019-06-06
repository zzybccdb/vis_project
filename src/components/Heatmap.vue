<template>
    <v-layout row nowrap>
        <v-flex lg11>        
            <hot-table ref="hot" :settings="settings"></hot-table>
        </v-flex>
        <v-flex style="background:steelblue;">
            <!-- 明确 canvas 的长宽,防止出现比例不一致造成的扭曲问题 -->
            <canvas ref="color_line" style="width:40px;height:300px">
                can not show canvas color line
            </canvas>
        </v-flex>
    </v-layout>
</template>
<script>
import { HotTable } from '@handsontable/vue';
const hotInstance = {}
let vm = this
export default {
    components: {
        HotTable
    },
    data: () => {
        return {
            settings: {
                data: [
                    //資料格式
                    // {
                    //     'date':'2018/03/05',
                    //     'Ford':"abad",
                    // },
                ],
                columns:[
                    //欄位設定
                    // {
                    //     data:'date',
                    //     type:'numeric',
                    // },
                ],
                colHeaders: [
                    //欄位名稱設定
                    // 'date',
                    // 'Ford',
                ],
                rowHeaders: [],
                columnSorting:true,
                // 開啓了虛擬渲染行，handsontable在渲染的時候爲了效能，只會渲染出窗口範圍內的內容。
                // 開啓後，會保留之前渲染過的內容，但是依舊無法在一開始就直接加載全部的內容
                renderAllRows: false,
                // 开启只读模式,不允许修改内容
                readOnly: true,
                // columnsSize 設定的是所有cell的寬度
                autoColumnSize: false,
                // rowSize 設定的是所有cell的高度
                autoRowSize:false,
                currentRowClassName: 'currentRow',
                stretchH: 'none',
                // 右鍵菜單設定
                contextMenu:false,
                // afterRenderer 在每一個data cell 繪製完成後都會觸發一次
                afterRenderer:(TD,row,column,prop,value) => {
                    let hot = hotInstance.root
                    let instance = hot.$refs.hot.hotInstance
                    // let c = "rgb(255,255,255)"
                    // if(vm.heat && column!==0){
                    //     if( column-1 in Object.keys(vm.color_scale)){
                    //         let scale = vm.color_scale[column-1]
                    //         c = vm.color[parseInt(scale(value))]
                    //     }
                    // }
                    // // 修改文字颜色
                    // // TD.style.color = 'blue'
                    // // 修改cell背景色
                    TD.style.backgroundColor = 'orange'
                    // instance.render()
                },
            },
            color_range:["white", "#69b3a2"]
        };
    },
    created(){
        let vm = this
        vm.extent = undefined
    },
    methods:{
        // 給定資料欄位名稱
        setHeaders(columns){
            vm.settings.colHeaders = columns
            vm.settings.rowHeaders = columns
            vm.colSetting(columns)
            console.log("setting headers")
        },
        // 改變資料
        changeData(data,extent){
            let instance = vm.$refs.hot.hotInstance
            vm.settings.data = data
            vm.extent = extent
        },
        // 清除資料
        clearData(){
            vm.settings.data = []
            vm.settings.columns = []
            vm.settings.colHeaders = []
            vm.settings.rowHeaders = []
        },
        // 将表格中所有类型都设定为浮点数
        colSetting(columns){
            columns.forEach(item => {
                let temp = {}
                temp.type = 'numeric'
                temp.numericFormat = {
                    pattern: '0.000'
                }
                vm.settings.columns.push(temp)
            })
        },
        drawColorScale(){
            let canvas = vm.$refs.color_line
            if (canvas.getContext) {
                let ctx = canvas.getContext('2d');
                ctx.strokeRect(0, 0, 40, 100);
            }
        },
    },
    mounted(){  
        vm = this
        hotInstance.root = vm
        vm.drawColorScale()
    }
}
</script>

<style src="./css/handsontable.full.css"></style>
<style scoped>
.currentRow {
  background-color: #F9F9FB !important;
}
</style>