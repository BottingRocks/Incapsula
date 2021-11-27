

# Incapsula
- [Incapsula](#incapsula)
  - [About](#about)
    - [Modes](#modes)
    - [Javascript](#javascript)
  - [Non-Captcha Mode](#non-captcha-mode)
    - [The __utmvc__ Cookie](#the-utmvc-cookie)
      - [Data](#data)
      - [Fingerprints](#fingerprints)
    - [The __reese84__ cookie](#the-reese84-cookie)
      - [Encoding Loops](#encoding-loops)
- [HOW TO RUN](#how-to-run)

## About

Incapsula is the antibot from Imperva. It consists of two modes, the captcha non-invasive mode and the captcha mode. The former is the easiest to pass while the latter is not shy of issuing more bans. 

### Modes

There are two modes in Incapsula, the captcha mode and the non-captcha mode. For the most part, both modes have almost the same requests and cookies like  both have the same `reese84` cookie. However, the captcha mode requires a Recaptcha V2 solved token, and a different

### Javascript

The files served by Incapsula are inherently dynamic, in part because they morphed their encoding functions to make a slight variant of the previous one, so each reload produces a different encoding function. This is evident in the encoding function used for the `reese84` payload and the encoding function used to encode the `___utmvc` cookie. 

## Non-Captcha Mode

The Non-Captcha mode consists of a flow of requests that generate a set of cookies a long the way, and **2** that must be set manually.

Those **2** cookies are :

* `___utmvc` : This is the first cookie that will be required to go forward.
* `reese84` : This cookie is really heavy on fingerprints that get sent in a POST request with the token later being set as a cookie value.


### The __utmvc__ Cookie

The `___utmvc` cookie is the first cookie that must be set manually. It must be noted that on a valid `___utmvc` cookie the server will return
a new value for the `___utmvc` cookie which will be set to `a`. 


#### Data

The contents of the `___utmvc` contains fingerprint data such as properties from the `window`, `navigator` and various other properties found on normal browsers and automation frameworks. It is a string with 3 properties:

* `digest` : The output of the key
* `seed` : The seed in hexadecimal format


The final value is then turned into a `Base64` string in the format: `${payload}digest=${digest}s=${seed}`


#### Fingerprints

The default `fingerprints` can be found at : [utmvc.js](incapsula/payloads/utmvc.js)

```js
 {
  "navigator" : true,
  "navigator.vendor" : `Google Inc.`,
  "navigator.appName" : `Netscape`,
  "navigator.plugins.length==0" : false,
  "navigator.platform" : `Linux x86_64`,
  "navigator.webdriver" : false,
  "plugin_ext" : `no plugins`,
  "ActiveXObject" : false,
  "webkitURL" : true,
  "_phantom" : false,
  "callPhantom" : false,
  "chrome" : true,
  "yandex" : false,
  "opera" : false,
  "opr" : false,
  "safari" : false,
  "awesomium" : false,
  "puffinDevice" : false,
  "__nightmare" : false,
  "domAutomation" : false,
  "domAutomationController" : false,
  "_Selenium_IDE_Recorder" : false,
  "document.__webdriver_script_fn" : false,
  "document.$cdc_asdjflasutopfhvcZLmcfl_" : false,
  "process.version" : false,
  "global.require" : false,
  "global.process" : false,
  "WebAssembly" : true,
  "require('fs')" : false,
  "globalThis==global" : `cannot evaluate`,
  "window.toString()" : `[object Window]`,
  "navigator.cpuClass" : false,
  "navigator.oscpu" : false,
  "navigator.connection" : true,
  "navigator.language=='C'" : `false`,
  "Object.keys(window).length" : `9163`,
  "window.outerWidth==0" : `false`,
  "window.outerHeight==0" : `false`,
  "window.WebGLRenderingContext" : true,
  "window.constructor.toString()" : `function Window() { [native code] }`,
  "Boolean(typeof process !== 'undefined' && process.versions && process.versions.node)" : `false`,
  "document.documentMode" : `undefined`,
  "eval.toString().length" : `33`,
  "navigator.connection.rtt" : `0`,
  "deviceType" : `desktop`,
  "screen.width" : `1920`,
  "screen.height" : `1080`,
  "eoapi" : false,
  "eoapi_VerifyThis" : false,
  "eoapi_extInvoke" : false,
  "eoWebBrowserDispatcher" : false,
  "window.HIDDEN_CLASS" : false,
  "navigator.mimeTypes.length==2" : `true`,
  "navigator.plugins.length==2" : `false`,
  "window.globalThis" : true,
  "navigator.userAgentData.brands[0].brand" : `Chromium`,
  "navigator.userAgentData.brands[1].brand" : `Google Chrome`,
  "navigator.userAgentData.brands[2].brand" : `;Not A Brand`,
  "navigator.plugins['Microsoft Edge PDF Plugin']" : false,
}
``` 

Each key-value is encoded using the `encodeURIComponent` function and then joining all key-values via a comma, to form one long string
containing the payload.



> *If* the server does not return an `a` as a new cookie value for `___utmvc` then the session will not be valid which will prevent the user from
> going forward.


A succesful `___utmvc` cookie will yield a header response from the server 

`Set-Cookie : ___utmvc=a`



### The __reese84__ cookie

This cookie is particularly heavy in fingerprints that are encoded using a simple [xorshift128](https://en.wikipedia.org/wiki/Xorshift) algorithm. On top of that, each key-value pair in the `reese84` payload is encoded using a series of _For_ and _While_ loops that shuffle, copy, clone, or re-arrange the bytes in a dynamic order.

#### Encoding Loops
```js
//Example of the loops that encode reese84 payload

var ul = window.JSON.stringify(os, function (tb, YZ) {
  return YZ === undefined ? null : YZ;
});
var xY = ul.replace(yv, BP);
var Oa = [];
var yu = 0;

while (yu < xY.length) {
  Oa.push(xY.charCodeAt(yu));
  yu += 1;
}

var Xm = Oa;
var q9 = Xm;
var Un = [];

for (var EN in q9) {
  var Nz = q9[EN];

  if (q9.hasOwnProperty(EN)) {
    Un.push(Nz);
  }
}

var gZ = Un;
var gH = gZ;
var bG = gH.length;
var T2 = 0;

while (T2 + 1 < bG) {
  var mD = gH[T2];
  gH[T2] = gH[T2 + 1];
  gH[T2 + 1] = mD;
  T2 += 2;
}

var gF = gH;
var xq = gF.length;
var Xv = Lx["slice"](0, 22).length;
var lN = [];
var tV = 0;

while (tV < xq) {
  lN.push(gF[tV]);
  lN.push(Lx["slice"](0, 22)[tV % Xv]);
  tV += 1;
}

var EJ = lN;
var fZ = [];

for (var iF in EJ) {
  var hs = EJ[iF];

  if (EJ.hasOwnProperty(iF)) {
    fZ.push(hs);
  }
}

var WD = fZ;
var LD = WD;
var aG = LD.length;
var r4 = 0;

while (r4 + 1 < aG) {
  var XP = LD[r4];
  LD[r4] = LD[r4 + 1];
  LD[r4 + 1] = XP;
  r4 += 2;
}

var fA = LD;
var IF = [];

for (var Ly in fA) {
  var Uz = fA[Ly];

  if (fA.hasOwnProperty(Ly)) {
    var fj = window.String.fromCharCode(Uz);
    IF.push(fj);
  }
}

var th = window.btoa(IF.join(""));

```


It is imperative that each loop is parsed out as the sequence of where each loop is found is essential

Some of these loops can be found inside

xorShift128

Unlike the first cookie, the `___utmvc`cookie, the `reese84` cookie is not set by the user but by the server after the submission of the `reese84` payload containing the heavy fingerprints. 




# HOW TO RUN
NODE_TLS_REJECT_UNAUTHORIZED='0' SAVE_ASTS=$(pwd)/ node --trace-warnings --insecure-http-parser tests/testIncapsulaSessionCaptcha.js
