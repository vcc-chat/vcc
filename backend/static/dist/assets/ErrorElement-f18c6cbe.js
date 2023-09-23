/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
import{u as o,a as n,p as c,i,b as l,o as e,L as m}from"./index-057a36d6.js";function h({content:t}){const r=o(),{t:a}=n();c(()=>{console.error(r)});const s=i(r)?`${r.status} ${r.data}`:t;return l(s),e("div",{className:"hero min-h-screen bg-base-200",children:e("div",{className:"hero-content text-center",children:e("div",{className:"max-w-md",children:[e("h1",{className:"text-5xl font-bold",children:s}),e(m,{className:"btn btn-primary mt-4",to:"/",children:a("Go back to home")})]})})})}export{h as default};
