####　宣告參數說明
###### 貼圖參數說明
- vm.cellTexture : 基礎正方形 cell 貼圖
- vm.cellMaskTexture : 基礎 mask cell 貼圖
- vm.cellFilterTexture : pcp 選中時的圓形貼圖
- vm.cellTextureSelected : 右鍵圈選的特殊貼圖（左上角有小三角）
###### 畫布內容說明
- vm.app : canvas 封裝物件
- vm.app.stage : 繪製主體容器
- vm.wrapper : calendar view 最外層封裝
- vm.ctn_tooltip :　提示內容容器
- vm.mappint : 保存每一個 cell 的物件
- vm.ctn_box : 保存使用者選擇的 selection box
- vm.highLightBlock : 使用這控制，令highlight pcp 固定
###### PIXI内容物宣告
- pixi_font:字形设定
- pixi_font_size:字形大小
###### cell 物件內容說明
- sp.selected : 是 keyboad + 右鍵所選中的點