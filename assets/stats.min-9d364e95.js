import{c as P}from"./_commonjsHelpers-28e086c5.js";function _(p,S){for(var f=0;f<S.length;f++){const r=S[f];if(typeof r!="string"&&!Array.isArray(r)){for(const o in r)if(o!=="default"&&!(o in p)){const a=Object.getOwnPropertyDescriptor(r,o);a&&Object.defineProperty(p,o,a.get?a:{enumerable:!0,get:()=>r[o]})}}}return Object.freeze(Object.defineProperty(p,Symbol.toStringTag,{value:"Module"}))}var b={},E={get exports(){return b},set exports(p){b=p}};(function(p,S){(function(f,r){p.exports=r()})(P,function(){var f=function(){function r(n){return i.appendChild(n.dom),n}function o(n){for(var l=0;l<i.children.length;l++)i.children[l].style.display=l===n?"block":"none";a=n}var a=0,i=document.createElement("div");i.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",i.addEventListener("click",function(n){n.preventDefault(),o(++a%i.children.length)},!1);var s=(performance||Date).now(),c=s,e=0,y=r(new f.Panel("FPS","#0ff","#002")),v=r(new f.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var h=r(new f.Panel("MB","#f08","#201"));return o(0),{REVISION:16,dom:i,addPanel:r,showPanel:o,begin:function(){s=(performance||Date).now()},end:function(){e++;var n=(performance||Date).now();if(v.update(n-s,200),n>c+1e3&&(y.update(1e3*e/(n-c),100),c=n,e=0,h)){var l=performance.memory;h.update(l.usedJSHeapSize/1048576,l.jsHeapSizeLimit/1048576)}return n},update:function(){s=this.end()},domElement:i,setMode:o}};return f.Panel=function(r,o,a){var i=1/0,s=0,c=Math.round,e=c(window.devicePixelRatio||1),y=80*e,v=48*e,h=3*e,n=2*e,l=3*e,d=15*e,u=74*e,m=30*e,g=document.createElement("canvas");g.width=y,g.height=v,g.style.cssText="width:80px;height:48px";var t=g.getContext("2d");return t.font="bold "+9*e+"px Helvetica,Arial,sans-serif",t.textBaseline="top",t.fillStyle=a,t.fillRect(0,0,y,v),t.fillStyle=o,t.fillText(r,h,n),t.fillRect(l,d,u,m),t.fillStyle=a,t.globalAlpha=.9,t.fillRect(l,d,u,m),{dom:g,update:function(x,w){i=Math.min(i,x),s=Math.max(s,x),t.fillStyle=a,t.globalAlpha=1,t.fillRect(0,0,y,d),t.fillStyle=o,t.fillText(c(x)+" "+r+" ("+c(i)+"-"+c(s)+")",h,n),t.drawImage(g,l+e,d,u-e,m,l,d,u-e,m),t.fillRect(l+u-e,d,e,m),t.fillStyle=a,t.globalAlpha=.9,t.fillRect(l+u-e,d,e,c((1-x/w)*m))}}},f})})(E);const R=b,j=_({__proto__:null,default:R},[b]);export{j as s};
