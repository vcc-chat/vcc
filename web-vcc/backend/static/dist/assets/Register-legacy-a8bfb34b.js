/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
System.register(["./index-legacy-213d8ed5.js"],(function(e,s){"use strict";var a,n,l,t,r,c,o,i,d,m,h,u,p,b,N,f;return{setters:[e=>{a=e.Z,n=e.d,l=e.g,t=e.c,r=e.a5,c=e.a,o=e.p,i=e.T,d=e.b,m=e.o,h=e.h,u=e.a0,p=e.a1,b=e.k,N=e.a3,f=e.a4}],execute:function(){e("Component",(function(){a((()=>f((()=>s.import("./Chat-legacy-1e8a2fbb.js")),void 0)));const e=n((e=>e.type)),g=l(),{successAlert:x,errorAlert:v}=t(),y=r(),{t:w}=c(),k=n((e=>e.setToken)),C=n((e=>e.success));o((()=>{e==u.LOGIN_SUCCESS&&g("/")}),[e]);const O=i((function(){g("/login")}),[g]);return o((()=>{N(),(async()=>{void 0!==y&&(y.success?(x(w("The account has been registered successfully. ")),C(),k(y.token),g("/")):v(w("Operation failed. ")))})()}),[y]),d("Register"),m(b,{children:m("div",{className:h("hero min-h-screen bg-base-200",{hidden:e!=u.NOT_LOGIN}),children:m(p,{method:"post",className:"hero-content flex-col lg:flex-row-reverse",children:[m("div",{className:"text-center lg:text-left",children:[m("h1",{className:"text-5xl font-bold",children:w("Register now!")}),m("p",{className:"py-6",children:w("Don't have an account? Register one! You don't need any personal information.")})]}),m("div",{className:"card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100",children:m("div",{className:"card-body",children:[m("div",{className:"form-control",children:[m("label",{className:"label",children:m("span",{className:"label-text",children:w("Username")})}),m("input",{type:"text",placeholder:w("Username")??void 0,className:"input input-bordered",name:"username"})]}),m("div",{className:"form-control",children:[m("label",{className:"label",children:m("span",{className:"label-text",children:w("Password")})}),m("input",{type:"password",placeholder:w("Password")??void 0,className:"input input-bordered",name:"password"})]}),m("div",{className:"form-control mt-6",children:m("div",{className:"flex w-full btn-group",children:[m("button",{className:"btn btn-ghost",onClick:O,type:"button",children:w("Login")}),m("button",{className:"flex-1 btn btn-primary",type:"submit",children:w("Register")})]})})]})})]})})})}))}}}));
