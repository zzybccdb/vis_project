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
- 修正了位移错误在 Adjust pan 切换时候(完成,在 Adjust 下關閉 zoom)
- 修改 adjust mode 下 mask 方式, 以圆形半径的方式(暂时可以使用)
- 修正 hist, y 軸 ticks 數量,字體大小,每個 row 呈現圖表數(修正)
- 直接在 pcp mode 下 continue 後 button 失效(修正, continue 時直接呼叫 onPCP)
- 修改了 continue 的規則,只有在圖表全部呈現的情況下才能使用 continue(修正)

#### 2019/07/25
- 思考
    - 暂时应该取消 mask_group 的保留
    - 如何选取到之前选中的 mask_pts
    - 如果取消选中的 mask_pts

- 保留 mask_group(完成) 
- 选中先前选中的 mask_pts(完成) (左键点击)
- 取消选中的 mask_pts(完成) (右键点击)

#### 2019/07/26
- 超过数量随机选取点
- 将 VAE 和 AE 也可以使用控制点控制
- 修正了一点 UI 界面上的内容. home pcp 位置调整, histgram 加入 bottom margin

#### 2019/07/27
- 修正了 home pcp 下 filter box 由下往上繪製的錯誤
- 加入不需要暫停即可對視圖進行調整的功能

#### 2019/08/02
- 允许使用者直接在 pcp mode 下通过左键点选绘制 pcp (done)
- 当有选中控制群时, 打开 pcp 绘制这些群 (done)
- 将 histogram 调整到当前 loss chart 的位置 (done)
- loss chart 高度降低 (done)
- plot 重置错误 (done)
- calender view 位置错误 (done)
- histogram 重置错误 (done)

#### 2019/08/05
- 修正了存在 mask_mode 无法切换的问题

#### 2019/08/22
- 將 pcp 功能整合到原本dimension表單的按鈕(done)
- 調整 Home pan/activate button 位置(done)
- 調整 loss graph 位置,擴大 hist 繪製區域(done)
- calendar view 調整, 只有 pcp filter 才使用 正圓形, 其它狀態都是正方形(done)

#### 2019/08/23
- 禁止只有 filter box 模式下进行拖动(done)
- 修正 filter box 使用上的错误信息(done)
- 将 result 中的 table 还有 scatter 放入 Homeview

#### 2019/08/24
- 修改 Home 下 Promise, 防止卡死(done)
- 调整 home css style,防止遮蔽问题(done)
- 将 color scatter 中的左右键功能隔离,禁止交叉使用中
- 修正 pcp only 中的filter box filter结果

#### 2019/08/26
- 在 training 頁面載入時加載資料, 切換dataset 時更換資料

#### 2019/08/27
- 修復 PCP only 無法 filter 的問題(done)
- 在 pcp only 下, color scatter 右鍵圈選有結果呈現時,僅僅過濾繪製出來的內容.
- 修改 pcp 繪製 filter box 的按鍵方式
- 加入判斷,如果 latent scatter 存在 pcp mask pts,filter box 就從 pcp mask pts 中過濾資料
- 禁止在 pcp_only 的狀況下移動 mask_pts

#### 2019/08/28
- 禁止 Latent scatter 右鍵 draw mask box
- 修改 pcp chart 中绘制的方式,全部修改为左键绘制
- 同时将 calendar view 中的 mask box 修改为左键绘制
- calendar view 中的 mask pts tint 改为白色
- calendar view 中 mask box 左键绘制

#### 2019/09/01 
- 修正在Home view latent scatter 上选择控制点,绘制pcp,取消没有对应的情况
- 修正Datatable view底部页面数据错误的问题

#### 2019/09/23
- 修正 calendar view pcp filter box 繪製卡頓問題

#### 2019/09/25
- 禁止在 calendar view 上 mask box 区块内继续绘制
- 消除了先 mask box 后，清除再 filter box 标注，依旧可以在 calendar view 上 clear bug
- 修正 Home view 下 pcp ticks 遮蔽的问题
- 将 switch button 添加到 calendar view pcp 图中
- 允许仅仅只在 pcp filter 状态下的拖动

#### 2019/09/28
- 加入時間軸
- 修正一些會影響效率的東西

#### 2019/09/29
- 修正了 sort 模式下, highlight 繪製錯誤
- 使用者取消calendar view的mask box時,在sort模式下會繼續執行
- 系統會記錄使用這拖拽的 axis 的位置
- 修正了時間軸的刻度顯示
- 固定時間欄位

#### 2019/09/30
- 修正了 date Dimension 于过去功能兼容性的问题
- 添加了 date Dimension 固定移动的功能

#### 2019/10 倒計時
- home view 下 color scatter move highlight(done)
- 允许使用者在 pcp mode 下拖动 mask_pts(done)
- 傳統降爲方式沒有限定range（-1,1），後端修改(done)
- 修改dataloader，改为只抓取不同 level 的资料， 非原始资料（目前只抓取 day & hour）
- calender view pcp resize 後折線沒有保持自動更新(暫時done，沒有再出現bug了)
- 折線出現 filter box 無法點選的錯誤(暫時done，沒有再出現bug了)
- 在 calender view pcp 下添加軸線沒有自動調整透明度跟filter(done)
- 軸線移動時透明度變化(done)
- home view pcp 過濾時，不清除沒有選中折線的透明度(done)
- 检查传统方式下是否依旧是只训练了 level 资料，而非全部原始资料(done)


- 在 Home view 下 color scatter 可以看到傳統降維度結果(done)
- 在 Home view 下可以進行操作(done)
- home view scatter 旋转跟缩放(done)
- mask_pts 点选后， 开启 pcp 没有绘制(done)
- 在移动 mask_pts 的过程中， 颜色匹配错误(done)
- 取消 mask_pts 触发了 post，继而引发错误(done)

- 後端資料保存
- 前端從後端獲取當前位置資料

#### 2019/11
- 後端上傳 `data` 不需要自動補上 `mask` 欄位，並改成加上代表 `label` 的欄位
- 新增可以在 `calender view` 上面標 `label` 的功能

#### 2019/12
- 將所有傳統方法的確定都可以使用 `PCA` `MDS` `TSNE` `UMAP`
- 因為 `MDS` 需要跑太久，在運行它之前加入警告提醒使用者
- 確定將有異常的資料 label 的圖示定為 7x7 amd 11x11

#### 2019/12/30
- 修正如果資料剛開始就有 label 的話不會賦予顏色的問題

#### 2019/12/31
- 修正在 year 讀 level 標記資料之後進去 month 會有時間偏移的狀況，原因是後端 api 沒有限制時間範圍，也就是 response 回來的資料 data 是 2016/1/1 - 2016/12/31 但是 mask 是  2015/7/x - 2017/x/x 導致 mask 對不上
> 2019 結案

#### 2020/05/18
- 將 `web server` 的 `port` 改成 `443`，執行指令： `sudo ./node_modules/.bin/vue-cli-service serve --port <portNumber>`
- 設置 `VUE_APP_APIPORT` 為 `80`，執行指令： `export VUE_APP_APIPORT=80`
- 此外，App 在取用 `apiport` 的時候可能會取得的是 `string`，因此在 `main.js` 裡面需要把它轉換成 int 確保你設置的環境變數是有用的
- 但是不知道為什麼 app 還是會使用預設的 port ， 所以暫時先把預設的 port 變成 80