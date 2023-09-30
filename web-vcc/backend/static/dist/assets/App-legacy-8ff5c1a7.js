/**
 * The frontend part of web-vcc
 * @copyright The vcc group
 * @license AGPL-3.0-or-later
 */
System.register(["./index-legacy-213d8ed5.js"],(function(e,t){"use strict";var n,r,o,a,i,l;return{setters:[e=>{n=e.j,r=e.F,o=e.d,a=e.Q,i=e.p,l=e.o}],execute:function(){/*! @license DOMPurify 2.4.5 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/2.4.5/LICENSE */function t(e){return t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},t(e)}function c(e,t){return c=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},c(e,t)}function s(e,t,n){return s=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}()?Reflect.construct:function(e,t,n){var r=[null];r.push.apply(r,t);var o=new(Function.bind.apply(e,r));return n&&c(o,n.prototype),o},s.apply(null,arguments)}function u(e){return function(e){if(Array.isArray(e))return m(e)}(e)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||function(e,t){if(e){if("string"==typeof e)return m(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?m(e,t):void 0}}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function m(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}e("Component",(function(){const[e,t]=n(null),c=r((()=>e?ie.sanitize("<wbr>"+e,{ADD_TAGS:["style"]}):""),[e]),s=o((e=>e.appHook)),{name:u}=a();return i((()=>{null!==s&&(async()=>{t((await s(u))?.html??null)})()}),[s,u]),l(ce,{html:c})}));var f=Object.hasOwnProperty,p=Object.setPrototypeOf,d=Object.isFrozen,h=Object.getPrototypeOf,g=Object.getOwnPropertyDescriptor,y=Object.freeze,b=Object.seal,T=Object.create,v="undefined"!=typeof Reflect&&Reflect,N=v.apply,A=v.construct;N||(N=function(e,t,n){return e.apply(t,n)}),y||(y=function(e){return e}),b||(b=function(e){return e}),A||(A=function(e,t){return s(e,u(t))});var E,w=I(Array.prototype.forEach),S=I(Array.prototype.pop),_=I(Array.prototype.push),x=I(String.prototype.toLowerCase),k=I(String.prototype.toString),L=I(String.prototype.match),O=I(String.prototype.replace),C=I(String.prototype.indexOf),D=I(String.prototype.trim),M=I(RegExp.prototype.test),R=(E=TypeError,function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return A(E,t)});function I(e){return function(t){for(var n=arguments.length,r=new Array(n>1?n-1:0),o=1;o<n;o++)r[o-1]=arguments[o];return N(e,t,r)}}function F(e,t,n){n=n||x,p&&p(e,null);for(var r=t.length;r--;){var o=t[r];if("string"==typeof o){var a=n(o);a!==o&&(d(t)||(t[r]=a),o=a)}e[o]=!0}return e}function H(e){var t,n=T(null);for(t in e)!0===N(f,e,[t])&&(n[t]=e[t]);return n}function U(e,t){for(;null!==e;){var n=g(e,t);if(n){if(n.get)return I(n.get);if("function"==typeof n.value)return I(n.value)}e=h(e)}return function(e){return console.warn("fallback value for",e),null}}var z=y(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","section","select","shadow","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),j=y(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","filter","font","g","glyph","glyphref","hkern","image","line","lineargradient","marker","mask","metadata","mpath","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),P=y(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),B=y(["animate","color-profile","cursor","discard","fedropshadow","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),G=y(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover"]),W=y(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),q=y(["#text"]),Y=y(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","face","for","headers","height","hidden","high","href","hreflang","id","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","pattern","placeholder","playsinline","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","xmlns","slot"]),$=y(["accent-height","accumulate","additive","alignment-baseline","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),K=y(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),V=y(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),X=b(/\{\{[\w\W]*|[\w\W]*\}\}/gm),Z=b(/<%[\w\W]*|[\w\W]*%>/gm),Q=b(/\${[\w\W]*}/gm),J=b(/^data-[\-\w.\u00B7-\uFFFF]/),ee=b(/^aria-[\-\w]+$/),te=b(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),ne=b(/^(?:\w+script|data):/i),re=b(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),oe=b(/^html$/i),ae=function(){return"undefined"==typeof window?null:window},ie=function e(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:ae(),r=function(t){return e(t)};if(r.version="2.4.5",r.removed=[],!n||!n.document||9!==n.document.nodeType)return r.isSupported=!1,r;var o=n.document,a=n.document,i=n.DocumentFragment,l=n.HTMLTemplateElement,c=n.Node,s=n.Element,m=n.NodeFilter,f=n.NamedNodeMap,p=void 0===f?n.NamedNodeMap||n.MozNamedAttrMap:f,d=n.HTMLFormElement,h=n.DOMParser,g=n.trustedTypes,b=s.prototype,T=U(b,"cloneNode"),v=U(b,"nextSibling"),N=U(b,"childNodes"),A=U(b,"parentNode");if("function"==typeof l){var E=a.createElement("template");E.content&&E.content.ownerDocument&&(a=E.content.ownerDocument)}var I=function(e,n){if("object"!==t(e)||"function"!=typeof e.createPolicy)return null;var r=null,o="data-tt-policy-suffix";n.currentScript&&n.currentScript.hasAttribute(o)&&(r=n.currentScript.getAttribute(o));var a="dompurify"+(r?"#"+r:"");try{return e.createPolicy(a,{createHTML:function(e){return e},createScriptURL:function(e){return e}})}catch(i){return console.warn("TrustedTypes policy "+a+" could not be created."),null}}(g,o),ie=I?I.createHTML(""):"",le=a,ce=le.implementation,se=le.createNodeIterator,ue=le.createDocumentFragment,me=le.getElementsByTagName,fe=o.importNode,pe={};try{pe=H(a).documentMode?a.documentMode:{}}catch(kt){}var de={};r.isSupported="function"==typeof A&&ce&&void 0!==ce.createHTMLDocument&&9!==pe;var he,ge,ye=X,be=Z,Te=Q,ve=J,Ne=ee,Ae=ne,Ee=re,we=te,Se=null,_e=F({},[].concat(u(z),u(j),u(P),u(G),u(q))),xe=null,ke=F({},[].concat(u(Y),u($),u(K),u(V))),Le=Object.seal(Object.create(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Oe=null,Ce=null,De=!0,Me=!0,Re=!1,Ie=!0,Fe=!1,He=!1,Ue=!1,ze=!1,je=!1,Pe=!1,Be=!1,Ge=!0,We=!1,qe=!0,Ye=!1,$e={},Ke=null,Ve=F({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]),Xe=null,Ze=F({},["audio","video","img","source","image","track"]),Qe=null,Je=F({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),et="http://www.w3.org/1998/Math/MathML",tt="http://www.w3.org/2000/svg",nt="http://www.w3.org/1999/xhtml",rt=nt,ot=!1,at=null,it=F({},[et,tt,nt],k),lt=["application/xhtml+xml","text/html"],ct=null,st=a.createElement("form"),ut=function(e){return e instanceof RegExp||e instanceof Function},mt=function(e){ct&&ct===e||(e&&"object"===t(e)||(e={}),e=H(e),he=he=-1===lt.indexOf(e.PARSER_MEDIA_TYPE)?"text/html":e.PARSER_MEDIA_TYPE,ge="application/xhtml+xml"===he?k:x,Se="ALLOWED_TAGS"in e?F({},e.ALLOWED_TAGS,ge):_e,xe="ALLOWED_ATTR"in e?F({},e.ALLOWED_ATTR,ge):ke,at="ALLOWED_NAMESPACES"in e?F({},e.ALLOWED_NAMESPACES,k):it,Qe="ADD_URI_SAFE_ATTR"in e?F(H(Je),e.ADD_URI_SAFE_ATTR,ge):Je,Xe="ADD_DATA_URI_TAGS"in e?F(H(Ze),e.ADD_DATA_URI_TAGS,ge):Ze,Ke="FORBID_CONTENTS"in e?F({},e.FORBID_CONTENTS,ge):Ve,Oe="FORBID_TAGS"in e?F({},e.FORBID_TAGS,ge):{},Ce="FORBID_ATTR"in e?F({},e.FORBID_ATTR,ge):{},$e="USE_PROFILES"in e&&e.USE_PROFILES,De=!1!==e.ALLOW_ARIA_ATTR,Me=!1!==e.ALLOW_DATA_ATTR,Re=e.ALLOW_UNKNOWN_PROTOCOLS||!1,Ie=!1!==e.ALLOW_SELF_CLOSE_IN_ATTR,Fe=e.SAFE_FOR_TEMPLATES||!1,He=e.WHOLE_DOCUMENT||!1,je=e.RETURN_DOM||!1,Pe=e.RETURN_DOM_FRAGMENT||!1,Be=e.RETURN_TRUSTED_TYPE||!1,ze=e.FORCE_BODY||!1,Ge=!1!==e.SANITIZE_DOM,We=e.SANITIZE_NAMED_PROPS||!1,qe=!1!==e.KEEP_CONTENT,Ye=e.IN_PLACE||!1,we=e.ALLOWED_URI_REGEXP||we,rt=e.NAMESPACE||nt,Le=e.CUSTOM_ELEMENT_HANDLING||{},e.CUSTOM_ELEMENT_HANDLING&&ut(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(Le.tagNameCheck=e.CUSTOM_ELEMENT_HANDLING.tagNameCheck),e.CUSTOM_ELEMENT_HANDLING&&ut(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(Le.attributeNameCheck=e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),e.CUSTOM_ELEMENT_HANDLING&&"boolean"==typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements&&(Le.allowCustomizedBuiltInElements=e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Fe&&(Me=!1),Pe&&(je=!0),$e&&(Se=F({},u(q)),xe=[],!0===$e.html&&(F(Se,z),F(xe,Y)),!0===$e.svg&&(F(Se,j),F(xe,$),F(xe,V)),!0===$e.svgFilters&&(F(Se,P),F(xe,$),F(xe,V)),!0===$e.mathMl&&(F(Se,G),F(xe,K),F(xe,V))),e.ADD_TAGS&&(Se===_e&&(Se=H(Se)),F(Se,e.ADD_TAGS,ge)),e.ADD_ATTR&&(xe===ke&&(xe=H(xe)),F(xe,e.ADD_ATTR,ge)),e.ADD_URI_SAFE_ATTR&&F(Qe,e.ADD_URI_SAFE_ATTR,ge),e.FORBID_CONTENTS&&(Ke===Ve&&(Ke=H(Ke)),F(Ke,e.FORBID_CONTENTS,ge)),qe&&(Se["#text"]=!0),He&&F(Se,["html","head","body"]),Se.table&&(F(Se,["tbody"]),delete Oe.tbody),y&&y(e),ct=e)},ft=F({},["mi","mo","mn","ms","mtext"]),pt=F({},["foreignobject","desc","title","annotation-xml"]),dt=F({},["title","style","font","a","script"]),ht=F({},j);F(ht,P),F(ht,B);var gt=F({},G);F(gt,W);var yt=function(e){_(r.removed,{element:e});try{e.parentNode.removeChild(e)}catch(kt){try{e.outerHTML=ie}catch(kt){e.remove()}}},bt=function(e,t){try{_(r.removed,{attribute:t.getAttributeNode(e),from:t})}catch(kt){_(r.removed,{attribute:null,from:t})}if(t.removeAttribute(e),"is"===e&&!xe[e])if(je||Pe)try{yt(t)}catch(kt){}else try{t.setAttribute(e,"")}catch(kt){}},Tt=function(e){var t,n;if(ze)e="<remove></remove>"+e;else{var r=L(e,/^[\r\n\t ]+/);n=r&&r[0]}"application/xhtml+xml"===he&&rt===nt&&(e='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+e+"</body></html>");var o=I?I.createHTML(e):e;if(rt===nt)try{t=(new h).parseFromString(o,he)}catch(kt){}if(!t||!t.documentElement){t=ce.createDocument(rt,"template",null);try{t.documentElement.innerHTML=ot?ie:o}catch(kt){}}var i=t.body||t.documentElement;return e&&n&&i.insertBefore(a.createTextNode(n),i.childNodes[0]||null),rt===nt?me.call(t,He?"html":"body")[0]:He?t.documentElement:i},vt=function(e){return se.call(e.ownerDocument||e,e,m.SHOW_ELEMENT|m.SHOW_COMMENT|m.SHOW_TEXT,null,!1)},Nt=function(e){return"object"===t(c)?e instanceof c:e&&"object"===t(e)&&"number"==typeof e.nodeType&&"string"==typeof e.nodeName},At=function(e,t,n){de[e]&&w(de[e],(function(e){e.call(r,t,n,ct)}))},Et=function(e){var t,n;if(At("beforeSanitizeElements",e,null),(n=e)instanceof d&&("string"!=typeof n.nodeName||"string"!=typeof n.textContent||"function"!=typeof n.removeChild||!(n.attributes instanceof p)||"function"!=typeof n.removeAttribute||"function"!=typeof n.setAttribute||"string"!=typeof n.namespaceURI||"function"!=typeof n.insertBefore||"function"!=typeof n.hasChildNodes))return yt(e),!0;if(M(/[\u0080-\uFFFF]/,e.nodeName))return yt(e),!0;var o=ge(e.nodeName);if(At("uponSanitizeElement",e,{tagName:o,allowedTags:Se}),e.hasChildNodes()&&!Nt(e.firstElementChild)&&(!Nt(e.content)||!Nt(e.content.firstElementChild))&&M(/<[/\w]/g,e.innerHTML)&&M(/<[/\w]/g,e.textContent))return yt(e),!0;if("select"===o&&M(/<template/i,e.innerHTML))return yt(e),!0;if(!Se[o]||Oe[o]){if(!Oe[o]&&St(o)){if(Le.tagNameCheck instanceof RegExp&&M(Le.tagNameCheck,o))return!1;if(Le.tagNameCheck instanceof Function&&Le.tagNameCheck(o))return!1}if(qe&&!Ke[o]){var a=A(e)||e.parentNode,i=N(e)||e.childNodes;if(i&&a)for(var l=i.length-1;l>=0;--l)a.insertBefore(T(i[l],!0),v(e))}return yt(e),!0}return e instanceof s&&!function(e){var t=A(e);t&&t.tagName||(t={namespaceURI:rt,tagName:"template"});var n=x(e.tagName),r=x(t.tagName);return!!at[e.namespaceURI]&&(e.namespaceURI===tt?t.namespaceURI===nt?"svg"===n:t.namespaceURI===et?"svg"===n&&("annotation-xml"===r||ft[r]):Boolean(ht[n]):e.namespaceURI===et?t.namespaceURI===nt?"math"===n:t.namespaceURI===tt?"math"===n&&pt[r]:Boolean(gt[n]):e.namespaceURI===nt?!(t.namespaceURI===tt&&!pt[r])&&!(t.namespaceURI===et&&!ft[r])&&!gt[n]&&(dt[n]||!ht[n]):!("application/xhtml+xml"!==he||!at[e.namespaceURI]))}(e)?(yt(e),!0):"noscript"!==o&&"noembed"!==o||!M(/<\/no(script|embed)/i,e.innerHTML)?(Fe&&3===e.nodeType&&(t=e.textContent,t=O(t,ye," "),t=O(t,be," "),t=O(t,Te," "),e.textContent!==t&&(_(r.removed,{element:e.cloneNode()}),e.textContent=t)),At("afterSanitizeElements",e,null),!1):(yt(e),!0)},wt=function(e,t,n){if(Ge&&("id"===t||"name"===t)&&(n in a||n in st))return!1;if(Me&&!Ce[t]&&M(ve,t));else if(De&&M(Ne,t));else if(!xe[t]||Ce[t]){if(!(St(e)&&(Le.tagNameCheck instanceof RegExp&&M(Le.tagNameCheck,e)||Le.tagNameCheck instanceof Function&&Le.tagNameCheck(e))&&(Le.attributeNameCheck instanceof RegExp&&M(Le.attributeNameCheck,t)||Le.attributeNameCheck instanceof Function&&Le.attributeNameCheck(t))||"is"===t&&Le.allowCustomizedBuiltInElements&&(Le.tagNameCheck instanceof RegExp&&M(Le.tagNameCheck,n)||Le.tagNameCheck instanceof Function&&Le.tagNameCheck(n))))return!1}else if(Qe[t]);else if(M(we,O(n,Ee,"")));else if("src"!==t&&"xlink:href"!==t&&"href"!==t||"script"===e||0!==C(n,"data:")||!Xe[e])if(Re&&!M(Ae,O(n,Ee,"")));else if(n)return!1;return!0},St=function(e){return e.indexOf("-")>0},_t=function(e){var n,o,a,i;At("beforeSanitizeAttributes",e,null);var l=e.attributes;if(l){var c={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:xe};for(i=l.length;i--;){var s=n=l[i],u=s.name,m=s.namespaceURI;if(o="value"===u?n.value:D(n.value),a=ge(u),c.attrName=a,c.attrValue=o,c.keepAttr=!0,c.forceKeepAttr=void 0,At("uponSanitizeAttribute",e,c),o=c.attrValue,!c.forceKeepAttr&&(bt(u,e),c.keepAttr))if(Ie||!M(/\/>/i,o)){Fe&&(o=O(o,ye," "),o=O(o,be," "),o=O(o,Te," "));var f=ge(e.nodeName);if(wt(f,a,o)){if(!We||"id"!==a&&"name"!==a||(bt(u,e),o="user-content-"+o),I&&"object"===t(g)&&"function"==typeof g.getAttributeType)if(m);else switch(g.getAttributeType(f,a)){case"TrustedHTML":o=I.createHTML(o);break;case"TrustedScriptURL":o=I.createScriptURL(o)}try{m?e.setAttributeNS(m,u,o):e.setAttribute(u,o),S(r.removed)}catch(kt){}}}else bt(u,e)}At("afterSanitizeAttributes",e,null)}},xt=function e(t){var n,r=vt(t);for(At("beforeSanitizeShadowDOM",t,null);n=r.nextNode();)At("uponSanitizeShadowNode",n,null),Et(n)||(n.content instanceof i&&e(n.content),_t(n));At("afterSanitizeShadowDOM",t,null)};return r.sanitize=function(e){var a,l,s,u,m,f=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if((ot=!e)&&(e="\x3c!--\x3e"),"string"!=typeof e&&!Nt(e)){if("function"!=typeof e.toString)throw R("toString is not a function");if("string"!=typeof(e=e.toString()))throw R("dirty is not a string, aborting")}if(!r.isSupported){if("object"===t(n.toStaticHTML)||"function"==typeof n.toStaticHTML){if("string"==typeof e)return n.toStaticHTML(e);if(Nt(e))return n.toStaticHTML(e.outerHTML)}return e}if(Ue||mt(f),r.removed=[],"string"==typeof e&&(Ye=!1),Ye){if(e.nodeName){var p=ge(e.nodeName);if(!Se[p]||Oe[p])throw R("root node is forbidden and cannot be sanitized in-place")}}else if(e instanceof c)1===(l=(a=Tt("\x3c!----\x3e")).ownerDocument.importNode(e,!0)).nodeType&&"BODY"===l.nodeName||"HTML"===l.nodeName?a=l:a.appendChild(l);else{if(!je&&!Fe&&!He&&-1===e.indexOf("<"))return I&&Be?I.createHTML(e):e;if(!(a=Tt(e)))return je?null:Be?ie:""}a&&ze&&yt(a.firstChild);for(var d=vt(Ye?e:a);s=d.nextNode();)3===s.nodeType&&s===u||Et(s)||(s.content instanceof i&&xt(s.content),_t(s),u=s);if(u=null,Ye)return e;if(je){if(Pe)for(m=ue.call(a.ownerDocument);a.firstChild;)m.appendChild(a.firstChild);else m=a;return(xe.shadowroot||xe.shadowrootmod)&&(m=fe.call(o,m,!0)),m}var h=He?a.outerHTML:a.innerHTML;return He&&Se["!doctype"]&&a.ownerDocument&&a.ownerDocument.doctype&&a.ownerDocument.doctype.name&&M(oe,a.ownerDocument.doctype.name)&&(h="<!DOCTYPE "+a.ownerDocument.doctype.name+">\n"+h),Fe&&(h=O(h,ye," "),h=O(h,be," "),h=O(h,Te," ")),I&&Be?I.createHTML(h):h},r.setConfig=function(e){mt(e),Ue=!0},r.clearConfig=function(){ct=null,Ue=!1},r.isValidAttribute=function(e,t,n){ct||mt({});var r=ge(e),o=ge(t);return wt(r,o,n)},r.addHook=function(e,t){"function"==typeof t&&(de[e]=de[e]||[],_(de[e],t))},r.removeHook=function(e){if(de[e])return S(de[e])},r.removeHooks=function(e){de[e]&&(de[e]=[])},r.removeAllHooks=function(){de={}},r}();console.log(ie);class le extends HTMLElement{connectedCallback(){this.attachShadow({mode:"open"}).innerHTML=this.getAttribute("html")}static get observedAttributes(){return["html"]}attributeChangedCallback(e,t,n){this.shadowRoot&&(this.shadowRoot.innerHTML=n)}}customElements.define("app-container",le);const ce="app-container"}}}));
