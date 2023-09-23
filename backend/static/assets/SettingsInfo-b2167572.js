/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
import{J as c,d as s,a as l,X as r,o as t,L as m,k as d}from"./index-057a36d6.js";const g=c(function(){const i=s(a=>a.chat),o=s(a=>a.chatName),{t:e}=l(),{inviteLink:n}=r();return t(d,{children:[t("div",{className:"mb-2 text-lg",children:[e("Name"),": ",o]}),t("div",{className:"mb-2 text-lg",children:["ID: ",i]}),n!=null&&t("div",{className:"mb-2 text-lg",children:[e("Invite Link"),": ",t(m,{className:"link break-all",to:n,children:[location.origin,n]})]})]})});export{g as Component};
