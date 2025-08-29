// Updated frontend script: tries to POST orders to server, fallback to localStorage
const MENU = [];
const PRODUCTS = [];
// For multi-page package these arrays are filled by the included script.js from previous package if present.
// Utilities (local)
function getCart(){ return JSON.parse(localStorage.getItem('calm_cart')||'[]'); }
function saveCart(c){ localStorage.setItem('calm_cart', JSON.stringify(c)); }
function getOrders(){ return JSON.parse(localStorage.getItem('calm_orders')||'[]'); }
function saveOrders(o){ localStorage.setItem('calm_orders', JSON.stringify(o)); }
function renderCartMini(){ const container=document.getElementById('mini-cart'); if(!container) return; const cart=getCart(); if(cart.length===0){container.innerHTML='<div class=\"small\">Cart empty</div>'; return;} let html='<table class=\"table\"><tr><th>Item</th><th>Qty</th><th>Price</th></tr>'; let sum=0; cart.forEach(c=>{ html+='<tr><td>'+c.name+'</td><td>'+c.qty+'</td><td>₹'+(c.price*c.qty)+'</td></tr>'; sum+=c.price*c.qty; }); html+='<tr><td colspan=2><strong>Subtotal</strong></td><td><strong>₹'+sum+'</strong></td></tr></table>'; html+='<div style=\"margin-top:8px;display:flex;gap:8px\"><button class=\"button\" onclick=\"location.href=\\'booking.html\\'\">Checkout</button><button class=\"button ghost\" onclick=\"saveCart([]);renderCartMini();\">Clear Cart</button></div>'; container.innerHTML = html; }

// Place order: try server
async function placeOrderFromForm(formId){ const form=document.getElementById(formId); if(!form){ alert('Form not found'); return; } const fm=new FormData(form); const data={}; for(const [k,v] of fm.entries()) data[k]=v; data.items = getCart(); data.subtotal = data.items.reduce((s,i)=>s+i.price*i.qty,0); if(!data.name || !data.phone){ alert('Please provide name and phone'); return; } // try server
  try{
    const resp = await fetch('/api/orders',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    if(resp.ok){ const json = await resp.json(); const id = json.id; saveCart([]); renderCartMini(); alert('Order saved on server. Opening WhatsApp & PDF receipt.'); const waMsg = encodeURIComponent('Calm Cafe — Booking\\nName: '+data.name+'\\nPhone: '+data.phone+'\\nDate: '+(data.date||'TBD')+' Time: '+(data.time||'TBD')); window.open('https://wa.me/919935479764?text='+waMsg,'_blank'); window.open('/api/orders/'+id+'/pdf','_blank'); return; } else { throw new Error('server error'); }
  }catch(err){
    // fallback to local save + whatsapp
    const orders = getOrders(); data.created = new Date().toISOString(); data.id = 'local-'+(new Date()).toISOString(); orders.push(data); saveOrders(orders); saveCart([]); renderCartMini(); alert('Server not available — order saved locally. WhatsApp will open.'); const waMsg = encodeURIComponent('Calm Cafe — Booking\\nName: '+data.name+'\\nPhone: '+data.phone+'\\nDate: '+(data.date||'TBD')+' Time: '+(data.time||'TBD')); window.open('https://wa.me/919935479764?text='+waMsg,'_blank'); return; }
}

// admin helper: login then fetch orders
async function adminLogin(password){
  try{
    const r = await fetch('/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password}) });
    if(r.ok) return true;
    return false;
  }catch(e){ return false; }
}

async function fetchOrdersForAdmin(){
  try{
    const r = await fetch('/api/orders');
    if(r.status===401) return { error:'unauth' };
    if(!r.ok) return { error:'server' };
    const data = await r.json(); return { data };
  }catch(e){ return { error:'network' }; }
}

// export CSV (client side)
function exportOrdersCSVClient(orders){
  if(!orders || orders.length===0){ alert('No orders'); return; }
  const rows = ['name,phone,email,date,time,guests,occasion,address,notes,items,subtotal,created'];
  orders.forEach(o=>{ const items=(o.items||[]).map(i=>i.name+' x '+i.qty).join('|'); const fields=[o.name,o.phone,o.email||'',o.date||'',o.time||'',o.guests||'',o.occasion||'',o.address||'',o.notes||'',items,o.subtotal,o.created]; rows.push(fields.map(f=>'\"'+String(f||'').replace(/\"/g,'\"\"')+'\"').join(',')); });
  const blob = new Blob([rows.join('\\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='calm_orders_'+(new Date()).toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', ()=>{ renderCartMini(); });
