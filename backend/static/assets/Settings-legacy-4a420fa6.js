/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
System.register(["./index-legacy-213d8ed5.js"],(function(e,t){"use strict";var a,n,c,i,s,l,r,o,d;return{setters:[e=>{a=e.J,n=e.W,c=e.g,i=e.d,s=e.a,l=e.b,r=e.o,o=e.h,d=e.O}],execute:function(){e("Component",a((function(){const e=n()[4].pathname.split("/").at(-1),t=c(),a=e=>{t(`../${e??"null"}`,{replace:!0,relative:"path"})},b=i((e=>e.chatName)),{t:m}=s();return l(`"${b}" Settings`),r("div",{className:"p-8 flex flex-col",children:[r("div",{className:"tabs mb-4",children:[r("a",{className:o("tab tab-bordered",{"tab-active":"info"==e}),onClick:()=>{a("info")},children:m("Basic Information")}),r("a",{className:o("tab tab-bordered",{"tab-active":"actions"==e}),onClick:()=>{a("actions")},children:m("Actions")})]}),"null"!=e&&r(d,{})]})})))}}}));
