// Backward-compat shim: if your old index.html referenced app.js, this will load the new script.js
(function(){
  var s=document.createElement('script');
  s.src='./script.js';
  document.head.appendChild(s);
})();