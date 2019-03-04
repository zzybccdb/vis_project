<template>
  <hot-table ref="hot" :settings="settings"></hot-table>
</template>
<script>
import { HotTable } from '@handsontable/vue';
const EventBus = {}
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
                columnSorting: true,
                rowHeaders: true,
                autoColumnSize: true,
                autoRowSize:true,
                stretchH: 'all',
                currentRowClassName: 'currentRow',
                // contextMenu:true
                contextMenu:{
                    items:{
                        'insertNewColAdd':{
                            name:"Add a new Column by selected Columns (addition)",
                            callback:() => {
                                let vm = EventBus.root
                                let params = {
                                    columns:vm.selectedCol
                                }
                                vm.$router.push({
                                    name:'DataTable',
                                    params:{
                                        push:'fresh',
                                        interval:vm.interval                                        
                                    }
                                })
                            }
                        },
                        'insertNewColSub':{
                            name:"Add a new Column by selected Columns (Subtraction)",
                            callback:() => {
                                let vm = EventBus.root
                                vm.$router.push({
                                    name:'DataTable',
                                    params:{
                                        push:'fresh',
                                        interval:vm.interval                                        
                                    }
                                })
                            }                        
                        },
                        'insertNewColMul':{
                            name:"Add a new Column by selected Columns (multiplication)",
                            callback:() => {
                                let vm = EventBus.root
                                vm.$router.push({
                                    name:'DataTable',
                                    params:{
                                        push:'fresh',
                                        interval:vm.interval                                        
                                    }
                                })
                            }                        
                        },
                        'insertNewColDiv':{
                            name:"Add a new Column by selected Columns (Division)",
                            callback:() => {
                                let vm = EventBus.root
                                vm.$router.push({
                                    name:'DataTable',
                                    params:{
                                        push:'fresh',
                                        interval:vm.interval                                        
                                    }
                                })
                            }
                        },
                        // 'separator': EventBus.root.$refs.hot.hotInstance.getPlugin('ContextMenu').SEPARATOR,
                        'delCol':{
                            name:'Delete selected Columns',
                            callback:() => {
                                let vm = EventBus.root
                                vm.$router.push({
                                    name:'DataTable',
                                    params:{
                                        push:'fresh',
                                        interval:vm.interval                                        
                                    }
                                })
                            }
                        },
                        // 'separator': Handsontable.plugins.ContextMenu.SEPARATOR,
                    }
                },
                afterSelectionEnd:(row,col,row2,col2,selectionLayerLevel) => {
                    let vm = EventBus.root  
                    vm.selectionEnd(col, col2)
                }
            },
        };
    },
    created(){
    },
    methods:{
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
            vm.settings.data.slice(0,1)
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
            // table.hotInstance.selectRows(2)
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
            vm.selectedCol = vm.settings.colHeaders.slice(col,col2+1)
        }   
},
    mounted(){  
        let vm = this
        vm.selectedCol = undefined
        EventBus.root = vm
        vm.EventBus = EventBus
        // console.log(vm.$refs.hot.hotInstance.getPlugin('ContextMenu'))
    }
}
</script>

<style src="./css/handsontable.full.css"></style>
<style scoped>
.currentRow {
  background-color: #F9F9FB !important;
}
</style>