<template>
  <hot-table ref="hot" :settings="settings"></hot-table>
</template>
<script>
import { HotTable } from '@handsontable/vue';
const hotInstance = {}
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
                columnSorting:false,
                // 開啓了虛擬渲染行，handsontable在渲染的時候爲了效能，只會渲染出窗口範圍內的內容。
                // 開啓後，會保留之前渲染過的內容，但是依舊無法在一開始就直接加載全部的內容
                renderAllRows: true,
                rowHeaders: true,
                // columnsSize 設定的是所有cell的寬度
                autoColumnSize: true,
                // rowSize 設定的是所有cell的高度
                autoRowSize:false,
                currentRowClassName: 'currentRow',
                stretchH: 'none',
                // contextMenu:true
                // 右鍵菜單設定
                contextMenu:{
                    items:{
                        'sort':{
                            // 在name 後插入<hr/>既可以在contextmenu中出現水平分割線
                            // name:'Sort DESC',
                            name:'Sort<hr/>',
                            callback:()=>{
                                let vm = hotInstance.root
                                vm.globalSort(vm.selectedCol[0])
                            }
                        },
                        'dropCol':{
                            name:'Delete selected Columns',
                            callback:() => {
                                let vm = hotInstance.root
                                vm.deleteCol(vm.selectedCol[0])
                            }
                        },
                        // 'separator': Handsontable.plugins.ContextMenu.SEPARATOR,
                    }
                },
                afterSelectionEnd:(row,col,row2,col2) => {
                    let vm = hotInstance.root  
                    vm.selectionEnd(col, col2)
                },
                // afterRenderer 在每一個data cell 繪製完成後都會觸發一次
                afterRenderer:(TD,row,column,prop,value) => {
                    let vm = hotInstance.root
                    vm.table_render_row = column
                    let c = "rgb(255,255,255)"
                    if(vm.heat && column!==0){
                        if( column-1 in Object.keys(vm.color_scale)){
                            let scale = vm.color_scale[column-1]
                            c = scale(value)
                        }
                    }
                    TD.style.backgroundColor = c
                },
            },
        };
    },
    created(){
        let vm = this
        vm.col_extent = undefined
        vm.heat = undefined
        vm.table_render_row = undefined
    },
    methods:{
        // 將cell 調整爲 heatmap
        cell_heatMap(heat){
            let vm = this
            let hot = vm.$refs.hot.hotInstance
            vm.heat = heat
            hot.render()
        },
        // 刪除特定欄位
        deleteCol(col_name){
            let vm = this
            let root = vm.eventbus.root
            let params = {
                col_name: col_name,
            }
            vm.$axios.post(vm.$api+'/dataset/drop',params).then(() => {
                root.loadData(root.interval)
            }).catch(error => {
                window.error = error
                console.error(error)
            })            
        },
        // 給定資料欄位名稱
        setCols(columns){
            let vm = this
            vm.settings.colHeaders = columns
            vm.colSetting(columns)
        },
        // 設定資料欄位的 extent
        setExtent(extent){
            let vm = this
            vm.col_extent = extent
            vm.setColorScale()
        },
        // 設定 color scale
        setColorScale(){
            let vm = this
            let d3 = vm.$d3
            vm.color_scale = []
            let length = vm.settings.colHeaders.length
            for(let i = 1; i < length; i++){
                let min = vm.col_extent[1][i-1]
                let max = vm.col_extent[0][i-1]
                let temp = d3.scaleLinear().domain([min,max]).range(['yellow','red'])     
                vm.color_scale.push(temp)           
            }
        },
        // 改變資料
        changeData(data){
            let vm = this
            vm.settings.data = data
        },
        // 清除資料
        clearData(){
            let vm = this
            vm.settings.data = []
            vm.settings.columns = []
            vm.settings.colHeaders = []
        },
        // 設定每一個維度
        colSetting(columns){
            let vm = this
            columns.forEach(item => {
                let temp = {}
                // temp.data = item
                if(item === 'date'){
                    temp.type = 'text'
                    temp.readOnly = true
                }else{
                    temp.type = 'numeric'
                    temp.numericFormat = {
                        pattern: '0.000'
                    }
                }
                vm.settings.columns.push(temp)
            })
        },
        // 對特定維度進行排序 
        sortByindex(index){
            let vm = this
            // 傳遞SQL指令進行sort
            vm.globalSort(vm.selectedCol[index])
        },
        // 全局排序 input column string
        globalSort(column){
            let vm = this
            let root = vm.eventbus.root
            if(root.sort_col !== column){
                root.sort_col = column
                root.loadData(root.interval,column)
            }
            else{
                let temp = root.reorder
                root.loadData(root.interval,column,temp)
                root.reorder = root.order
                root.order = temp
                // vm.settings.contextMenu.items.sort.name = "Sort "+root.reorder
            }
        },
        // 標註特定的item
        highLightItem(index){
            let vm = this
            let table = vm.$refs.hot
            table.hotInstance.selectRows(index)
        },
        // 左鍵選定結束後
        selectionEnd(col,col2){ 
            let vm = this
            if(col2 > col){
                vm.selectedCol = vm.settings.colHeaders.slice(col,col2+1)
            }else{
                vm.selectedCol = vm.settings.colHeaders.slice(col2,col+1)
            } 
        },
        // 執行運算指令
        excuteOpt(params){
            let vm = this
            let root = vm.eventbus.root
            vm.$axios.post(vm.$api+'/dataset/Operation',params).then(() => {
                root.loadData(root.interval)
            }).catch(error => {
                window.error = error
                console.error(error)
                root.errorMessage('Operation Error, May be Column have 0')
            })            
        }

    },
    mounted(){  
        let vm = this
        vm.selectedCol = undefined
        hotInstance.root = vm
        window.hot = vm
        // 監聽網頁size的變化，重整表格
        window.addEventListener('resize', ()=>{
            let hot = vm.$refs.hot.hotInstance
            hot.render()
        })
    }
}
</script>

<style src="./css/handsontable.full.css"></style>
<style scoped>
.currentRow {
  background-color: #F9F9FB !important;
}
</style>