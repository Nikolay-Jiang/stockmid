/******************************************************************************
 *                          Fetch and display users
 ******************************************************************************/

 displayStocks();


 function displayStocks() {
     Http.Get('/api/observers/all')
         .then(response => response.json())
         .then((response) => {
             var allObservers = response.observers;
             // Empty the anchor
             var allObserversAnchor = document.getElementById('all-stocks-anchor');
             allObserversAnchor.innerHTML = '';
             // Append users to anchor
             allObservers.forEach((observer) => {
                 allObserversAnchor.innerHTML += getUserDisplayEle(observer);
             });
         });
 };
 
 
 function getUserDisplayEle(stock) {
     return `<div class="user-display-ele">
 
         <div class="normal-view">
             <div>编号: ${stock.StockCode}</div>
             <div>涨跌幅: ${stock.Rate}</div>
             <div>涨跌价格: ${stock.RatePrice}</div>
             <div>交易量: ${stock.TradeVol}</div>
             
             <button class="edit-stock-btn" data-stock-id="${stock.StockCode}">
                 编辑
             </button>
             <button class="delete-stock-btn" data-stock-id="${stock.StockCode}">
                 删除
             </button>
         </div>
         
         <div class="edit-view">
             <div>
                 股票名称: <input class="name-edit-input" value="${stock.StockCode}">
                 涨幅%: <input class="name-edit-input" value="${stock.Rate}">
                 涨跌价格: <input class="name-edit-input" value="${stock.RatePrice}">
                 交易量: <input class="name-edit-input" value="${stock.TradeVol}">
             </div>
             <div>
                 
             </div>
             <button class="submit-edit-btn" data-stock-id="${stock.StockCode}">
                 提交
             </button>
             <button class="cancel-edit-btn" data-stock-id="${stock.StockCode}">
                 取消
             </button>
         </div>
     </div>`;
 }
 
 
 /******************************************************************************
  *                        Add, Edit, and Delete Users
  ******************************************************************************/
 
 document.addEventListener('click', function (event) {
     event.preventDefault();
     var ele = event.target;
     if (ele.matches('#add-stock-btn')) {
         addStock();
     } else if (ele.matches('.edit-stock-btn')) {
         showEditView(ele.parentNode.parentNode);
     } else if (ele.matches('.cancel-edit-btn')) {
         cancelEdit(ele.parentNode.parentNode);
     } else if (ele.matches('.submit-edit-btn')) {
         submitEdit(ele);
     } else if (ele.matches('.delete-stock-btn')) {
         deleteObserver(ele);
     }
 }, false)
 
 
 function addStock() {
     var nameInput = document.getElementById('stockName-input');
     var rateInput = document.getElementById('rate-input');
     var ratepriceInput = document.getElementById('rateprice-input');
     var tradevolInput = document.getElementById('tradevol-input');
     var data = {
         observer: {
             StockCode: nameInput.value,
             Rate: rateInput.value,
             RatePrice: ratepriceInput.value,
             TradeVol: tradevolInput.value,
         },
     };
     Http.Post('/api/observers/add', data)
         .then(() => {
             displayStocks();
         })
 }
 
 
 function showEditView(userEle) {
     var normalView = userEle.getElementsByClassName('normal-view')[0];
     var editView = userEle.getElementsByClassName('edit-view')[0];
     normalView.style.display = 'none';
     editView.style.display = 'block';
 }
 
 
 function cancelEdit(userEle) {
     var normalView = userEle.getElementsByClassName('normal-view')[0];
     var editView = userEle.getElementsByClassName('edit-view')[0];
     normalView.style.display = 'block';
     editView.style.display = 'none';
 }
 
 
 function submitEdit(ele) {
     var userEle = ele.parentNode.parentNode;
     var nameInput = userEle.getElementsByClassName('name-edit-input')[0];
     var rateInput = document.getElementsByClassName('name-edit-input')[1];
     var ratepriceInput = document.getElementsByClassName('name-edit-input')[2];
     var tradevolInput = document.getElementsByClassName('name-edit-input')[3];
     var stockcode = ele.getAttribute('data-stock-id');
     var data = {
        observer: {
            StockCode: nameInput.value,
            Rate: rateInput.value,
            RatePrice: ratepriceInput.value,
            TradeVol: tradevolInput.value,
        },
     };
     Http.Put('/api/observers/update', data)
         .then(() => {
             displayStocks();
         })
 }
 
 
 function deleteObserver(ele) {
     var stockcode = ele.getAttribute('data-stock-id');
     Http.Delete('/api/observers/delete/' + stockcode)
         .then(() => {
             displayStocks();
         })
 }
 
 /******************************************************************************
  *                        Add, Edit, and Delete ObserverStock
  ******************************************************************************/
 
 