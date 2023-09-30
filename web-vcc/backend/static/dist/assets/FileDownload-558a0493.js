/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
import{Q as c,g as r,j as m,b as u,p as d,r as f}from"./index-057a36d6.js";function w(){const{id:o}=c(),t=r(),[a,l]=m(null);return u(a?`Downloading "${a}"`:"Downloading file"),d(()=>{(async()=>{const{name:n,url:s}=await f.file.download(o);l(n);const i=await(await fetch(s)).blob(),e=document.createElement("a");e.download=n,e.href=URL.createObjectURL(i),e.target="_blank",e.click(),history.length==1?t("/"):t(-1)})()},[]),null}export{w as Component};
