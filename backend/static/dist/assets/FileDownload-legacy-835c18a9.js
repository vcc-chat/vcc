/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
System.register(["./index-legacy-213d8ed5.js"],(function(e,t){"use strict";var n,a,o,c,l,i;return{setters:[e=>{n=e.Q,a=e.g,o=e.j,c=e.b,l=e.p,i=e.r}],execute:function(){e("Component",(function(){const{id:e}=n(),t=a(),[r,s]=o(null);return c(r?`Downloading "${r}"`:"Downloading file"),l((()=>{(async()=>{const{name:n,url:a}=await i.file.download(e);s(n);const o=await(await fetch(a)).blob(),c=document.createElement("a");c.download=n,c.href=URL.createObjectURL(o),c.target="_blank",c.click(),1==history.length?t("/"):t(-1)})()}),[]),null}))}}}));
