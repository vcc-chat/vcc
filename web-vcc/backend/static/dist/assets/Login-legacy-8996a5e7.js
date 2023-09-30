/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
System.register(["./index-legacy-213d8ed5.js"],(function(e,n){"use strict";var t,a,s,l,r,o,c,i,d,m,u,h,p,b,N,f,g,x;return{setters:[e=>{t=e.Z,a=e.d,s=e.g,l=e.$,r=e.c,o=e.a,c=e.p,i=e.T,d=e.b,m=e.o,u=e.h,h=e.a0,p=e.a1,b=e.a2,N=e.k,f=e.a3,g=e.r,x=e.a4}],execute:function(){e("Component",(function(){t((()=>x((()=>n.import("./Chat-legacy-1e8a2fbb.js")),void 0)));const e=a((e=>e.username)),v=a((e=>e.changeUsername)),w=s(),y=l(),{errorAlert:k}=r(),C=a((e=>e.success)),L=a((e=>e.failed)),S=a((e=>e.startGet)),T=a((e=>e.type)),G=a((e=>e.setToken)),{t:I}=o();c((()=>{void 0!==y&&(y.success?(C(),G(y.token),w("/")):(k(I("Operation failed")),L()))}),[y]),c((()=>{T==h.LOGIN_SUCCESS&&w("/")}),[T]);const O=i((async()=>{f();const{url:e,requestID:n}=await g.oauth.request();window.open(e,"_blank","noopener,noreferrer,popup");const{username:t,token:a}=await g.oauth.login(n);G(a),v(t),C(),w("/")}),[]);return d("Login"),m(N,{children:m("div",{className:u("hero min-h-screen bg-base-200",{hidden:T!=h.NOT_LOGIN}),children:m(p,{method:"post",className:"hero-content flex-col lg:flex-row-reverse",onSubmit:()=>{S()},children:[m("div",{className:"text-center lg:text-left",children:[m("h1",{className:"text-5xl font-bold",children:I("Login now!")}),m("p",{className:"py-6",children:I("To send messages, you need to login first.")})]}),m("div",{className:"card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100",children:m("div",{className:"card-body p-7",children:[m("div",{className:"form-control",children:[m("label",{className:"label",children:m("span",{className:"label-text",children:I("Username")})}),m("input",{type:"text",placeholder:I("Username")??void 0,className:"input input-bordered",name:"username",value:e,onInput:e=>{v(e.currentTarget.value)}})]}),m("div",{className:"form-control",children:[m("label",{className:"label",children:m("span",{className:"label-text",children:I("Password")})}),m("input",{type:"password",placeholder:I("Password")??void 0,className:"input input-bordered",name:"password"})]}),m("div",{className:"form-control mt-6 flex space-y-2",children:[m("div",{className:"flex w-full btn-group",children:[m("button",{className:"btn btn-ghost",onClick:()=>{w("/register")},type:"button",children:I("Register")}),m("button",{className:"flex-1 btn btn-primary",type:"submit",children:I("Login")})]}),m("button",{className:"btn",onClick:O,type:"button",children:I("Continue with Github")})]}),m(b,{})]})})]})})})}))}}}));