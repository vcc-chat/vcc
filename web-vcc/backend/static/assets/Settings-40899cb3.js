/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
import{J as l,W as r,g as h,d as b,a as d,b as u,o as t,h as c,O as m}from"./index-057a36d6.js";const v=l(function(){const s=r()[4].pathname.split("/").at(-1),o=h(),e=a=>{o(`../${a!=null?a:"null"}`,{replace:!0,relative:"path"})},i=b(a=>a.chatName),{t:n}=d();return u(`"${i}" Settings`),t("div",{className:"p-8 flex flex-col",children:[t("div",{className:"tabs mb-4",children:[t("a",{className:c("tab tab-bordered",{"tab-active":s=="info"}),onClick:()=>{e("info")},children:n("Basic Information")}),t("a",{className:c("tab tab-bordered",{"tab-active":s=="actions"}),onClick:()=>{e("actions")},children:n("Actions")})]}),s!="null"&&t(m,{})]})});export{v as Component};
