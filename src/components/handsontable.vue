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
                rowHeaders: true,
                autoColumnSize: true,
                autoRowSize:true,
                currentRowClassName: 'currentRow',
                stretchH: 'all',
                // contextMenu:true
                // 右鍵菜單設定
                contextMenu:{
                    items:{
                        'sort':{
                            name:'Sort DESC',
                            callback:()=>{
                                let vm = hotInstance.root
                                vm.globalSort(vm.selectedCol[0])
                            }
                        },
                        'insertNewColAdd':{
                            name:"Add a new Column by selected Columns (addition)",
                            callback:() => {
                                let vm = hotInstance.root
                                let params = {
                                    columns:vm.selectedCol,
                                    op:'add'
                                }
                                vm.excuteOpt(params)
                            }       
                        },
                        'insertNewColSub':{
                            name:"Add a new Column by selected Columns (Subtraction)",
                            callback:() => {
                                let vm = hotInstance.root
                                let params = {
                                    columns:vm.selectedCol,
                                    op:'sub'
                                }
                                vm.excuteOpt(params)
                            }                       
                        },
                        'insertNewColMul':{
                            name:"Add a new Column by selected Columns (multiplication)",
                            callback:() => {
                                let vm = hotInstance.root
                                let params = {
                                    columns:vm.selectedCol,
                                    op:'mult'
                                }
                                vm.excuteOpt(params)        
                            }                         
                        },
                        'insertNewColDiv':{
                            name:"Add a new Column by selected Columns (Division)<hr/>",
                              callback:() => {
                                let vm = hotInstance.root
                                let params = {
                                    columns:vm.selectedCol,
                                    op:'div'
                                }
                                vm.excuteOpt(params)
                            }       
                        },
                        'dropCol':{
                            name:'Drop selected Columns',
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
            },
        };
    },
    created(){
    },
    methods:{
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
        //改變資料
        changeData(data){
            let vm = this
            vm.settings.data = data
        },
        //清除資料
        clearData(){
            let vm = this
            vm.settings.data = []
            vm.settings.columns = []
            vm.settings.colHeaders = []
        },
        //設定每一個維度
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
        //對特定維度進行排序
        sortByindex(index,sortConfig){
            let vm = this
            let table = vm.$refs.hot
            table.hotInstance.getPlugin('columnSorting').sort({
                column:index,
                sortOrder:sortConfig
            })
        },
        //全局排序
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
                vm.settings.contextMenu.items.sort.name = "Sort "+root.reorder
            }
            // root.pageChange(root.page)
        },
        //標註特定的item
        highLightItem(index){
            let vm = this
            let table = vm.$refs.hot
            table.hotInstance.selectRows(index)
        },
        //左鍵選定結束後
        selectionEnd(col,col2){ 
            let vm = this
            if(col2 > col){
                vm.selectedCol = vm.settings.colHeaders.slice(col,col2+1)
            }else{
                vm.selectedCol = vm.settings.colHeaders.slice(col2,col+1)
            }
            if(vm.selectedCol.length === 1){
                // vm.globalSort(vm.selectedCol[0])
            }
        },
        //執行運算指令
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
    }
}
</script>

<style src="./css/handsontable.full.css"></style>
<style scoped>
.currentRow {
  background-color: #F9F9FB !important;
}
</style>