<template>
  <hot-table ref="hot" :settings="settings"></hot-table>
</template>
<script>
import { HotTable } from '@handsontable/vue';
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
                contextMenu:true,
                stretchH: 'all',
                currentRowClassName: 'currentRow',
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
        changeData(data){
            let vm = this
            vm.settings.data = data
        },
        clearData(){
            let vm = this
            vm.settings.data.slice(0,1)
        },
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
        sortByindex(index,sortConfig){
            let vm = this
            let table = vm.$refs.hot
            table.hotInstance.getPlugin('columnSorting').sort({
                column:index,
                sortOrder:sortConfig
            })
            // table.hotInstance.selectRows(2)
        },
        highLightItem(index){
            let vm = this
            let table = vm.$refs.hot
            table.hotInstance.selectRows(index)
            console.log(index)
        }
    },
    mounted(){  
    }
}
</script>

<style src="./css/handsontable.full.css"></style>
<style scoped>
.currentRow {
  background-color: #F9F9FB !important;
}
</style>