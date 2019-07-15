## 日常更新記錄

#### 2019/04/30
- 加入 raw data 的資料瀏覽選項（預設選項）
- 加入公式執行錯誤的錯誤提示
- 加入 enter 直接執行 公式的功能
- 選單中也能直接直接兩個欄位的基本四則運算
- 將sort修改爲全局sort,右键菜单呼出

#### 2019/05/06
- 加入選擇按鈕，讓data可以用heat map的方式呈現

#### 2019/05/09
- 绘制 color line，即给定插值的颜色

#### 2019/05/18
- 加入 model 的选择项，直接提取保留在后端 weight 下的model，或者直接使用现成的模型 =》 mds，tsne，pca

#### 2019/06/19
- 加入新的功能，允許使用者在 pcp 上直接 filter 資料

#### 2019/06/20
- 修正了 correlation matrix 回傳 NAN 的問題
- 修正了 ticks 數量分佈不均的問題
- 允許使用者可以繪製對角線的 scatter plot
- 將 pcp 軸線間距加倍
- 將 plotly box plot 調整爲每個維度單獨繪製

#### 2019/06/21
- 將 AE VAE loss line chart 均修正爲只有 reconstruction loss
- 只有 nn based mds 下存在 distance loss, 並且會計算 global distance matrix

#### 2019/06/22
- 將主界面的 loss line chart 先隱藏起來,選定 model 後在決定需要繪製哪些loss

#### 2019/06/24 
- 修正在 highlight pcp 後,移開沒有取消 highlight 效果的問題
- 修正了 filterline 卡頓的問題

#### 2019/06/25
- 提高 plotly box plot 間距
- 更換 Data sheet icon
- PIXI 實作 box plot

#### 2019/07/08
- 完成所有维度的 histogram 的绘制

####　2019/07/09
- 实作 training 过程中 scatter plot 绘制

#### 2019/07/11
- 修正 histogram x 軸顯示錯誤的問題
- 在 training 開始後， histogram 消失

#### 2019/07/12
- histogram bins 數量固定爲10 
- 允許使用者利用 histogram 進行 training 維度的選擇調整
- 給 histogram 加入 loading 
- 給 color scatter plot 加入 zoom 功能

#### 2019/07/13
- 修正 Home.vue 的一些邏輯問題
- 給 color scatter plot 加入 rotate

#### 2019/07/14
- 加入選擇框
- 允許使用者選擇並拖動選中目標