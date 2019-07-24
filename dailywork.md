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

#### 2019/07/16
- 使用者群选需要控保持的 group
- 计算该 group 的群中心点
- 传入 backend,然 backend 维持其相对位置
 
#### 2019/07/18
- calendar view 存在 bug mask 後, pcp filter 狀態錯誤 (未修正)
- 調整 latent scatter 相關操作的 ui 和部分操作邏輯
- 繪製圖像時不再重複宣告 scale domain
- 使用 histogram 當做 Dimension 選擇機制

#### 2019/07/19
- 允許使用者刪除選中的目標點

#### 2019/07/20
- 存在初次使用沒有顯示出 histogram 的狀況下，刪除Dimension錯誤(已修正)
- 調整 control point 的過程中，如果使用者在設定後，不提交commit， 調整回 zoom 模式的情況，怎麼解決?（默認使用者已經確定當前佈局）
- dimension histogram 按鈕第一次無反應？
- 控制點在 zoom 模式下的旋轉縮放處理(未處理)

#### 2019/07/22
- 在 home 的目錄下加入了 PCP（完成繪製）
- 將 data 和 color scatter 以及 pcp 進行綁定（完成）

#### 2019/07/23
- 在 home 目錄下 pcp 中 加入 filter 功能(完成)
- 切換到 pcp 模式後， 控制點mousemove出現錯誤(修正)
- 关闭 rotating 的行为(完成)
- 将 confirm 向后端提交资料,修改为 continue 下呼叫(完成)
- 取消控制中心时,清除 pt 的 tint 没有修正

#### 2019/07/24
- pcp filter 多轴线过滤还有错误(已修正)
- 修正了位移错误在 Adjust pan 切换时候
- 修改 adjust mode 下 mask 方式, 以圆形半径的方式